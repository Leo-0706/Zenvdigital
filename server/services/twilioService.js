const securityConfig = require('../config/securityConfig');

class TwilioService {
  constructor() {
    this.client = null;
    this.isConfigured = false;
    this.alertHistory = [];

    const { accountSid, authToken, phoneNumber } = securityConfig.twilio;

    if (accountSid && authToken && phoneNumber && !accountSid.startsWith('ACXXXX')) {
      try {
        const twilio = require('twilio');
        this.client = twilio(accountSid, authToken);
        this.isConfigured = true;
        console.log('[TWILIO] Production Twilio client initialized successfully.');
      } catch (err) {
        console.error('[TWILIO] Failed to initialize Twilio client:', err.message);
      }
    } else {
      console.log('[TWILIO] Credentials not fully configured. Running in secure simulated/audit logging mode.');
    }
  }

  /**
   * Send critical intrusion alert SMS to system administrator
   */
  async sendIntrusionAlert({ ip, attempts, usernames, userAgent, blockedUntil }) {
    const adminPhone = securityConfig.twilio.adminAlertPhoneNumber;
    const body = `🚨 [ZENV CRITICAL SECURITY ALERT]\nForced entry detected on Zenv Digital API!\nIP: ${ip}\nAttempts: ${attempts}\nUsernames: ${usernames.join(', ')}\nLockout until: ${blockedUntil}\nAction: IP automatically blacklisted.`;

    const alertRecord = {
      id: `TW-ALERT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'INTRUSION_ALERT',
      recipient: adminPhone || 'NOT_CONFIGURED',
      message: body,
      ip,
      attempts,
      status: this.isConfigured ? 'SENT' : 'SIMULATED'
    };

    this.alertHistory.unshift(alertRecord);
    if (this.alertHistory.length > 200) this.alertHistory.pop();

    if (this.isConfigured && adminPhone) {
      try {
        const res = await this.client.messages.create({
          body,
          from: securityConfig.twilio.phoneNumber,
          to: adminPhone
        });
        alertRecord.sid = res.sid;
        alertRecord.status = 'DISPATCHED';
        console.log(`[TWILIO ALERT] Emergency SMS sent to admin. SID: ${res.sid}`);
        return { success: true, sid: res.sid, simulated: false };
      } catch (err) {
        console.error('[TWILIO ALERT ERROR] Failed to send SMS to admin:', err.message);
        alertRecord.status = 'FAILED';
        alertRecord.error = err.message;
        return { success: false, error: err.message, simulated: false };
      }
    } else {
      console.warn(`[TWILIO SIMULATED DISPATCH] Admin Alert:\n${body}`);
      return { success: true, simulated: true, notice: 'Live SMS simulated. Configure TWILIO_* in .env to dispatch live SMS.' };
    }
  }

  /**
   * Send payment reminder to client
   */
  async sendPaymentReminder({ clientName, clientPhone, invoiceNumber, amount, dueDate, paymentLink }) {
    const body = `Hi ${clientName}, this is a payment reminder from Zenv Digital for Invoice #${invoiceNumber} (₹${Number(amount).toLocaleString('en-IN')}), due on ${dueDate}. View & pay: ${paymentLink || securityConfig.clientUrl + '/portal'}`;
    return this.sendGeneralSms(clientPhone, body, 'PAYMENT_REMINDER');
  }

  /**
   * Send OTP code via SMS to phone
   */
  async sendOtpSms(to, otp, purpose = 'Verification') {
    const body = `Your Zenv Digital ${purpose} OTP code is: ${otp}. Valid for 10 minutes. Do not share this code.`;
    return this.sendGeneralSms(to, body, 'OTP_SMS');
  }

  /**
   * Send auto-approval notice to client
   */
  async sendAutoApprovalNotification({ clientName, clientPhone, videoTitle, projectTitle }) {
    const body = `Hi ${clientName}, your video "${videoTitle}" for "${projectTitle}" has reached its review deadline and has been approved. Check your portal for final deliverables!`;
    return this.sendGeneralSms(clientPhone, body, 'AUTO_APPROVAL_NOTICE');
  }

  /**
   * General SMS Dispatcher
   */
  async sendGeneralSms(to, body, type = 'GENERAL') {
    const cleanTo = to ? to.replace(/[^\d+]/g, '') : '';
    const record = {
      id: `TW-SMS-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      channel: 'SMS',
      recipient: cleanTo,
      message: body,
      status: this.isConfigured ? 'SENT' : 'SIMULATED'
    };

    this.alertHistory.unshift(record);
    if (this.alertHistory.length > 200) this.alertHistory.pop();

    const smsUrl = cleanTo ? `sms:${cleanTo}?body=${encodeURIComponent(body)}` : '';

    if (this.isConfigured && cleanTo) {
      try {
        const res = await this.client.messages.create({
          body,
          from: securityConfig.twilio.phoneNumber,
          to: cleanTo
        });
        record.sid = res.sid;
        record.status = 'DISPATCHED';
        return { success: true, sid: res.sid, simulated: false };
      } catch (err) {
        console.error(`[TWILIO ERROR] SMS to ${cleanTo} failed:`, err.message);
        record.status = 'FAILED';
        record.error = err.message;
        return { success: false, error: err.message, simulated: false };
      }
    } else {
      console.log(`[TWILIO SIMULATED SMS] To: ${cleanTo} | Body: ${body}`);
      return { success: true, simulated: true };
    }
  }

  /**
   * Retrieve notification and alert history
   */
  getAlertHistory() {
    return this.alertHistory;
  }
}

module.exports = new TwilioService();
