const express = require('express');
const router = express.Router();
const { maintenanceManager, authenticateJWT, requireRole } = require('../middleware/securityMiddleware');
const cronService = require('../services/cronService');
const googleAuth = require('../config/googleAuth');

/**
 * GET /api/system/health
 * Public health check and telemetry
 */
router.get('/health', (req, res) => {
  const memory = process.memoryUsage();
  return res.status(200).json({
    status: 'HEALTHY',
    system: 'Zenv Digital Enterprise API',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    maintenanceMode: maintenanceManager.isEnabled(),
    database: {
      provider: googleAuth.isConfigured() ? 'Google Sheets & Drive (Live API)' : 'Relational Memory Cache Engine (Ready for Google API)',
      isLiveConnected: googleAuth.isConfigured()
    },
    cron: cronService.getStatus(),
    memory: {
      rssMb: Math.round(memory.rss / (1024 * 1024)),
      heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
      heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024))
    }
  });
});

/**
 * GET /api/system/maintenance/status
 */
router.get('/maintenance/status', (req, res) => {
  return res.status(200).json({
    maintenanceMode: maintenanceManager.isEnabled()
  });
});

/**
 * POST /api/system/maintenance/toggle
 * Admin-only or secret-authenticated maintenance mode toggle
 */
router.post('/maintenance/toggle', authenticateJWT, requireRole(['ADMIN']), (req, res) => {
  const { enabled } = req.body;
  const newStatus = maintenanceManager.setMode(enabled);

  console.log(`[SYSTEM] Maintenance mode toggled to: ${newStatus} by Admin ${req.user.email}`);

  return res.status(200).json({
    success: true,
    maintenanceMode: newStatus,
    message: `System maintenance mode is now ${newStatus ? 'ENABLED (Service restricted to Admins)' : 'DISABLED (Platform live for all clients)'}`
  });
});

/**
 * GET /api/system/privacy-policy
 * Comprehensive legal & GDPR/CCPA data handling disclosures
 */
router.get('/privacy-policy', (req, res) => {
  return res.status(200).json({
    title: 'Zenv Digital - Privacy Policy & Data Governance',
    effectiveDate: '2026-01-01',
    lastUpdated: '2026-10-21',
    sections: [
      {
        heading: '1. Information We Collect',
        content: 'Zenv Digital collects organizational contact details, project briefs, video production assets, review timestamps, and IP/telemetry data strictly for project delivery, contract compliance, and edge intrusion prevention.'
      },
      {
        heading: '2. Media Storage & Google Cloud Security',
        content: 'Client video assets, raw footage, and brand kits are processed and stored using encrypted Google Cloud Infrastructure (Google Drive API and Google Sheets relational backend). All data transfers are enforced with TLS 1.3 encryption.'
      },
      {
        heading: '3. Intrusion Prevention & Security Telemetry',
        content: 'We log access attempts, IP addresses, and user-agent strings. IPs attempting unauthorized brute-force logins or privilege escalations are automatically flagged, throttled, and permanently recorded in our security audit register.'
      },
      {
        heading: '4. Data Retention & Client Ownership',
        content: 'Production footage is retained for active contract durations plus an archive window of 90 days following project completion. Clients retain proprietary ownership over final delivered renders upon invoice settlement.'
      },
      {
        heading: '5. Rights & Contact',
        content: 'Clients may request data export or erasure in accordance with GDPR and CCPA by contacting privacy@zenvdigital.com.'
      }
    ]
  });
});

/**
 * GET /api/system/terms-conditions
 * Video production contract terms, review deadlines, and IP assignment
 */
router.get('/terms-conditions', (req, res) => {
  return res.status(200).json({
    title: 'Zenv Digital - Master Terms & Production Conditions',
    effectiveDate: '2026-01-01',
    lastUpdated: '2026-10-21',
    sections: [
      {
        heading: '1. Production Scope & Shoot Scheduling',
        content: 'Shoots scheduled through the Zenv Digital portal require confirmed crew lock and equipment reservation. Confirmed call sheets are binding upon client receipt.'
      },
      {
        heading: '2. Review Window & Approval Protocol',
        content: 'To maintain production cadence and delivery milestones, client video drafts delivered to the Client Portal carry an agreed review deadline. If feedback or revision requests are not logged prior to the review deadline, the cut is marked as APPROVED and queued for final color, audio master, and release.'
      },
      {
        heading: '3. Revision Limitations',
        content: 'Standard production agreements include up to two (2) revision rounds per cut. Structural re-edits or script deviations outside initial approved storyboards are billed at standard agency day rates.'
      },
      {
        heading: '4. Intellectual Property & Release',
        content: 'Full copyright in final master renders transfers to the client exclusively upon 100% settlement of all project invoices. Raw b-roll and project project project project project project working files remain proprietary to Zenv Digital unless explicit buy-out rights are contracted.'
      },
      {
        heading: '5. Payment Schedules & Late Penalties',
        content: 'Invoices are net-14 from issue date unless specified otherwise. Invoices unpaid after 30 days incur a 2.5% recurring late penalty per month.'
      }
    ]
  });
});

/**
 * GET /api/system/cookie-preferences
 */
router.get('/cookie-preferences', (req, res) => {
  return res.status(200).json({
    title: 'Zenv Digital - Cookie Policy & Preferences',
    cookies: [
      {
        name: 'zenv_token',
        type: 'Strictly Necessary',
        purpose: 'Maintains encrypted authentication session and RBAC authorization across the platform.',
        duration: '24 Hours',
        required: true
      },
      {
        name: 'zenv_theme',
        type: 'Functional',
        purpose: 'Preserves dark/light dashboard visual styling and UI preferences.',
        duration: '1 Year',
        required: false
      },
      {
        name: 'zenv_telemetry',
        type: 'Security & Analytics',
        purpose: 'Monitors endpoint response times and edge intrusion defense metrics.',
        duration: '30 Days',
        required: true
      }
    ]
  });
});

/**
 * GET /api/system/refund-cancellation
 */
router.get('/refund-cancellation', (req, res) => {
  return res.status(200).json({
    title: 'Zenv Digital - Refund, Rescheduling & Cancellation Policy',
    policies: [
      {
        title: 'Production Retainers & Deposits',
        description: 'Initial 50% project retainers secure crew booking, studio dates, and pre-production engineering. Retainers are strictly non-refundable once pre-production has initiated.'
      },
      {
        title: 'Shoot Rescheduling Windows',
        description: 'Rescheduling a scheduled shoot with more than 72 hours advance notice incurs zero re-booking penalties. Rescheduling under 72 hours requires reimbursement of locked crew day rates and studio rental holds.'
      },
      {
        title: 'Weather & Force Majeure',
        description: 'For outdoor on-location shoots canceled due to adverse weather or act of God, Zenv Digital will reschedule to the nearest available production window with no creative fee penalties; equipment rental transfer fees may apply.'
      },
      {
        title: 'Post-Production Cancellations',
        description: 'If a project is canceled during editing or post-production, billable hours completed to date will be deducted from retainers and remaining unused balances, if any, remitted within 30 days.'
      }
    ]
  });
});

module.exports = router;
