const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateJWT, requireRole, preventIDOR, verifyResourceOwnership } = require('../middleware/securityMiddleware');
const googleSheetsService = require('../services/googleSheetsService');
const googleDriveService = require('../services/googleDriveService');

// All client endpoints require authentication and CLIENT or ADMIN role
router.use(authenticateJWT, requireRole(['CLIENT', 'ADMIN']), preventIDOR);

/**
 * GET /api/client/dashboard
 * Aggregated client portal dashboard overview
 */
router.get('/dashboard', async (req, res) => {
  try {
    const clientId = req.user.clientId;
    if (!clientId) {
      return res.status(400).json({ success: false, message: 'No client profile associated with this account.' });
    }

    const client = await googleSheetsService.getClientById(clientId);
    const shoots = await googleSheetsService.getShoots(clientId);
    const invoices = await googleSheetsService.getInvoices(clientId);
    const videos = await googleSheetsService.getVideos(clientId, null, 'CLIENT');

    const now = Date.now();
    const pendingVideos = videos
      .filter(v => v.status === 'PENDING_REVIEW')
      .map(v => {
        const deadline = new Date(v.approvalDeadline).getTime();
        const diffMs = deadline - now;
        return {
          ...v,
          remainingHours: Math.max(0, Math.floor(diffMs / 3600000)),
          remainingMinutes: Math.max(0, Math.floor((diffMs % 3600000) / 60000)),
          isUrgent: diffMs < 12 * 3600000
        };
      });

    const unpaidInvoices = invoices.filter(i => i.status === 'SENT');

    return res.status(200).json({
      success: true,
      client,
      summary: {
        totalShoots: shoots.length,
        activeShoots: shoots.filter(s => s.status !== 'COMPLETED').length,
        pendingReviewCount: pendingVideos.length,
        unpaidInvoicesCount: unpaidInvoices.length,
        outstandingAmount: unpaidInvoices.reduce((acc, curr) => acc + curr.amount, 0)
      },
      pendingVideos,
      recentShoots: shoots.slice(0, 5)
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/client/videos
 * Reviewable video deliverables with review countdown timers
 */
router.get('/videos', async (req, res) => {
  try {
    const clientId = req.user.clientId;
    const videos = await googleSheetsService.getVideos(clientId, null, 'CLIENT');
    const shoots = await googleSheetsService.getShoots(clientId);
    const shootMap = new Map(shoots.map(s => [s.id, s]));

    const now = Date.now();
    const enriched = videos.map(v => {
      const deadline = new Date(v.approvalDeadline).getTime();
      const diffMs = deadline - now;
      const mediaUrls = googleDriveService.formatMediaUrls(v.driveFileId);

      return {
        ...v,
        shootTitle: shootMap.get(v.shootId)?.title || 'Production Reel',
        mediaUrls,
        remainingHours: Math.max(0, Math.floor(diffMs / 3600000)),
        remainingMinutes: Math.max(0, Math.floor((diffMs % 3600000) / 60000)),
        isDeadlinePassed: diffMs <= 0
      };
    });

    return res.status(200).json({ success: true, videos: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/client/videos/:id/approve
 * Client approves video delivery (IDOR protected)
 */
router.post('/videos/:id/approve', async (req, res) => {
  try {
    const video = await googleSheetsService.getVideoById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

    // IDOR Check
    if (!verifyResourceOwnership(req, video.clientId)) {
      return res.status(403).json({ success: false, error: 'IDOR_VIOLATION', message: 'Forbidden resource access.' });
    }

    const updated = await googleSheetsService.updateVideo(video.id, {
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
      approvedBy: req.user.email
    });

    await googleSheetsService.addAuditLog({
      event: 'CLIENT_VIDEO_APPROVED',
      ip: req.clientIp || req.ip,
      userId: req.user.id,
      severity: 'INFO',
      details: `Video "${video.title}" (ID: ${video.id}) officially approved by client ${req.user.name}.`
    });

    return res.status(200).json({
      success: true,
      message: 'Video approved successfully! Deliverables are now unlocked for final master release.',
      video: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/client/videos/:id/request-revision
 * Client requests edits with timecode feedback (IDOR protected)
 */
router.post(
  '/videos/:id/request-revision',
  [
    body('comment').isString().trim().notEmpty().withMessage('Feedback comment is required'),
    body('timecode').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const video = await googleSheetsService.getVideoById(req.params.id);
      if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

      // IDOR Check
      if (!verifyResourceOwnership(req, video.clientId)) {
        return res.status(403).json({ success: false, error: 'IDOR_VIOLATION', message: 'Forbidden resource access.' });
      }

      // Append revision comment
      const updatedVideo = await googleSheetsService.addVideoFeedback(video.id, {
        author: req.user.name || req.user.email,
        role: 'CLIENT',
        comment: req.body.comment,
        timecode: req.body.timecode || 'General'
      });

      // Update status to REVISION_REQUESTED
      await googleSheetsService.updateVideo(video.id, {
        status: 'REVISION_REQUESTED',
        revisionRequestedAt: new Date().toISOString()
      });

      await googleSheetsService.addAuditLog({
        event: 'CLIENT_REVISION_REQUESTED',
        ip: req.clientIp || req.ip,
        userId: req.user.id,
        severity: 'INFO',
        details: `Revision requested on "${video.title}" by ${req.user.name}. Comment: "${req.body.comment}"`
      });

      return res.status(200).json({
        success: true,
        message: 'Revision notes logged. The post-production team has been dispatched for updates.',
        video: updatedVideo
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/client/shoots
 * Scheduled & historical shoot records (IDOR protected)
 */
router.get('/shoots', async (req, res) => {
  try {
    const shoots = await googleSheetsService.getShoots(req.user.clientId);
    return res.status(200).json({ success: true, shoots });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/client/invoices
 * Invoices and payment statuses (IDOR protected)
 */
router.get('/invoices', async (req, res) => {
  try {
    const invoices = await googleSheetsService.getInvoices(req.user.clientId, 'CLIENT');
    return res.status(200).json({ success: true, invoices });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/client/invoices/:id
 * Remove invoice from client view (IDOR protected)
 */
router.delete('/invoices/:id', async (req, res) => {
  try {
    const invoice = await googleSheetsService.getInvoiceById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    // IDOR Check
    if (!verifyResourceOwnership(req, invoice.clientId)) {
      return res.status(403).json({ success: false, error: 'IDOR_VIOLATION', message: 'Forbidden resource access.' });
    }

    await googleSheetsService.deleteInvoice(invoice.id, 'for_client');

    await googleSheetsService.addAuditLog({
      event: 'INVOICE_CLIENT_REMOVED',
      ip: req.clientIp || req.ip,
      userId: req.user.id,
      severity: 'INFO',
      details: `Invoice #${invoice.invoiceNumber} removed from view by client ${req.user.name}.`
    });

    return res.status(200).json({
      success: true,
      message: `Invoice #${invoice.invoiceNumber} removed from your invoices view.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/client/invoices/:id/pay
 * Simulates secure invoice settlement (IDOR protected)
 */
router.post('/invoices/:id/pay', async (req, res) => {
  try {
    const invoice = await googleSheetsService.getInvoiceById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    // IDOR Check
    if (!verifyResourceOwnership(req, invoice.clientId)) {
      return res.status(403).json({ success: false, error: 'IDOR_VIOLATION', message: 'Forbidden resource access.' });
    }

    const updated = await googleSheetsService.updateInvoice(invoice.id, {
      status: 'PAID',
      paidAt: new Date().toISOString()
    });

    await googleSheetsService.addAuditLog({
      event: 'INVOICE_PAID',
      ip: req.clientIp || req.ip,
      userId: req.user.id,
      severity: 'INFO',
      details: `Invoice #${invoice.invoiceNumber} (₹${Number(invoice.amount).toLocaleString('en-IN')}) paid by ${req.user.name}.`
    });

    return res.status(200).json({
      success: true,
      message: `Invoice #${invoice.invoiceNumber} successfully settled. Thank you for your business!`,
      invoice: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// CLIENT NOTIFICATIONS OPERATIONS
// ==========================================

router.get('/notifications', async (req, res) => {
  try {
    const clientId = req.user.clientId;
    const notifications = await googleSheetsService.getNotifications('CLIENT', clientId);
    const unreadCount = notifications.filter(n => !n.isRead).length;
    return res.status(200).json({ success: true, notifications, unreadCount });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/notifications/mark-read', async (req, res) => {
  try {
    const clientId = req.user.clientId;
    const { id } = req.body;
    await googleSheetsService.markNotificationsRead('CLIENT', clientId, id);
    const notifications = await googleSheetsService.getNotifications('CLIENT', clientId);
    const unreadCount = notifications.filter(n => !n.isRead).length;
    return res.status(200).json({ success: true, notifications, unreadCount });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// CLIENT VIDEO DELETION
// ==========================================

router.delete('/videos/:id', async (req, res) => {
  try {
    const video = await googleSheetsService.getVideoById(req.params.id);
    if (!video) {
      return res.status(200).json({
        success: true,
        message: 'Video cut has already been removed.',
        alreadyDeleted: true
      });
    }
    if (!verifyResourceOwnership(req, video.clientId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized resource access (IDOR blocked)' });
    }

    const scope = req.query.scope || req.body?.scope || 'for_client';
    const deleted = await googleSheetsService.deleteVideo(video.id, scope === 'for_everyone' ? 'for_everyone' : 'for_client');

    await googleSheetsService.addAuditLog({
      event: 'CLIENT_VIDEO_DELETED',
      ip: req.clientIp || req.ip,
      userId: req.user.id,
      severity: 'INFO',
      details: `Video "${video.title}" removed by client ${req.user.name}.`
    });

    return res.status(200).json({
      success: true,
      message: `Video cut "${video.title}" removed from your deliverables.`,
      video: deleted
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, message: err.message });
  }
});

// ==========================================
// CLIENT STUDIO CHAT
// ==========================================

router.get('/messages', async (req, res) => {
  try {
    const clientId = req.user.clientId;
    const messages = await googleSheetsService.getMessages(clientId);
    const unreadCount = await googleSheetsService.getUnreadChatCount('CLIENT', clientId);
    return res.status(200).json({ success: true, messages, unreadCount });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post(
  '/messages',
  [body('text').notEmpty().withMessage('Message text is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const clientId = req.user.clientId;
      const { text, tag, timecode } = req.body;

      const newMsg = await googleSheetsService.sendMessage({
        clientId,
        senderId: req.user.id,
        senderRole: 'CLIENT',
        senderName: req.user.name || 'Client',
        text,
        tag: tag || 'GENERAL',
        timecode: timecode || null
      });

      return res.status(201).json({ success: true, message: newMsg });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

router.post('/messages/read', async (req, res) => {
  try {
    const clientId = req.user.clientId;
    await googleSheetsService.markMessagesAsRead(clientId, 'CLIENT');
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
