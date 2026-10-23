const cron = require('node-cron');
const googleSheetsService = require('./googleSheetsService');
const twilioService = require('./twilioService');
const securityConfig = require('../config/securityConfig');

class CronService {
  constructor() {
    this.jobs = [];
    this.lastAutoApprovalRun = null;
    this.lastPaymentReminderRun = null;
    this.executionHistory = [];
  }

  /**
   * Initialize and schedule background cron workers
   */
  startAll() {
    console.log('[CRON SERVICE] Initializing scheduled background automation tasks...');

    // 1. Video Auto-Approval Job
    try {
      const autoApprovalJob = cron.schedule(securityConfig.cron.autoApprovalCron, async () => {
        await this.processVideoAutoApprovals();
      });
      this.jobs.push({ name: 'Auto-Approval-Engine', job: autoApprovalJob });
      console.log(`[CRON SERVICE] Auto-Approval Engine scheduled: "${securityConfig.cron.autoApprovalCron}"`);
    } catch (err) {
      console.error('[CRON SERVICE] Failed to schedule Auto-Approval job:', err.message);
    }

    // 2. Invoice Payment Reminder Job
    try {
      const paymentReminderJob = cron.schedule(securityConfig.cron.paymentReminderCron, async () => {
        await this.processPaymentReminders();
      });
      this.jobs.push({ name: 'Payment-Reminder-Engine', job: paymentReminderJob });
      console.log(`[CRON SERVICE] Payment Reminder Engine scheduled: "${securityConfig.cron.paymentReminderCron}"`);
    } catch (err) {
      console.error('[CRON SERVICE] Failed to schedule Payment Reminder job:', err.message);
    }
  }

  /**
   * Process Video Auto-Approvals
   * Evaluates pending videos against their approval deadline
   */
  async processVideoAutoApprovals() {
    const runTimestamp = new Date().toISOString();
    this.lastAutoApprovalRun = runTimestamp;
    console.log(`[CRON: AUTO-APPROVAL] Running review deadline check at ${runTimestamp}...`);

    try {
      const pendingVideos = (await googleSheetsService.getVideos()).filter(
        v => v.status === 'PENDING_REVIEW'
      );

      const now = Date.now();
      const approvedCount = [];

      for (const video of pendingVideos) {
        const deadlineTime = new Date(video.approvalDeadline).getTime();

        if (now >= deadlineTime) {
          // Review deadline reached -> Auto approve video
          await googleSheetsService.updateVideo(video.id, {
            status: 'AUTO_APPROVED',
            autoApprovedAt: runTimestamp
          });

          // Fetch associated client & shoot metadata
          const client = await googleSheetsService.getClientById(video.clientId);
          const shoot = await googleSheetsService.getShootById(video.shootId);

          if (client) {
            await twilioService.sendAutoApprovalNotification({
              clientName: client.name,
              clientPhone: client.phone,
              videoTitle: video.title,
              projectTitle: shoot ? shoot.title : 'Production Project'
            });
          }

          // Write security and compliance audit entry
          await googleSheetsService.addAuditLog({
            event: 'VIDEO_AUTO_APPROVED_DEADLINE',
            ip: 'SYSTEM_CRON',
            userId: 'SYSTEM',
            severity: 'INFO',
            details: `Video "${video.title}" (ID: ${video.id}) auto-approved after reaching scheduled review deadline.`
          });

          approvedCount.push(video.id);
          console.log(`[CRON: AUTO-APPROVAL] Video ${video.id} ("${video.title}") transitioned to AUTO_APPROVED.`);
        }
      }

      this.recordExecution('AUTO_APPROVAL', {
        timestamp: runTimestamp,
        evaluated: pendingVideos.length,
        autoApprovedCount: approvedCount.length,
        approvedIds: approvedCount
      });

      return { evaluated: pendingVideos.length, autoApproved: approvedCount };
    } catch (err) {
      console.error('[CRON: AUTO-APPROVAL ERROR]', err.message);
      return { error: err.message };
    }
  }

  /**
   * Process Payment Reminders for sent/unpaid invoices nearing due date
   */
  async processPaymentReminders() {
    const runTimestamp = new Date().toISOString();
    this.lastPaymentReminderRun = runTimestamp;
    console.log(`[CRON: PAYMENT REMINDERS] Auditing outstanding invoices at ${runTimestamp}...`);

    try {
      const invoices = await googleSheetsService.getInvoices();
      const now = Date.now();
      const twoDaysFromNow = now + (2 * 86400000);
      const remindersSent = [];

      for (const inv of invoices) {
        if (inv.status === 'SENT') {
          const dueTime = new Date(inv.dueDate).getTime();

          // If due within 48 hours or overdue
          if (dueTime <= twoDaysFromNow) {
            const client = await googleSheetsService.getClientById(inv.clientId);
            if (client && client.phone) {
              await twilioService.sendPaymentReminder({
                clientName: client.name,
                clientPhone: client.phone,
                invoiceNumber: inv.invoiceNumber,
                amount: inv.amount,
                dueDate: inv.dueDate,
                paymentLink: `${securityConfig.clientUrl}/portal?invoice=${inv.id}`
              });

              remindersSent.push(inv.id);
            }
          }
        }
      }

      this.recordExecution('PAYMENT_REMINDERS', {
        timestamp: runTimestamp,
        remindersSentCount: remindersSent.length,
        invoiceIds: remindersSent
      });

      return { remindersSent };
    } catch (err) {
      console.error('[CRON: PAYMENT REMINDERS ERROR]', err.message);
      return { error: err.message };
    }
  }

  recordExecution(type, details) {
    this.executionHistory.unshift({
      id: `CRON-EXEC-${Date.now()}`,
      type,
      ...details
    });
    if (this.executionHistory.length > 100) this.executionHistory.pop();
  }

  getStatus() {
    return {
      activeJobs: this.jobs.map(j => j.name),
      lastAutoApprovalRun: this.lastAutoApprovalRun,
      lastPaymentReminderRun: this.lastPaymentReminderRun,
      executionHistory: this.executionHistory.slice(0, 20)
    };
  }

  stopAll() {
    this.jobs.forEach(j => j.job.stop());
    this.jobs = [];
    console.log('[CRON SERVICE] All background cron jobs stopped.');
  }
}

module.exports = new CronService();
