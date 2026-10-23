const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { authenticateJWT, requireRole } = require('../middleware/securityMiddleware');
const googleSheetsService = require('../services/googleSheetsService');
const googleDriveService = require('../services/googleDriveService');
const intrusionService = require('../services/intrusionService');
const twilioService = require('../services/twilioService');
const pushService = require('../services/pushService');
const cronService = require('../services/cronService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(__dirname, '..', 'uploads', 'videos');
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${Date.now()}-${cleanName}`);
  }
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 1024 * 1024 * 1024 } // 1GB
});

// Protect all admin routes with JWT and strictly require ADMIN role
router.use(authenticateJWT, requireRole(['ADMIN']));

/**
 * GET /api/admin/metrics
 * High-level dashboard telemetry and business metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const clients = await googleSheetsService.getClients();
    const shoots = await googleSheetsService.getShoots();
    const invoices = await googleSheetsService.getInvoices();
    const videos = await googleSheetsService.getVideos();
    const blockedIps = intrusionService.getActiveBlocks();

    const pendingApprovals = videos.filter(v => v.status === 'PENDING_REVIEW').length;
    const totalRevenue = invoices
      .filter(i => i.status === 'PAID')
      .reduce((sum, i) => sum + i.amount, 0);
    const outstandingRevenue = invoices
      .filter(i => i.status === 'SENT')
      .reduce((sum, i) => sum + i.amount, 0);

    return res.status(200).json({
      success: true,
      metrics: {
        totalClients: clients.length,
        activeShoots: shoots.filter(s => s.status !== 'COMPLETED').length,
        pendingApprovals,
        totalRevenue,
        outstandingRevenue,
        blockedIpsCount: blockedIps.length
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// CLIENT CRUD OPERATIONS
// ==========================================

router.get('/clients', async (req, res) => {
  try {
    const clients = await googleSheetsService.getClients();
    return res.status(200).json({ success: true, clients });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post(
  '/clients',
  [
    body('name').isString().trim().notEmpty().withMessage('Contact name is required'),
    body('company').isString().trim().notEmpty().withMessage('Company / Brand is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('phone').optional().isString(),
    body('password').optional().isString(),
    body('clientDriveEmail').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array(), message: errors.array()[0].msg });

    try {
      const { name, company, email, phone, password, initialPassword, clientDriveEmail } = req.body;

      // Check if user email already exists
      const existingUser = await googleSheetsService.findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'A client user with this email address already exists.' });
      }

      // 1. Create dedicated Google Drive Workspace folder for this client
      const clientDriveFolder = await googleDriveService.createClientWorkspace(company, email);

      // 2. Create dedicated Central Admin Master Archive folder for this client
      const adminArchiveFolder = await googleDriveService.createClientWorkspace(`${company} - Master Archive`, 'AdminSync');

      // 3. Share client workspace with client's Google Drive email
      const targetDriveEmail = (clientDriveEmail && clientDriveEmail.trim()) || email;
      try {
        await googleDriveService.shareAssetWithClient(clientDriveFolder.folderId, targetDriveEmail, 'writer');
      } catch (shareErr) {
        console.warn('[DRIVE SHARE NOTICE]', shareErr.message);
      }

      // 4. Create Client record in relational sheets
      const newClient = await googleSheetsService.createClient({
        name,
        company,
        email,
        phone,
        brandKitDriveFolderId: clientDriveFolder.folderId,
        adminDriveFolderId: adminArchiveFolder.folderId,
        driveEmail: targetDriveEmail
      });

      // 5. Provision client login user account with specified password
      const rawPassword = password || initialPassword || 'ClientPass2026!';
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(rawPassword, salt);

      const newUser = await googleSheetsService.createUser({
        email,
        passwordHash,
        role: 'CLIENT',
        clientId: newClient.id,
        name,
        phone
      });

      await googleSheetsService.addAuditLog({
        event: 'CLIENT_ACCOUNT_PROVISIONED',
        ip: req.clientIp || req.ip,
        userId: req.user.id,
        severity: 'INFO',
        details: `Admin provisioned client account for "${company}" (${newClient.id}). Login: "${newUser.email}". Client Drive: ${clientDriveFolder.folderId}, Admin Archive: ${adminArchiveFolder.folderId}`
      });

      return res.status(201).json({
        success: true,
        message: `Client account created for ${company}! Login credentials & Google Drive synchronization configured.`,
        client: newClient,
        user: { id: newUser.id, email: newUser.email, assignedPassword: rawPassword },
        clientDriveFolder,
        adminArchiveFolder
      });
    } catch (err) {
      console.error('[ADMIN ERROR] /clients:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

router.post('/clients/:id/reset-password', async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }

  try {
    const client = await googleSheetsService.getClientById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Client profile not found' });

    const user = await googleSheetsService.findUserByClientId(client.id);
    if (!user) return res.status(404).json({ success: false, message: 'Client login user account not found' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await googleSheetsService.updateUserPassword(user.email, passwordHash);

    await googleSheetsService.addAuditLog({
      event: 'CLIENT_PASSWORD_ADMIN_RESET',
      ip: req.clientIp || req.ip,
      userId: req.user.id,
      severity: 'INFO',
      details: `Admin updated password for client user "${user.email}" (${client.company}).`
    });

    return res.status(200).json({
      success: true,
      message: `Password successfully updated for ${client.company} (${user.email}).`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/clients/:id', async (req, res) => {
  try {
    const updated = await googleSheetsService.updateClient(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Client not found' });
    return res.status(200).json({ success: true, client: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/clients/:id/hibernate', async (req, res) => {
  try {
    const client = await googleSheetsService.getClientById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Client profile not found' });

    const shouldHibernate = req.body.hibernate !== undefined
      ? Boolean(req.body.hibernate)
      : client.status !== 'HIBERNATED';

    const updated = await googleSheetsService.hibernateClient(req.params.id, shouldHibernate);

    await googleSheetsService.addAuditLog({
      event: shouldHibernate ? 'CLIENT_HIBERNATED' : 'CLIENT_REACTIVATED',
      ip: req.clientIp || req.ip,
      userId: req.user?.id || 'admin',
      severity: 'INFO',
      details: shouldHibernate
        ? `Client "${client.company}" marked as Work Complete / Hibernated.`
        : `Client "${client.company}" reactivated to Active status.`
    });

    return res.status(200).json({
      success: true,
      message: shouldHibernate
        ? `Client "${client.company}" marked as Work Complete / Hibernated.`
        : `Client "${client.company}" reactivated to Active status.`,
      client: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, message: err.message });
  }
});

router.delete('/clients/:id', async (req, res) => {
  try {
    const client = await googleSheetsService.getClientById(req.params.id);
    if (!client) {
      return res.status(200).json({
        success: true,
        message: 'Client profile has already been removed.',
        alreadyDeleted: true
      });
    }

    const deleted = await googleSheetsService.deleteClient(req.params.id);

    await googleSheetsService.addAuditLog({
      event: 'CLIENT_DELETED',
      ip: req.clientIp || req.ip,
      userId: req.user?.id || 'admin',
      severity: 'WARNING',
      details: `Client profile "${client.company}" (${client.email}) and user login permanently deleted by Admin.`
    });

    return res.status(200).json({
      success: true,
      message: `Client "${client.company}" and associated login account permanently deleted.`,
      client: deleted
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, message: err.message });
  }
});

// ==========================================
// CLIENT DEVICE POPUP / WEB PUSH NOTIFICATIONS
// ==========================================

/**
 * GET /api/admin/clients/device-stats
 * Returns active device push subscription counts for all clients
 */
router.get('/clients/device-stats', async (req, res) => {
  try {
    const stats = pushService.getAllClientsDeviceStats();
    return res.status(200).json({ success: true, stats });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/clients/:id/devices
 * Returns registered devices for a specific client
 */
router.get('/clients/:id/devices', async (req, res) => {
  try {
    const stats = pushService.getClientDeviceStats(req.params.id);
    return res.status(200).json({ success: true, ...stats });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/clients/:id/send-popup
 * Dispatches a native popup / system push alert directly to the client's phone or desktop,
 * which displays on their lock screen & notification panel even if the browser/app is closed.
 */
router.post(
  '/clients/:id/send-popup',
  [
    body('message').trim().notEmpty().withMessage('Popup message text is required.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    try {
      const { id } = req.params;
      const { title, message, actionTab, urgent } = req.body;

      const client = await googleSheetsService.getClientById(id);
      if (!client) {
        return res.status(404).json({ success: false, message: 'Client profile not found.' });
      }

      const popupTitle = (title && title.trim()) || `Alert from Zenv Digital Studio`;
      const targetTab = actionTab || 'review';

      // 1. Dispatch Web Push notification to client's phone status bar
      const pushResult = await pushService.sendPushToRole('CLIENT', client.id, {
        title: popupTitle,
        body: message.trim(),
        type: 'POPUP_ALERT',
        actionTab: targetTab,
        urgent: urgent !== undefined ? Boolean(urgent) : true,
        tag: `zenv-admin-popup-${client.id}-${Date.now()}`
      });

      // 2. Also record in in-app notifications
      const notif = await googleSheetsService.addNotification({
        targetRole: 'CLIENT',
        clientId: client.id,
        title: popupTitle,
        message: message.trim(),
        type: 'POPUP_ALERT',
        actionTab: targetTab
      });

      // 3. Log audit entry
      await googleSheetsService.addAuditLog({
        event: 'CLIENT_DEVICE_POPUP_DISPATCHED',
        ip: req.clientIp || req.ip,
        userId: req.user?.id || 'admin',
        severity: 'INFO',
        details: `Admin dispatched phone popup message to "${client.company}". Title: "${popupTitle}". Delivered: ${pushResult.sent} device(s).`
      });

      const hasRegisteredDevices = pushResult.sent > 0 || (pushService.getClientDeviceStats(client.id).count > 0);

      return res.status(200).json({
        success: true,
        message: pushResult.sent > 0
          ? `Popup alert successfully delivered to ${pushResult.sent} of ${client.company}'s active device(s)!`
          : `Popup alert queued & sent! Note: ${client.company} has not enabled browser/phone notifications yet; the alert will pop up on their screen as soon as they enable notifications.`,
        deliveredCount: pushResult.sent,
        failedCount: pushResult.failed,
        hasRegisteredDevices,
        notification: notif,
        client: {
          id: client.id,
          company: client.company,
          name: client.name,
          email: client.email
        }
      });
    } catch (err) {
      console.error('[ADMIN POPUP ROUTE ERROR]:', err);
      return res.status(500).json({
        success: false,
        error: err.message,
        message: 'Internal server error while sending popup alert to client device.'
      });
    }
  }
);

