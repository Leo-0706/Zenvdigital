const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const securityConfig = require('../config/securityConfig');
const pushService = require('./pushService');
const path = require('path');
const fs = require('fs');

class SupabaseService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
    this.client = null;

    if (this.supabaseUrl && this.supabaseKey && this.supabaseUrl.startsWith('http')) {
      try {
        this.client = createClient(this.supabaseUrl, this.supabaseKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        });
        console.log(`[SUPABASE] Connected to cloud Supabase project: ${this.supabaseUrl}`);
      } catch (err) {
        console.error('[SUPABASE] Initialization error:', err.message);
        this.client = null;
      }
    } else {
      console.log('[SUPABASE] SUPABASE_URL / SUPABASE_KEY not configured yet. Operating in local SQLite mode.');
    }
  }

  isConfigured() {
    return Boolean(this.client);
  }

  // =========================================================================
  // --- USERS OPERATIONS ---
  // =========================================================================
  async findUserByEmail(email) {
    if (!email) return null;
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .ilike('email', email.trim())
      .maybeSingle();

    if (error) {
      console.warn('[SUPABASE findUserByEmail error]:', error.message);
      return null;
    }
    return data;
  }

  async findUserByPhone(phone) {
    if (!phone) return null;
    const clean = phone.replace(/[^0-9+]/g, '');
    const { data } = await this.client.from('users').select('*');
    if (!data) return null;
    return data.find(u => u.phone && u.phone.replace(/[^0-9+]/g, '') === clean) || null;
  }

  async findUserById(id) {
    if (!id) return null;
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) return null;
    return data;
  }

  async updateUserPassword(email, newPasswordHash) {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from('users')
      .update({ passwordHash: newPasswordHash, updatedAt: now })
      .ilike('email', email.trim())
      .select()
      .maybeSingle();

    if (error) return null;
    return data;
  }

  async createUser(userData) {
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

    const { data, error } = await this.client
      .from('users')
      .insert(newUser)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data || newUser;
  }

  async findUserByClientId(clientId) {
    if (!clientId) return null;
    const { data } = await this.client
      .from('users')
      .select('*')
      .eq('clientId', clientId)
      .maybeSingle();

    return data || null;
  }

  // =========================================================================
  // --- CLIENTS OPERATIONS ---
  // =========================================================================
  async getClients() {
    const { data, error } = await this.client
      .from('clients')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      console.warn('[SUPABASE getClients error]:', error.message);
      return [];
    }
    return (data || []).map(c => this._hydrateClient(c));
  }

  async getClientById(id) {
    if (!id) return null;
    const { data, error } = await this.client
      .from('clients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return this._hydrateClient(data);
  }

  _hydrateClient(row) {
    if (!row) return null;
    let consent = { sms: true, whatsapp: true, email: true, grantedAt: row.createdAt, source: 'AGENCY_ONBOARDING' };
    if (typeof row.communicationConsent === 'object') {
      consent = row.communicationConsent;
    } else if (typeof row.communicationConsent === 'string') {
      try { consent = JSON.parse(row.communicationConsent); } catch (e) {}
    }
    return {
      ...row,
      communicationConsent: consent
    };
  }

  async createClient(data) {
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
      communicationConsent: consent,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    const { data: inserted, error } = await this.client
      .from('clients')
      .insert(newClient)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this._hydrateClient(inserted || newClient);
  }

  async updateClient(id, updates) {
    const existing = await this.getClientById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const { data, error } = await this.client
      .from('clients')
      .update(merged)
      .eq('id', id)
      .select()
      .single();

    if (error) return null;
    return this._hydrateClient(data || merged);
  }

  async hibernateClient(id, hibernate = true) {
    const existing = await this.getClientById(id);
    if (!existing) return null;

    const newStatus = hibernate ? 'HIBERNATED' : 'ACTIVE';
    const now = new Date().toISOString();
    const hibernatedAt = hibernate ? now : null;

    await this.client
      .from('clients')
      .update({ status: newStatus, hibernatedAt, updatedAt: now })
      .eq('id', id);

    await this.client
      .from('users')
      .update({ status: newStatus, updatedAt: now })
      .or(`clientId.eq.${id},email.ilike.${existing.email}`);

    return this.getClientById(id);
  }

  async deleteClient(id) {
    const existing = await this.getClientById(id);
    if (!existing) return null;

    await this.client.from('clients').delete().eq('id', id);
    await this.client.from('users').delete().or(`clientId.eq.${id},email.ilike.${existing.email}`);

    return existing;
  }

  // =========================================================================
  // --- SHOOTS OPERATIONS ---
  // =========================================================================
  async getShoots(clientId = null) {
    let query = this.client.from('shoots').select('*').order('date', { ascending: false });
    if (clientId) {
      query = query.eq('clientId', clientId);
    }
    const { data, error } = await query;
    if (error) return [];
    return data || [];
  }

  async getShootById(id) {
    if (!id) return null;
    const { data } = await this.client.from('shoots').select('*').eq('id', id).maybeSingle();
    return data || null;
  }

  async createShoot(data) {
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

    const { data: inserted, error } = await this.client.from('shoots').insert(newShoot).select().single();
    if (error) throw new Error(error.message);

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

    return inserted || newShoot;
  }

  async updateShoot(id, updates) {
    const existing = await this.getShootById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const { data, error } = await this.client.from('shoots').update(merged).eq('id', id).select().single();
    if (error) return null;
    return data || merged;
  }

  async deleteShoot(id) {
    const existing = await this.getShootById(id);
    if (!existing) return null;

    await this.client.from('shoots').delete().eq('id', id);
    return existing || true;
  }

  // =========================================================================
  // --- INVOICES OPERATIONS ---
  // =========================================================================
  async getInvoices(clientId = null, role = null) {
    let query = this.client.from('invoices').select('*').order('createdAt', { ascending: false });
    if (clientId) {
      query = query.eq('clientId', clientId);
    }
    if (role === 'CLIENT') {
      query = query.eq('hiddenForClient', false);
    }
    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(i => ({
      ...i,
      amount: Number(i.amount),
      hiddenForClient: Boolean(i.hiddenForClient)
    }));
  }

  async getInvoiceById(id) {
    if (!id) return null;
    const { data } = await this.client.from('invoices').select('*').eq('id', id).maybeSingle();
    if (!data) return null;
    return {
      ...data,
      amount: Number(data.amount),
      hiddenForClient: Boolean(data.hiddenForClient)
    };
  }

  async deleteInvoice(id, scope = 'for_everyone') {
    const existing = await this.getInvoiceById(id);
    if (!existing) return null;

    if (scope === 'for_client') {
      const now = new Date().toISOString();
      await this.client.from('invoices').update({ hiddenForClient: true, updatedAt: now }).eq('id', id);
      return { ...existing, hiddenForClient: true, deletedScope: 'for_client' };
    }

    await this.client.from('invoices').delete().eq('id', id);
    return existing || true;
  }

  async createInvoice(data) {
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
      hiddenForClient: false,
      createdAt: new Date().toISOString()
    };

    const { data: inserted, error } = await this.client.from('invoices').insert(newInvoice).select().single();
    if (error) throw new Error(error.message);

    await this.addNotification({
      targetRole: 'CLIENT',
      clientId: newInvoice.clientId,
      title: 'Invoice Issued',
      message: `Invoice #${newInvoice.invoiceNumber} for ₹${newInvoice.amount.toLocaleString('en-IN')} issued. Work: ${newInvoice.description}`,
      type: 'INVOICE',
      actionTab: 'invoices'
    });

    return inserted || newInvoice;
  }

  async updateInvoice(id, updates) {
    const existing = await this.getInvoiceById(id);
    if (!existing) return null;

    const oldStatus = existing.status;
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };

    const { data, error } = await this.client.from('invoices').update(merged).eq('id', id).select().single();
    if (error) return null;

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

    return data || merged;
  }

  // =========================================================================
  // --- VIDEOS & APPROVALS OPERATIONS ---
  // =========================================================================
  async getVideos(clientId = null, shootId = null, role = null) {
    let query = this.client.from('videos').select('*').order('createdAt', { ascending: false });
    if (clientId) query = query.eq('clientId', clientId);
    if (shootId) query = query.eq('shootId', shootId);
    if (role === 'ADMIN') query = query.eq('hiddenForAdmin', false);
    if (role === 'CLIENT') query = query.eq('hiddenForClient', false);

    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(v => this._hydrateVideo(v));
  }

  async getVideoById(id) {
    if (!id) return null;
    const { data } = await this.client.from('videos').select('*').eq('id', id).maybeSingle();
    return data ? this._hydrateVideo(data) : null;
  }

  _hydrateVideo(row) {
    if (!row) return null;
    let feedback = [];
    if (Array.isArray(row.clientFeedback)) {
      feedback = row.clientFeedback;
    } else if (typeof row.clientFeedback === 'string') {
      try { feedback = JSON.parse(row.clientFeedback); } catch (e) {}
    }
    return {
      ...row,
      clientFeedback: feedback,
      hiddenForAdmin: Boolean(row.hiddenForAdmin),
      hiddenForClient: Boolean(row.hiddenForClient)
    };
  }

  async createVideo(data) {
    const uploadTimestamp = Date.now();
    const reviewHours = Number(data.reviewHours) || 48;
    const approvalDeadline = data.approvalDeadline || new Date(uploadTimestamp + (reviewHours * 3600000)).toISOString();
    const reviewType = data.reviewType || 'Client Review';

    let actualShootId = data.shootId;
    const manualProjectName = data.projectName || data.shootTitle || (typeof data.shootId === 'string' && !data.shootId.startsWith('sht-') ? data.shootId : null);

    if (manualProjectName) {
      const existing = await this.client.from('shoots').select('*').or(`id.eq.${data.shootId},title.ilike.${manualProjectName}`).maybeSingle();
      if (existing?.data) {
        actualShootId = existing.data.id;
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
        await this.client.from('shoots').insert(autoShoot);
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
      clientFeedback: [],
      hiddenForAdmin: false,
      hiddenForClient: false,
      createdAt: new Date().toISOString()
    };

    const { data: inserted, error } = await this.client.from('videos').insert(newVideo).select().single();
    if (error) throw new Error(error.message);

    await this.addNotification({
      targetRole: 'CLIENT',
      clientId: newVideo.clientId,
      title: 'New Video Cut Ready for Review',
      message: `Cut "${newVideo.title}" (${newVideo.version}) has been uploaded and is ready for review.`,
      type: 'VIDEO',
      actionTab: 'review'
    });

    return this._hydrateVideo(inserted || newVideo);
  }

  async updateVideo(id, updates) {
    const existing = await this.getVideoById(id);
    if (!existing) return null;

    const oldStatus = existing.status;
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };

    const { data, error } = await this.client.from('videos').update(merged).eq('id', id).select().single();
    if (error) return null;

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

    return this._hydrateVideo(data || merged);
  }

  async deleteVideo(id, scope = 'for_everyone') {
    const existing = await this.getVideoById(id);
    if (!existing) return null;
    const now = new Date().toISOString();

    if (scope === 'for_me') {
      await this.client.from('videos').update({ hiddenForAdmin: true, updatedAt: now }).eq('id', id);
      return { ...existing, hiddenForAdmin: true, deletedScope: 'for_me' };
    }

    if (scope === 'for_client') {
      await this.client.from('videos').update({ hiddenForClient: true, updatedAt: now }).eq('id', id);
      return { ...existing, hiddenForClient: true, deletedScope: 'for_client' };
    }

    await this.client.from('videos').delete().eq('id', id);

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
    await this.client.from('videos').update({ clientFeedback: video.clientFeedback, updatedAt: now }).eq('id', id);

    const client = await this.getClientById(video.clientId);
    await this.addNotification({
      targetRole: 'ADMIN',
      clientId: video.clientId,
      title: 'Client Revision Feedback',
      message: `${feedbackItem.author || client?.company || 'Client'} posted feedback on "${video.title}" at [${feedbackItem.timecode || 'General'}]: "${feedbackItem.comment.substring(0, 80)}"`,
      type: 'FEEDBACK',
      actionTab: 'videos'
    });

    return video;
  }

  // =========================================================================
  // --- NOTIFICATIONS OPERATIONS ---
  // =========================================================================
  async getNotifications(targetRole, clientId = null) {
    let query = this.client.from('notifications').select('*').order('createdAt', { ascending: false }).limit(100);

    if (targetRole === 'ADMIN') {
      query = query.or('targetRole.eq.ADMIN,targetRole.eq.ALL');
    } else if (targetRole === 'CLIENT') {
      query = query.or('targetRole.eq.CLIENT,targetRole.eq.ALL');
      if (clientId) {
        query = query.or(`clientId.is.null,clientId.eq.${clientId}`);
      }
    }

    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(n => ({ ...n, isRead: Boolean(n.isRead) }));
  }

  async addNotification(data) {
    const notif = {
      id: data.id || `notif-${uuidv4().substring(0, 8)}`,
      targetRole: data.targetRole || 'ALL',
      clientId: data.clientId || null,
      title: data.title,
      message: data.message,
      type: data.type || 'SYSTEM',
      actionTab: data.actionTab || 'review',
      isRead: false,
      createdAt: data.createdAt || new Date().toISOString()
    };

    await this.client.from('notifications').insert(notif);

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

    return notif;
  }

  async markNotificationsRead(targetRole, clientId = null, notifId = null) {
    if (notifId) {
      await this.client.from('notifications').update({ isRead: true }).eq('id', notifId);
      return true;
    }

    if (targetRole === 'ADMIN') {
      await this.client.from('notifications').update({ isRead: true }).or('targetRole.eq.ADMIN,targetRole.eq.ALL');
    } else if (targetRole === 'CLIENT') {
      if (clientId) {
        await this.client.from('notifications').update({ isRead: true }).or('targetRole.eq.CLIENT,targetRole.eq.ALL').or(`clientId.is.null,clientId.eq.${clientId}`);
      } else {
        await this.client.from('notifications').update({ isRead: true }).or('targetRole.eq.CLIENT,targetRole.eq.ALL');
      }
    }
    return true;
  }

  async getUnreadCount(targetRole, clientId = null) {
    const notifs = await this.getNotifications(targetRole, clientId);
    return notifs.filter(n => !n.isRead).length;
  }

  // =========================================================================
  // --- AUDIT LOGS ---
  // =========================================================================
  async addAuditLog(entry) {
    const log = {
      id: `aud-${uuidv4().substring(0, 8)}`,
      timestamp: new Date().toISOString(),
      event: entry.event || 'ACTION',
      ip: entry.ip || '127.0.0.1',
      userId: entry.userId || null,
      severity: entry.severity || 'INFO',
      details: typeof entry.details === 'object' ? JSON.stringify(entry.details) : String(entry.details || '')
    };

    await this.client.from('audit_logs').insert(log);
    return log;
  }

  async getAuditLogs(limit = 100) {
    const { data } = await this.client.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(limit);
    return data || [];
  }

  // =========================================================================
  // --- STUDIO DIRECT CHAT OPERATIONS ---
  // =========================================================================
  async getMessages(clientId = null) {
    let query = this.client.from('messages').select('*').order('createdAt', { ascending: true });
    if (clientId && clientId !== 'ALL') {
      query = query.eq('clientId', clientId);
    }
    const { data } = await query;
    return (data || []).map(m => ({
      ...m,
      isReadByAdmin: Boolean(m.isReadByAdmin),
      isReadByClient: Boolean(m.isReadByClient)
    }));
  }

  async sendMessage(data) {
    const newMsg = {
      id: `msg-${uuidv4().substring(0, 8)}`,
      clientId: data.clientId,
      senderId: data.senderId,
      senderRole: data.senderRole,
      senderName: data.senderName,
      text: data.text,
      tag: data.tag || 'GENERAL',
      timecode: data.timecode || null,
      isReadByAdmin: data.senderRole === 'ADMIN',
      isReadByClient: data.senderRole === 'CLIENT',
      createdAt: new Date().toISOString()
    };

    await this.client.from('messages').insert(newMsg);

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

    return newMsg;
  }

  async markMessagesAsRead(clientId, readerRole) {
    if (readerRole === 'ADMIN') {
      await this.client.from('messages').update({ isReadByAdmin: true }).eq('clientId', clientId);
    } else {
      await this.client.from('messages').update({ isReadByClient: true }).eq('clientId', clientId);
    }
    return true;
  }

  async getUnreadChatCount(readerRole, clientId = null) {
    if (readerRole === 'ADMIN') {
      const { count } = await this.client.from('messages').select('*', { count: 'exact', head: true }).eq('isReadByAdmin', false);
      return count || 0;
    } else {
      const { count } = await this.client.from('messages').select('*', { count: 'exact', head: true }).eq('clientId', clientId).eq('isReadByClient', false);
      return count || 0;
    }
  }

  // =========================================================================
  // --- RESET & STATUS ---
  // =========================================================================
  async resetToFreshSetup() {
    await this.client.from('clients').delete().neq('id', 'placeholder');
    await this.client.from('shoots').delete().neq('id', 'placeholder');
    await this.client.from('invoices').delete().neq('id', 'placeholder');
    await this.client.from('videos').delete().neq('id', 'placeholder');
    await this.client.from('messages').delete().neq('id', 'placeholder');
    await this.client.from('notifications').delete().neq('id', 'placeholder');
    await this.client.from('users').delete().neq('role', 'ADMIN');

    const adminUser = await this.findUserByEmail('Bibekbisalnayak@gmail.com');
    await this.addAuditLog({
      event: 'FRESH_SETUP_INITIALIZED',
      ip: '127.0.0.1',
      userId: adminUser?.id || 'usr-admin-1',
      severity: 'INFO',
      details: `Studio workspace reset to pristine fresh production state for admin ${adminUser?.name || 'Bibek Bisal Nayak'} (${adminUser?.email || 'Bibekbisalnayak@gmail.com'}).`
    });

    return {
      success: true,
      message: 'Supabase workspace reset to pristine fresh production state.',
      admin: {
        email: adminUser?.email,
        name: adminUser?.name,
        role: adminUser?.role
      }
    };
  }

  async getSetupStatus() {
    const adminUser = await this.findUserByEmail('Bibekbisalnayak@gmail.com');
    const { count: totalClients } = await this.client.from('clients').select('*', { count: 'exact', head: true });
    const { count: totalShoots } = await this.client.from('shoots').select('*', { count: 'exact', head: true });
    const { count: totalInvoices } = await this.client.from('invoices').select('*', { count: 'exact', head: true });
    const { count: totalVideos } = await this.client.from('videos').select('*', { count: 'exact', head: true });

    return {
      isLive: securityConfig.isLive,
      adminEmail: adminUser?.email || 'Bibekbisalnayak@gmail.com',
      adminName: adminUser?.name || 'Bibek Bisal Nayak',
      totalClients: totalClients || 0,
      totalShoots: totalShoots || 0,
      totalInvoices: totalInvoices || 0,
      totalVideos: totalVideos || 0,
      isFresh: (totalClients || 0) === 0
    };
  }
}

module.exports = new SupabaseService();
