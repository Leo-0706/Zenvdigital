const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./sqliteDatabase');
const supabaseService = require('./supabaseService');
const securityConfig = require('../config/securityConfig');
const pushService = require('./pushService');
const path = require('path');
const fs = require('fs');

/**
 * Zenv Digital Enterprise Database Service
 * Automatically dispatches to Cloud Supabase PostgreSQL when SUPABASE_URL & SUPABASE_KEY are provided.
 * Gracefully falls back to persistent local SQLite database engine (data/zenv_digital.sqlite).
 */
class GoogleSheetsService {
  constructor() {
    this.db = db;
    this.supabase = supabaseService;
    this.spreadsheetId = securityConfig.google?.spreadsheetId;
    if (this.supabase.isConfigured()) {
      console.log('[DATABASE] Active Provider: Cloud Supabase PostgreSQL Engine.');
    } else {
      console.log('[DATABASE] Active Provider: Persistent Local SQLite Database Engine.');
    }
  }

  // =========================================================================
  // --- USERS OPERATIONS ---
  // =========================================================================
  async findUserByEmail(email) {
    if (this.supabase.isConfigured()) return this.supabase.findUserByEmail(email);
    if (!email) return null;
    const row = this.db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
    return row || null;
  }

  async findUserByPhone(phone) {
    if (this.supabase.isConfigured()) return this.supabase.findUserByPhone(phone);
    if (!phone) return null;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const users = this.db.prepare('SELECT * FROM users').all();
    return users.find(u => u.phone && u.phone.replace(/[^0-9+]/g, '') === cleanPhone) || null;
  }

  async findUserById(id) {
    if (this.supabase.isConfigured()) return this.supabase.findUserById(id);
    if (!id) return null;
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return row || null;
  }

  async updateUserPassword(email, newPasswordHash) {
    if (this.supabase.isConfigured()) return this.supabase.updateUserPassword(email, newPasswordHash);
    const now = new Date().toISOString();
    const result = this.db.prepare(`
      UPDATE users SET passwordHash = ?, updatedAt = ? WHERE LOWER(email) = LOWER(?)
    `).run(newPasswordHash, now, email.trim());

    if (result.changes === 0) return null;
    return this.findUserByEmail(email);
  }