// ==========================================
// SHOOT SCHEDULING OPERATIONS
// ==========================================

router.get('/shoots', async (req, res) => {
  try {
    const shoots = await googleSheetsService.getShoots();
    const clients = await googleSheetsService.getClients();
    const clientMap = new Map(clients.map(c => [c.id, c]));

    const enrichedShoots = shoots.map(s => ({
      ...s,
      client: clientMap.get(s.clientId) || null
    }));

    return res.status(200).json({ success: true, shoots: enrichedShoots });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post(
  '/shoots',
  [
    body('clientId').notEmpty().withMessage('Client ID is required'),
    body('title').isString().notEmpty().withMessage('Shoot title required'),
    body('date').isISO8601().withMessage('Valid date required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { clientId, title, date, location, crew, notes, status } = req.body;
      const client = await googleSheetsService.getClientById(clientId);
      if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

      // Generate Shoot media folder on Google Drive
      const driveFolder = await googleDriveService.createShootMediaFolder(
        client.brandKitDriveFolderId,
        title
      );

      const newShoot = await googleSheetsService.createShoot({
        clientId,
        title,
        date,
        location,
        crew,
        notes: notes ? `${notes} | Drive Media: ${driveFolder.webViewLink}` : `Drive Media: ${driveFolder.webViewLink}`,
        status: status || 'SCHEDULED'
      });

      await googleSheetsService.addAuditLog({
        event: 'SHOOT_SCHEDULED',
        ip: req.clientIp || req.ip,
        userId: req.user.id,
        severity: 'INFO',
        details: `Shoot "${title}" scheduled for client ${client.name} on ${date}.`
      });

      return res.status(201).json({ success: true, shoot: newShoot, driveFolder });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

router.put('/shoots/:id', async (req, res) => {
  try {
    const existing = await googleSheetsService.getShootById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Shoot not found' });

    const updated = await googleSheetsService.updateShoot(req.params.id, req.body);
    await googleSheetsService.addAuditLog({
      event: 'SHOOT_UPDATED',
      ip: req.clientIp || req.ip,
      userId: req.user?.id || 'admin',
      severity: 'INFO',
      details: `Shoot "${updated.title}" (ID: ${updated.id}) updated. Status: ${updated.status || 'SCHEDULED'}.`
    });

    return res.status(200).json({ success: true, shoot: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, message: err.message });
  }
});

router.delete('/shoots/:id', async (req, res) => {
  try {
    const shoot = await googleSheetsService.getShootById(req.params.id);
    if (!shoot) {
      return res.status(200).json({
        success: true,
        message: 'Shoot schedule has already been removed.',
        alreadyDeleted: true
      });
    }

    const deleted = await googleSheetsService.deleteShoot(req.params.id);
    await googleSheetsService.addAuditLog({
      event: 'SHOOT_DELETED',
      ip: req.clientIp || req.ip,
      userId: req.user?.id || 'admin',
      severity: 'WARNING',
      details: `Shoot "${shoot.title}" (ID: ${shoot.id}) deleted by Admin.`
    });

    return res.status(200).json({
      success: true,
      message: `Shoot "${shoot.title}" was successfully deleted.`,
      shoot: deleted
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, message: err.message });
  }
});

// ==========================================
// INVOICE TRACKING OPERATIONS
// ==========================================

router.get('/invoices', async (req, res) => {
  try {
    const invoices = await googleSheetsService.getInvoices();
    const clients = await googleSheetsService.getClients();
    const clientMap = new Map(clients.map(c => [c.id, c]));

    const enrichedInvoices = invoices.map(i => ({
      ...i,
      client: clientMap.get(i.clientId) || null
    }));

    return res.status(200).json({ success: true, invoices: enrichedInvoices });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post(
  '/invoices',
  [
    body('clientId').notEmpty().withMessage('Client ID required'),
    body('amount').isNumeric().withMessage('Amount must be numeric'),
    body('dueDate').isISO8601().withMessage('Due date required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { clientId, amount, currency, dueDate, status, invoiceNumber, description } = req.body;
      const client = await googleSheetsService.getClientById(clientId);
      if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

      const newInvoice = await googleSheetsService.createInvoice({
        clientId,
        amount: Number(amount),
        currency: currency || 'INR',
        description: description || 'Commercial video production & master deliverables',
        dueDate,
        status: status || 'SENT',
        invoiceNumber
      });

      // Dispatch SMS notification if invoice is sent
      if (newInvoice.status === 'SENT' && client.phone) {
        await twilioService.sendPaymentReminder({
          clientName: client.name,
          clientPhone: client.phone,
          invoiceNumber: newInvoice.invoiceNumber,
          amount: newInvoice.amount,
          dueDate: newInvoice.dueDate
        });
      }

      await googleSheetsService.addAuditLog({
        event: 'INVOICE_CREATED',
        ip: req.clientIp || req.ip,
        userId: req.user.id,
        severity: 'INFO',
        details: `Invoice #${newInvoice.invoiceNumber} for ₹${newInvoice.amount.toLocaleString('en-IN')} issued to ${client.name}. Work: ${newInvoice.description}`
      });

      return res.status(201).json({ success: true, invoice: newInvoice });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

router.put('/invoices/:id', async (req, res) => {
  try {
    const updated = await googleSheetsService.updateInvoice(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Invoice not found' });
    return res.status(200).json({ success: true, invoice: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/invoices/:id', async (req, res) => {
  try {
    const invoice = await googleSheetsService.getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const client = await googleSheetsService.getClientById(invoice.clientId);
    const deleted = await googleSheetsService.deleteInvoice(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Invoice not found or already deleted.' });
    }

    await googleSheetsService.addAuditLog({
      event: 'INVOICE_DELETED',
      ip: req.clientIp || req.ip,
      userId: req.user.id,
      severity: 'WARNING',
      details: `Invoice #${invoice.invoiceNumber} for ₹${Number(invoice.amount).toLocaleString('en-IN')} (Client: ${client?.company || invoice.clientId}) permanently deleted by admin.`
    });

    return res.status(200).json({
      success: true,
      message: `Invoice #${invoice.invoiceNumber} permanently deleted.`,
      invoice
    });
  } catch (err) {
    console.error('[ADMIN ROUTE] Error deleting invoice:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error deleting invoice.' });
  }
});

// ==========================================
// VIDEO & APPROVAL WORKFLOW OPERATIONS
// ==========================================

router.get('/videos', async (req, res) => {
  try {
    const { clientId, shootId } = req.query;
    const videos = await googleSheetsService.getVideos(clientId, shootId, 'ADMIN');
    const clients = await googleSheetsService.getClients();
    const shoots = await googleSheetsService.getShoots();
    const clientMap = new Map(clients.map(c => [c.id, c]));
    const shootMap = new Map(shoots.map(s => [s.id, s]));

    const enrichedVideos = videos.map(v => ({
      ...v,
      client: clientMap.get(v.clientId) || null,
      shoot: shootMap.get(v.shootId) || null
    }));

    return res.status(200).json({ success: true, videos: enrichedVideos });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post(
  '/videos',
  videoUpload.single('videoFile'),
  async (req, res) => {
    try {
      const {
        clientId,
        shootId,
        shootProject,
        projectName,
        title,
        version,
        driveStreamUrl,
        reviewType,
        reviewHours
      } = req.body;

      const resolvedShoot = shootProject || projectName || shootId;
      if (!clientId) return res.status(400).json({ success: false, message: 'Client profile ID is required' });
      if (!resolvedShoot) return res.status(400).json({ success: false, message: 'Shoot / Project name is required' });

      let finalStreamUrl = driveStreamUrl;
      let driveFileId = 'drive_simulated_file';

      // If uploaded from local device storage
      if (req.file) {
        finalStreamUrl = `/uploads/videos/${req.file.filename}`;
        driveFileId = req.file.filename;
      } else if (!finalStreamUrl) {
        finalStreamUrl = '/uploads/videos/sample_hero_cut.mp4';
      }

      const videoTitle = title || (req.file ? req.file.originalname.replace(/\.[^/.]+$/, "") : 'Commercial Video Cut');

      const newVideo = await googleSheetsService.createVideo({
        clientId,
        shootId: resolvedShoot,
        projectName: resolvedShoot,
        title: videoTitle,
        version: version || 'v1.0',
        driveStreamUrl: finalStreamUrl,
        driveFileId,
        reviewType: reviewType || 'Client Review',
        reviewHours: reviewHours ? Number(reviewHours) : undefined
      });

      // Dispatch SMS notification if phone is present
      const client = await googleSheetsService.getClientById(clientId);
      if (client && client.phone) {
        await twilioService.sendGeneralSms(
          client.phone,
          `Hi ${client.name}, a new video cut "${newVideo.title}" is ready on your Zenv Digital portal! Review is now open.`
        );
      }

      await googleSheetsService.addAuditLog({
        event: 'VIDEO_CUT_UPLOADED',
        ip: req.clientIp || req.ip,
        userId: req.user.id,
        severity: 'INFO',
        details: `Video "${newVideo.title}" (${newVideo.reviewType}) uploaded. Review deadline: ${newVideo.approvalDeadline}`
      });

      return res.status(201).json({ success: true, video: newVideo });
    } catch (err) {
      console.error('[VIDEO UPLOAD ERROR]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

router.put('/videos/:id', async (req, res) => {
  try {
    const updated = await googleSheetsService.updateVideo(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Video not found' });
    return res.status(200).json({ success: true, video: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/videos/:id', async (req, res) => {
  try {
    const video = await googleSheetsService.getVideoById(req.params.id);
    if (!video) {
      return res.status(200).json({
        success: true,
        message: 'Video deliverable has already been removed.',
        alreadyDeleted: true
      });
    }

    const scope = req.query.scope || req.body?.scope || 'for_everyone';
    const deleted = await googleSheetsService.deleteVideo(req.params.id, scope);

    const isScopeForMe = scope === 'for_me';
    await googleSheetsService.addAuditLog({
      event: isScopeForMe ? 'VIDEO_CUT_HIDDEN_ADMIN' : 'VIDEO_CUT_DELETED_EVERYONE',
      ip: req.clientIp || req.ip,
      userId: req.user?.id || 'admin',
      severity: isScopeForMe ? 'INFO' : 'WARNING',
      details: isScopeForMe
        ? `Video "${video.title}" (ID: ${video.id}) was removed from Admin view (Delete for Me).`
        : `Video "${video.title}" (ID: ${video.id}) was permanently deleted across studio & client (Delete for Everyone).`
    });

    return res.status(200).json({
      success: true,
      scope,
      message: isScopeForMe
        ? `Video cut "${video.title}" removed from your workspace.`
        : `Video cut "${video.title}" permanently deleted for everyone.`,
      video: deleted
    });
  } catch (err) {
    console.error('[DELETE VIDEO ERROR]', err);
    return res.status(500).json({ success: false, error: err.message, message: err.message });
  }
});

// ==========================================
// STUDIO DIRECT CHAT
// ==========================================

router.get('/messages', async (req, res) => {
  try {
    const { clientId } = req.query;
    const messages = await googleSheetsService.getMessages(clientId);
    const unreadCount = await googleSheetsService.getUnreadChatCount('ADMIN');
    return res.status(200).json({ success: true, messages, unreadCount });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post(
  '/messages',
  [
    body('clientId').notEmpty().withMessage('Client ID is required'),
    body('text').notEmpty().withMessage('Message text is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { clientId, text, tag, timecode } = req.body;
      const client = await googleSheetsService.getClientById(clientId);
      if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

      const newMsg = await googleSheetsService.sendMessage({
        clientId,
        senderId: req.user.id,
        senderRole: 'ADMIN',
        senderName: req.user.name || 'Zenv Digital Studio',
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
    const { clientId } = req.body;
    await googleSheetsService.markMessagesAsRead(clientId, 'ADMIN');
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// SECURITY AUDIT & INTRUSION DEFENSE
// ==========================================

router.get('/security/intrusion-logs', (req, res) => {
  return res.status(200).json({
    success: true,
    logs: intrusionService.getIntrusionLogs(),
    activeBlocks: intrusionService.getActiveBlocks()
  });
});

router.post('/security/unblock-ip', [body('ip').isIP()], (req, res) => {
  const { ip } = req.body;
  const unblocked = intrusionService.unblockIp(ip);
  return res.status(200).json({
    success: true,
    message: unblocked ? `IP ${ip} has been unblocked.` : `IP ${ip} was not actively blocked.`
  });
});

router.get('/security/audit-logs', async (req, res) => {
  const logs = await googleSheetsService.getAuditLogs(100);
  return res.status(200).json({ success: true, logs });
});

// ==========================================
// AUTOMATION & CRON CONTROL
// ==========================================

router.post('/automation/trigger-auto-approvals', async (req, res) => {
  const result = await cronService.processVideoAutoApprovals();
  return res.status(200).json({
    success: true,
    message: 'Manual video auto-approval evaluation executed.',
    result
  });
});

router.post('/automation/trigger-payment-reminders', async (req, res) => {
  const result = await cronService.processPaymentReminders();
  return res.status(200).json({
    success: true,
    message: 'Manual payment reminders check executed.',
    result
  });
});

router.get('/automation/twilio-history', (req, res) => {
  return res.status(200).json({
    success: true,
    history: twilioService.getAlertHistory()
  });
});

// ==========================================
// NOTIFICATIONS OPERATIONS
// ==========================================

router.get('/notifications', async (req, res) => {
  try {
    const notifications = await googleSheetsService.getNotifications('ADMIN');
    const unreadCount = notifications.filter(n => !n.isRead).length;
    return res.status(200).json({ success: true, notifications, unreadCount });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/notifications/mark-read', async (req, res) => {
  try {
    const { id } = req.body;
    await googleSheetsService.markNotificationsRead('ADMIN', null, id);
    const notifications = await googleSheetsService.getNotifications('ADMIN');
    const unreadCount = notifications.filter(n => !n.isRead).length;
    return res.status(200).json({ success: true, notifications, unreadCount });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ADMIN FRESH SETUP & SYSTEM STATUS
// ==========================================

router.get('/setup/status', (req, res) => {
  try {
    const status = googleSheetsService.getSetupStatus();
    return res.status(200).json({ success: true, status });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/setup/fresh', async (req, res) => {
  try {
    const result = await googleSheetsService.resetToFreshSetup();
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