  async createUser(userData) {
    if (this.supabase.isConfigured()) return this.supabase.createUser(userData);
    const newUser = {
      id: userData.id || `usr-${uuidv4().substring(0, 8)}`,
      email: userData.email.trim(),
      passwordHash: userData.passwordHash,
      role: userData.role || 'CLIENT',
      clientId: userData.clientId || null,
      name: userData.name || '',
      phone: userData.phone || '',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    this.db.prepare(`
      INSERT INTO users (id, email, passwordHash, role, clientId, name, phone, status, createdAt)
      VALUES (@id, @email, @passwordHash, @role, @clientId, @name, @phone, @status, @createdAt)
    `).run(newUser);

    return newUser;
  }

  async findUserByClientId(clientId) {
    if (this.supabase.isConfigured()) return this.supabase.findUserByClientId(clientId);
    if (!clientId) return null;
    const row = this.db.prepare('SELECT * FROM users WHERE clientId = ?').get(clientId);
    return row || null;
  }

  // =========================================================================
  // --- CLIENTS OPERATIONS ---
  // =========================================================================
  async getClients() {
    if (this.supabase.isConfigured()) return this.supabase.getClients();
    const rows = this.db.prepare('SELECT * FROM clients ORDER BY createdAt DESC').all();
    return rows.map(r => this._hydrateClient(r));
  }

  async getClientById(id) {
    if (this.supabase.isConfigured()) return this.supabase.getClientById(id);
    if (!id) return null;
    const row = this.db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    return row ? this._hydrateClient(row) : null;
  }

  _hydrateClient(row) {
    if (!row) return null;
    let consent = { sms: true, whatsapp: true, email: true, grantedAt: row.createdAt, source: 'AGENCY_ONBOARDING' };
    if (row.communicationConsent) {
      try {
        consent = typeof row.communicationConsent === 'object' ? row.communicationConsent : JSON.parse(row.communicationConsent);
      } catch (e) {}
    }
    return {
      ...row,
      communicationConsent: consent
    };
  }

  async createClient(data) {
    if (this.supabase.isConfigured()) return this.supabase.createClient(data);
    const consent = data.communicationConsent || {
      sms: true,
      whatsapp: true,
      email: true,
      grantedAt: new Date().toISOString(),
      source: 'AGENCY_ONBOARDING'
    };

    const newClient = {
      id: data.id || `cli-${uuidv4().substring(0, 8)}`,
      name: data.name,
      company: data.company,
      email: data.email,
      phone: data.phone || '',
      brandKitDriveFolderId: data.brandKitDriveFolderId || `folder_${uuidv4().substring(0, 8)}`,
      adminDriveFolderId: data.adminDriveFolderId || `admin_fld_${uuidv4().substring(0, 8)}`,
      driveEmail: data.driveEmail || data.email,
      communicationConsent: JSON.stringify(consent),
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    this.db.prepare(`
      INSERT INTO clients (
        id, name, company, email, phone, brandKitDriveFolderId, adminDriveFolderId, driveEmail, communicationConsent, status, createdAt
      ) VALUES (
        @id, @name, @company, @email, @phone, @brandKitDriveFolderId, @adminDriveFolderId, @driveEmail, @communicationConsent, @status, @createdAt
      )
    `).run(newClient);

    return this._hydrateClient(newClient);
  }

  async updateClient(id, updates) {
    if (this.supabase.isConfigured()) return this.supabase.updateClient(id, updates);
    const existing = await this.getClientById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const consentStr = typeof merged.communicationConsent === 'object'
      ? JSON.stringify(merged.communicationConsent)
      : merged.communicationConsent;

    this.db.prepare(`
      UPDATE clients SET
        name = ?, company = ?, email = ?, phone = ?, brandKitDriveFolderId = ?, adminDriveFolderId = ?, driveEmail = ?, communicationConsent = ?, status = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      merged.name, merged.company, merged.email, merged.phone || '',
      merged.brandKitDriveFolderId, merged.adminDriveFolderId, merged.driveEmail || merged.email,
      consentStr, merged.status, merged.updatedAt, id
    );

    return this.getClientById(id);
  }

  async hibernateClient(id, hibernate = true) {
    if (this.supabase.isConfigured()) return this.supabase.hibernateClient(id, hibernate);
    const existing = await this.getClientById(id);
    if (!existing) return null;

    const newStatus = hibernate ? 'HIBERNATED' : 'ACTIVE';
    const now = new Date().toISOString();
    const hibernatedAt = hibernate ? now : null;

    this.db.prepare(`
      UPDATE clients SET status = ?, hibernatedAt = ?, updatedAt = ? WHERE id = ?
    `).run(newStatus, hibernatedAt, now, id);

    this.db.prepare(`
      UPDATE users SET status = ?, updatedAt = ? WHERE clientId = ? OR LOWER(email) = LOWER(?)
    `).run(newStatus, now, id, existing.email);

    return this.getClientById(id);
  }

  async deleteClient(id) {
    if (this.supabase.isConfigured()) return this.supabase.deleteClient(id);
    const existing = await this.getClientById(id);
    if (!existing) return null;

    this.db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    this.db.prepare('DELETE FROM users WHERE clientId = ? OR LOWER(email) = LOWER(?)').run(id, existing.email);

    return existing;
  }

  // =========================================================================
  // --- SHOOTS OPERATIONS ---
  // =========================================================================
  async getShoots(clientId = null) {
    if (this.supabase.isConfigured()) return this.supabase.getShoots(clientId);
    if (clientId) {
      return this.db.prepare('SELECT * FROM shoots WHERE clientId = ? ORDER BY date DESC').all(clientId);
    }
    return this.db.prepare('SELECT * FROM shoots ORDER BY date DESC').all();
  }

  async getShootById(id) {
    if (this.supabase.isConfigured()) return this.supabase.getShootById(id);
    if (!id) return null;
    const row = this.db.prepare('SELECT * FROM shoots WHERE id = ?').get(id);
    return row || null;
  }

  async createShoot(data) {
    if (this.supabase.isConfigured()) return this.supabase.createShoot(data);
    const newShoot = {
      id: data.id || `sht-${uuidv4().substring(0, 8)}`,
      clientId: data.clientId,
      title: data.title,
      date: data.date,
      location: data.location || '',
      crew: data.crew || '',
      status: data.status || 'SCHEDULED',
      notes: data.notes || '',
      createdAt: new Date().toISOString()
    };

    this.db.prepare(`
      INSERT INTO shoots (id, clientId, title, date, location, crew, status, notes, createdAt)
      VALUES (@id, @clientId, @title, @date, @location, @crew, @status, @notes, @createdAt)
    `).run(newShoot);

    if (newShoot.clientId) {
      await this.addNotification({
        targetRole: 'CLIENT',
        clientId: newShoot.clientId,
        title: 'Production Shoot Scheduled',
        message: `Shoot "${newShoot.title}" scheduled for ${newShoot.date} at ${newShoot.location || 'Studio'}.`,
        type: 'SHOOT',
        actionTab: 'shoots'
      });
    }

    return newShoot;
  }

  async updateShoot(id, updates) {
    if (this.supabase.isConfigured()) return this.supabase.updateShoot(id, updates);
    const existing = await this.getShootById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.db.prepare(`
      UPDATE shoots SET title = ?, date = ?, location = ?, crew = ?, status = ?, notes = ?, updatedAt = ?
      WHERE id = ?
    `).run(merged.title, merged.date, merged.location, merged.crew, merged.status, merged.notes, merged.updatedAt, id);

    return this.getShootById(id);
  }

  async deleteShoot(id) {
    if (this.supabase.isConfigured()) return this.supabase.deleteShoot(id);
    const existing = await this.getShootById(id);
    if (!existing) return null;

    this.db.prepare('DELETE FROM shoots WHERE id = ?').run(id);
    return existing || true;
  }

  // =========================================================================
  // --- INVOICES OPERATIONS ---
  // =========================================================================
  async getInvoices(clientId = null, role = null) {
    if (this.supabase.isConfigured()) return this.supabase.getInvoices(clientId, role);
    let sql = 'SELECT * FROM invoices';
    const params = [];

    if (clientId) {
      sql += ' WHERE clientId = ?';
      params.push(clientId);
    }

    if (role === 'CLIENT') {
      sql += clientId ? ' AND hiddenForClient = 0' : ' WHERE hiddenForClient = 0';
    }

    sql += ' ORDER BY createdAt DESC';
    const rows = this.db.prepare(sql).all(...params);
    return rows.map(r => ({
      ...r,
      amount: Number(r.amount),
      hiddenForClient: Boolean(r.hiddenForClient)
    }));
  }

  async getInvoiceById(id) {
    if (this.supabase.isConfigured()) return this.supabase.getInvoiceById(id);
    if (!id) return null;
    const row = this.db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    if (!row) return null;
    return {
      ...row,
      amount: Number(row.amount),
      hiddenForClient: Boolean(row.hiddenForClient)
    };
  }

  async deleteInvoice(id, scope = 'for_everyone') {
    if (this.supabase.isConfigured()) return this.supabase.deleteInvoice(id, scope);
    const existing = await this.getInvoiceById(id);
    if (!existing) return null;

    if (scope === 'for_client') {
      const now = new Date().toISOString();
      this.db.prepare('UPDATE invoices SET hiddenForClient = 1, updatedAt = ? WHERE id = ?').run(now, id);
      return { ...existing, hiddenForClient: true, deletedScope: 'for_client' };
    }

    this.db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
    return existing || true;
  }

  async createInvoice(data) {
    if (this.supabase.isConfigured()) return this.supabase.createInvoice(data);
    const newInvoice = {
      id: data.id || `inv-${uuidv4().substring(0, 8)}`,
      clientId: data.clientId,
      invoiceNumber: data.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
      amount: Number(data.amount) || 0,
      currency: data.currency || 'INR',
      description: data.description || 'Commercial video production & editing services',
      status: data.status || 'DRAFT',
      dueDate: data.dueDate,
      issueDate: data.issueDate || new Date().toISOString().split('T')[0],
      hiddenForClient: 0,
      createdAt: new Date().toISOString()
    };

    this.db.prepare(`
      INSERT INTO invoices (
        id, clientId, invoiceNumber, amount, currency, description, status, dueDate, issueDate, hiddenForClient, createdAt
      ) VALUES (
        @id, @clientId, @invoiceNumber, @amount, @currency, @description, @status, @dueDate, @issueDate, @hiddenForClient, @createdAt
      )
    `).run(newInvoice);

    await this.addNotification({
      targetRole: 'CLIENT',
      clientId: newInvoice.clientId,
      title: 'Invoice Issued',
      message: `Invoice #${newInvoice.invoiceNumber} for ₹${newInvoice.amount.toLocaleString('en-IN')} issued. Work: ${newInvoice.description}`,
      type: 'INVOICE',
      actionTab: 'invoices'
    });

    return {
      ...newInvoice,
      hiddenForClient: false
    };
  }

  async updateInvoice(id, updates) {
    if (this.supabase.isConfigured()) return this.supabase.updateInvoice(id, updates);
    const existing = await this.getInvoiceById(id);
    if (!existing) return null;

    const oldStatus = existing.status;
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };

    this.db.prepare(`
      UPDATE invoices SET
        amount = ?, currency = ?, description = ?, status = ?, dueDate = ?, issueDate = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      Number(merged.amount), merged.currency, merged.description, merged.status, merged.dueDate, merged.issueDate || existing.issueDate, merged.updatedAt, id
    );

    if (updates.status === 'PAID' && oldStatus !== 'PAID') {
      const client = await this.getClientById(existing.clientId);
      await this.addNotification({
        targetRole: 'ADMIN',
        clientId: existing.clientId,
        title: 'Invoice Payment Received',
        message: `${client?.company || 'Client'} marked Invoice #${existing.invoiceNumber} (₹${Number(existing.amount).toLocaleString('en-IN')}) as PAID.`,
        type: 'INVOICE',
        actionTab: 'invoices'
      });
    }

    return this.getInvoiceById(id);
  }

  // =========================================================================
  // --- VIDEOS & APPROVALS OPERATIONS ---
  // =========================================================================
  async getVideos(clientId = null, shootId = null, role = null) {
    if (this.supabase.isConfigured()) return this.supabase.getVideos(clientId, shootId, role);
    let sql = 'SELECT * FROM videos';
    const conditions = [];
    const params = [];

    if (clientId) {
      conditions.push('clientId = ?');
      params.push(clientId);
    }
    if (shootId) {
      conditions.push('shootId = ?');
      params.push(shootId);
    }
    if (role === 'ADMIN') {
      conditions.push('hiddenForAdmin = 0');
    } else if (role === 'CLIENT') {
      conditions.push('hiddenForClient = 0');
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY createdAt DESC';

    const rows = this.db.prepare(sql).all(...params);
    return rows.map(r => this._hydrateVideo(r));
  }

  async getVideoById(id) {
    if (this.supabase.isConfigured()) return this.supabase.getVideoById(id);
    if (!id) return null;
    const row = this.db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
    return row ? this._hydrateVideo(row) : null;
  }

  _hydrateVideo(row) {
    if (!row) return null;
    let feedback = [];
    if (row.clientFeedback) {
      try {
        feedback = typeof row.clientFeedback === 'object' ? row.clientFeedback : JSON.parse(row.clientFeedback);
      } catch (e) {
        feedback = [];
      }
    }
    return {
      ...row,
      clientFeedback: feedback,
      hiddenForAdmin: Boolean(row.hiddenForAdmin),
      hiddenForClient: Boolean(row.hiddenForClient)
    };
  }

  async createVideo(data) {
    if (this.supabase.isConfigured()) return this.supabase.createVideo(data);
    const uploadTimestamp = Date.now();
    const reviewHours = Number(data.reviewHours) || 48;
    const approvalDeadline = data.approvalDeadline || new Date(uploadTimestamp + (reviewHours * 3600000)).toISOString();
    const reviewType = data.reviewType || 'Client Review';

    let actualShootId = data.shootId;
    const manualProjectName = data.projectName || data.shootTitle || (typeof data.shootId === 'string' && !data.shootId.startsWith('sht-') ? data.shootId : null);

    if (manualProjectName) {
      const existingShoot = this.db.prepare('SELECT * FROM shoots WHERE id = ? OR LOWER(title) = LOWER(?)').get(data.shootId, manualProjectName);
      if (existingShoot) {
        actualShootId = existingShoot.id;
      } else {
        const autoShoot = {
          id: `sht-${uuidv4().substring(0, 8)}`,
          clientId: data.clientId,
          title: manualProjectName,
          date: new Date().toISOString().split('T')[0],
          location: 'Production Studio / On Location',
          crew: 'Zenv Digital Principal Cinema Team',
          status: 'REVIEW',
          notes: 'Auto-linked from deliverable cut',
          createdAt: new Date().toISOString()
        };
        this.db.prepare(`
          INSERT INTO shoots (id, clientId, title, date, location, crew, status, notes, createdAt)
          VALUES (@id, @clientId, @title, @date, @location, @crew, @status, @notes, @createdAt)
        `).run(autoShoot);
        actualShootId = autoShoot.id;
      }
    }

    const newVideo = {
      id: data.id || `vid-${uuidv4().substring(0, 8)}`,
      shootId: actualShootId,
      projectName: manualProjectName || 'Commercial Project',
      clientId: data.clientId,
      title: data.title,
      driveFileId: data.driveFileId || `drive_file_${uuidv4().substring(0, 8)}`,
      driveStreamUrl: data.driveStreamUrl || '/uploads/videos/sample_hero_cut.mp4',
      version: data.version || 'v1.0',
      reviewType: reviewType,
      reviewHours: reviewHours,
      status: 'PENDING_REVIEW',
      uploadTimestamp: new Date(uploadTimestamp).toISOString(),
      approvalDeadline: approvalDeadline,
      clientFeedback: JSON.stringify([]),
      hiddenForAdmin: 0,
      hiddenForClient: 0,
      createdAt: new Date().toISOString()
    };

    this.db.prepare(`
      INSERT INTO videos (
        id, shootId, projectName, clientId, title, driveFileId, driveStreamUrl, version, reviewType, reviewHours, status, uploadTimestamp, approvalDeadline, clientFeedback, hiddenForAdmin, hiddenForClient, createdAt
      ) VALUES (
        @id, @shootId, @projectName, @clientId, @title, @driveFileId, @driveStreamUrl, @version, @reviewType, @reviewHours, @status, @uploadTimestamp, @approvalDeadline, @clientFeedback, @hiddenForAdmin, @hiddenForClient, @createdAt
      )
    `).run(newVideo);

    await this.addNotification({
      targetRole: 'CLIENT',
      clientId: newVideo.clientId,
      title: 'New Video Cut Ready for Review',
      message: `Cut "${newVideo.title}" (${newVideo.version}) has been uploaded and is ready for review.`,
      type: 'VIDEO',
      actionTab: 'review'
    });

    return this.getVideoById(newVideo.id);
  }

  async updateVideo(id, updates) {
    if (this.supabase.isConfigured()) return this.supabase.updateVideo(id, updates);
    const existing = await this.getVideoById(id);
    if (!existing) return null;

    const oldStatus = existing.status;
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const feedbackStr = typeof merged.clientFeedback === 'object'
      ? JSON.stringify(merged.clientFeedback)
      : merged.clientFeedback;

    this.db.prepare(`
      UPDATE videos SET
        title = ?, version = ?, status = ?, reviewType = ?, reviewHours = ?, approvalDeadline = ?, clientFeedback = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      merged.title, merged.version, merged.status, merged.reviewType,
      merged.reviewHours, merged.approvalDeadline, feedbackStr, merged.updatedAt, id
    );

    if (updates.status === 'APPROVED' && oldStatus !== 'APPROVED') {
      const client = await this.getClientById(existing.clientId);
      await this.addNotification({
        targetRole: 'ADMIN',
        clientId: existing.clientId,
        title: 'Video Cut Approved',
        message: `${client?.company || 'Client'} approved "${existing.title}". Ready for master export & release.`,
        type: 'VIDEO',
        actionTab: 'review'
      });
    }

    return this.getVideoById(id);
  }

  async deleteVideo(id, scope = 'for_everyone') {
    if (this.supabase.isConfigured()) return this.supabase.deleteVideo(id, scope);
    const existing = await this.getVideoById(id);
    if (!existing) return null;
    const now = new Date().toISOString();

    if (scope === 'for_me') {
      this.db.prepare('UPDATE videos SET hiddenForAdmin = 1, updatedAt = ? WHERE id = ?').run(now, id);
      return { ...existing, hiddenForAdmin: true, deletedScope: 'for_me' };
    }

    if (scope === 'for_client') {
      this.db.prepare('UPDATE videos SET hiddenForClient = 1, updatedAt = ? WHERE id = ?').run(now, id);
      return { ...existing, hiddenForClient: true, deletedScope: 'for_client' };
    }

    this.db.prepare('DELETE FROM videos WHERE id = ?').run(id);

    if (existing.driveStreamUrl && existing.driveStreamUrl.startsWith('/uploads/videos/')) {
      const filename = existing.driveStreamUrl.replace('/uploads/videos/', '');
      const filePath = path.join(__dirname, '..', 'uploads', 'videos', filename);
      if (!filename.startsWith('sample_') && fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    return { ...existing, deletedScope: 'for_everyone' };
  }

  async addVideoFeedback(id, feedbackItem) {
    if (this.supabase.isConfigured()) return this.supabase.addVideoFeedback(id, feedbackItem);
    const video = await this.getVideoById(id);
    if (!video) return null;

    const entry = {
      id: `fbk-${uuidv4().substring(0, 8)}`,
      timestamp: new Date().toISOString(),
      author: feedbackItem.author,
      role: feedbackItem.role,
      comment: feedbackItem.comment,
      timecode: feedbackItem.timecode || null
    };

    video.clientFeedback = video.clientFeedback || [];
    video.clientFeedback.push(entry);

    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE videos SET clientFeedback = ?, updatedAt = ? WHERE id = ?
    `).run(JSON.stringify(video.clientFeedback), now, id);

    const client = await this.getClientById(video.clientId);
    await this.addNotification({
      targetRole: 'ADMIN',
      clientId: video.clientId,
      title: 'Client Revision Feedback',
      message: `${feedbackItem.author || client?.company || 'Client'} posted feedback on "${video.title}" at [${feedbackItem.timecode || 'General'}]: "${feedbackItem.comment.substring(0, 80)}"`,
      type: 'FEEDBACK',
      actionTab: 'videos'
    });

    return this.getVideoById(id);
  }

  // =========================================================================
  // --- NOTIFICATIONS OPERATIONS ---
  // =========================================================================
  async getNotifications(targetRole, clientId = null) {
    if (this.supabase.isConfigured()) return this.supabase.getNotifications(targetRole, clientId);
    let sql = 'SELECT * FROM notifications';
    const params = [];

    if (targetRole === 'ADMIN') {
      sql += " WHERE targetRole = 'ADMIN' OR targetRole = 'ALL'";
    } else if (targetRole === 'CLIENT') {
      sql += " WHERE (targetRole = 'CLIENT' OR targetRole = 'ALL')";
      if (clientId) {
        sql += ' AND (clientId IS NULL OR clientId = ?)';
        params.push(clientId);
      }
    }

    sql += ' ORDER BY createdAt DESC LIMIT 100';
    const rows = this.db.prepare(sql).all(...params);
    return rows.map(r => ({ ...r, isRead: Boolean(r.isRead) }));
  }

  async addNotification(data) {
    if (this.supabase.isConfigured()) return this.supabase.addNotification(data);
    const notif = {
      id: data.id || `notif-${uuidv4().substring(0, 8)}`,
      targetRole: data.targetRole || 'ALL',
      clientId: data.clientId || null,
      title: data.title,
      message: data.message,
      type: data.type || 'SYSTEM',
      actionTab: data.actionTab || 'review',
      isRead: 0,
      createdAt: data.createdAt || new Date().toISOString()
    };

    this.db.prepare(`
      INSERT INTO notifications (id, targetRole, clientId, title, message, type, actionTab, isRead, createdAt)
      VALUES (@id, @targetRole, @clientId, @title, @message, @type, @actionTab, @isRead, @createdAt)
    `).run(notif);

    try {
      pushService.sendPushToRole(notif.targetRole, notif.clientId, {
        title: notif.title,
        body: notif.message,
        type: notif.type,
        actionTab: notif.actionTab,
        data: {
          url: notif.targetRole === 'ADMIN' ? `/admin?tab=${notif.actionTab}` : `/portal?tab=${notif.actionTab}`,
          actionTab: notif.actionTab,
          type: notif.type,
          id: notif.id
        }
      }).catch(err => {
        console.warn('[PUSH DISPATCH WARNING]', err.message);
      });
    } catch (e) {
      console.warn('[PUSH DISPATCH ERROR]', e.message);
    }

    return { ...notif, isRead: false };
  }

  async markNotificationsRead(targetRole, clientId = null, notifId = null) {
    if (this.supabase.isConfigured()) return this.supabase.markNotificationsRead(targetRole, clientId, notifId);
    if (notifId) {
      this.db.prepare('UPDATE notifications SET isRead = 1 WHERE id = ?').run(notifId);
      return true;
    }

    if (targetRole === 'ADMIN') {
      this.db.prepare("UPDATE notifications SET isRead = 1 WHERE targetRole = 'ADMIN' OR targetRole = 'ALL'").run();
    } else if (targetRole === 'CLIENT') {
      if (clientId) {
        this.db.prepare("UPDATE notifications SET isRead = 1 WHERE (targetRole = 'CLIENT' OR targetRole = 'ALL') AND (clientId IS NULL OR clientId = ?)").run(clientId);
      } else {
        this.db.prepare("UPDATE notifications SET isRead = 1 WHERE targetRole = 'CLIENT' OR targetRole = 'ALL'").run();
      }
    }
    return true;
  }

  async getUnreadCount(targetRole, clientId = null) {
    if (this.supabase.isConfigured()) return this.supabase.getUnreadCount(targetRole, clientId);
    const notifs = await this.getNotifications(targetRole, clientId);
    return notifs.filter(n => !n.isRead).length;
  }

  // =========================================================================
  // --- AUDIT LOGS ---
  // =========================================================================
  async addAuditLog(entry) {
    if (this.supabase.isConfigured()) return this.supabase.addAuditLog(entry);
    const log = {
      id: `aud-${uuidv4().substring(0, 8)}`,
      timestamp: new Date().toISOString(),
      event: entry.event || 'ACTION',
      ip: entry.ip || '127.0.0.1',
      userId: entry.userId || null,
      severity: entry.severity || 'INFO',
      details: typeof entry.details === 'object' ? JSON.stringify(entry.details) : String(entry.details || '')
    };

    this.db.prepare(`
      INSERT INTO audit_logs (id, timestamp, event, ip, userId, severity, details)
      VALUES (@id, @timestamp, @event, @ip, @userId, @severity, @details)
    `).run(log);

    return log;
  }

  async getAuditLogs(limit = 100) {
    if (this.supabase.isConfigured()) return this.supabase.getAuditLogs(limit);
    return this.db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?').all(limit);
  }

  // =========================================================================
  // --- STUDIO DIRECT CHAT OPERATIONS ---
  // =========================================================================
  async getMessages(clientId = null) {
    if (this.supabase.isConfigured()) return this.supabase.getMessages(clientId);
    if (clientId && clientId !== 'ALL') {
      const rows = this.db.prepare('SELECT * FROM messages WHERE clientId = ? ORDER BY createdAt ASC').all(clientId);
      return rows.map(r => ({
        ...r,
        isReadByAdmin: Boolean(r.isReadByAdmin),
        isReadByClient: Boolean(r.isReadByClient)
      }));
    }
    const rows = this.db.prepare('SELECT * FROM messages ORDER BY createdAt ASC').all();
    return rows.map(r => ({
      ...r,
      isReadByAdmin: Boolean(r.isReadByAdmin),
      isReadByClient: Boolean(r.isReadByClient)
    }));
  }

  async sendMessage(data) {
    if (this.supabase.isConfigured()) return this.supabase.sendMessage(data);
    const newMsg = {
      id: `msg-${uuidv4().substring(0, 8)}`,
      clientId: data.clientId,
      senderId: data.senderId,
      senderRole: data.senderRole,
      senderName: data.senderName,
      text: data.text,
      tag: data.tag || 'GENERAL',
      timecode: data.timecode || null,
      isReadByAdmin: data.senderRole === 'ADMIN' ? 1 : 0,
      isReadByClient: data.senderRole === 'CLIENT' ? 1 : 0,
      createdAt: new Date().toISOString()
    };

    this.db.prepare(`
      INSERT INTO messages (
        id, clientId, senderId, senderRole, senderName, text, tag, timecode, isReadByAdmin, isReadByClient, createdAt
      ) VALUES (
        @id, @clientId, @senderId, @senderRole, @senderName, @text, @tag, @timecode, @isReadByAdmin, @isReadByClient, @createdAt
      )
    `).run(newMsg);

    if (data.senderRole === 'CLIENT') {
      await this.addNotification({
        targetRole: 'ADMIN',
        clientId: data.clientId,
        title: `Message from ${data.senderName}`,
        message: data.text.length > 90 ? data.text.substring(0, 87) + '...' : data.text,
        type: 'CHAT',
        actionTab: 'chat'
      });
    } else {
      await this.addNotification({
        targetRole: 'CLIENT',
        clientId: data.clientId,
        title: 'New Message from Studio Team',
        message: data.text.length > 90 ? data.text.substring(0, 87) + '...' : data.text,
        type: 'CHAT',
        actionTab: 'chat'
      });
    }

    return {
      ...newMsg,
      isReadByAdmin: Boolean(newMsg.isReadByAdmin),
      isReadByClient: Boolean(newMsg.isReadByClient)
    };
  }

  async markMessagesAsRead(clientId, readerRole) {
    if (this.supabase.isConfigured()) return this.supabase.markMessagesAsRead(clientId, readerRole);
    if (readerRole === 'ADMIN') {
      this.db.prepare('UPDATE messages SET isReadByAdmin = 1 WHERE clientId = ?').run(clientId);
    } else {
      this.db.prepare('UPDATE messages SET isReadByClient = 1 WHERE clientId = ?').run(clientId);
    }
    return true;
  }

  async getUnreadChatCount(readerRole, clientId = null) {
    if (this.supabase.isConfigured()) return this.supabase.getUnreadChatCount(readerRole, clientId);
    if (readerRole === 'ADMIN') {
      const row = this.db.prepare('SELECT count(*) as count FROM messages WHERE isReadByAdmin = 0').get();
      return row ? row.count : 0;
    } else {
      const row = this.db.prepare('SELECT count(*) as count FROM messages WHERE clientId = ? AND isReadByClient = 0').get(clientId);
      return row ? row.count : 0;
    }
  }

  // =========================================================================
  // --- RESET & STATUS ---
  // =========================================================================
  async resetToFreshSetup() {
    if (this.supabase.isConfigured()) return this.supabase.resetToFreshSetup();
    this.db.exec(`
      DELETE FROM clients;
      DELETE FROM shoots;
      DELETE FROM invoices;
      DELETE FROM videos;
      DELETE FROM messages;
      DELETE FROM notifications;
      DELETE FROM users WHERE role != 'ADMIN';
    `);

    const adminUser = this.db.prepare("SELECT * FROM users WHERE role = 'ADMIN' LIMIT 1").get();
    await this.addAuditLog({
      event: 'FRESH_SETUP_INITIALIZED',
      ip: '127.0.0.1',
      userId: adminUser?.id || 'usr-admin-1',
      severity: 'INFO',
      details: `Studio workspace reset to pristine fresh production state for admin ${adminUser?.name || 'Bibek Bisal Nayak'} (${adminUser?.email || 'Bibekbisalnayak@gmail.com'}).`
    });

    return {
      success: true,
      message: 'Studio workspace reset to pristine fresh production state.',
      admin: {
        email: adminUser?.email,
        name: adminUser?.name,
        role: adminUser?.role
      }
    };
  }

  getSetupStatus() {
    if (this.supabase.isConfigured()) return this.supabase.getSetupStatus();
    const adminUser = this.db.prepare("SELECT * FROM users WHERE role = 'ADMIN' LIMIT 1").get();
    const totalClients = this.db.prepare('SELECT count(*) as count FROM clients').get().count;
    const totalShoots = this.db.prepare('SELECT count(*) as count FROM shoots').get().count;
    const totalInvoices = this.db.prepare('SELECT count(*) as count FROM invoices').get().count;
    const totalVideos = this.db.prepare('SELECT count(*) as count FROM videos').get().count;

    return {
      isLive: securityConfig.isLive,
      adminEmail: adminUser?.email || 'Bibekbisalnayak@gmail.com',
      adminName: adminUser?.name || 'Bibek Bisal Nayak',
      totalClients,
      totalShoots,
      totalInvoices,
      totalVideos,
      isFresh: totalClients === 0
    };
  }
}

module.exports = new GoogleSheetsService();
