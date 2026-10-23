const webpush = require('web-push');
const path = require('path');
const fs = require('fs');

class PushService {
  constructor() {
    this.vapidKeysPath = path.join(__dirname, '..', 'config', 'vapid.json');
    this.subsFilePath = path.join(__dirname, '..', 'config', 'push_subscriptions.json');
    this.subscriptions = [];
    this.initVapid();
    this.initSubscriptions();
  }

  initVapid() {
    let vapidKeys;

    // Check if keys already saved
    if (fs.existsSync(this.vapidKeysPath)) {
      try {
        const raw = fs.readFileSync(this.vapidKeysPath, 'utf8');
        vapidKeys = JSON.parse(raw);
      } catch (e) {
        console.warn('[PUSH SERVICE] Error reading vapid.json, regenerating keys:', e.message);
      }
    }

    // If no valid keys, generate new pair
    if (!vapidKeys || !vapidKeys.publicKey || !vapidKeys.privateKey) {
      vapidKeys = webpush.generateVAPIDKeys();
      try {
        fs.writeFileSync(this.vapidKeysPath, JSON.stringify(vapidKeys, null, 2), 'utf8');
        console.log('[PUSH SERVICE] Generated and saved persistent VAPID keys.');
      } catch (e) {
        console.warn('[PUSH SERVICE] Could not write vapid.json to disk:', e.message);
      }
    }

    this.publicKey = vapidKeys.publicKey;
    this.privateKey = vapidKeys.privateKey;

    webpush.setVapidDetails(
      'mailto:notifications@zenvdigital.com',
      this.publicKey,
      this.privateKey
    );

    console.log('[PUSH SERVICE] Web Push Service initialized. VAPID Public Key ready.');
  }

  initSubscriptions() {
    if (fs.existsSync(this.subsFilePath)) {
      try {
        const raw = fs.readFileSync(this.subsFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.subscriptions = parsed;
          console.log(`[PUSH SERVICE] Loaded ${this.subscriptions.length} persistent push subscription(s) from disk.`);
        }
      } catch (e) {
        console.warn('[PUSH SERVICE] Error reading push_subscriptions.json:', e.message);
        this.subscriptions = [];
      }
    } else {
      this.subscriptions = [];
    }
  }

  saveSubscriptions() {
    try {
      fs.writeFileSync(this.subsFilePath, JSON.stringify(this.subscriptions, null, 2), 'utf8');
    } catch (e) {
      console.warn('[PUSH SERVICE] Could not write push_subscriptions.json to disk:', e.message);
    }
  }

  getPublicKey() {
    return this.publicKey;
  }

  /**
   * Register or update push subscription
   */
  addSubscription({ userId, role, clientId, subscription, userAgent }) {
    if (!subscription || !subscription.endpoint) {
      return false;
    }

    const index = this.subscriptions.findIndex(s => s.subscription?.endpoint === subscription.endpoint);
    const subRecord = {
      id: `psub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      role,
      clientId: clientId || null,
      subscription,
      userAgent: userAgent || '',
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      this.subscriptions[index] = { ...this.subscriptions[index], ...subRecord };
    } else {
      this.subscriptions.push(subRecord);
    }

    this.saveSubscriptions();
    console.log(`[PUSH SERVICE] Registered push subscription for ${role} (${userId}). Total active: ${this.subscriptions.length}`);
    return true;
  }

  /**
   * Remove push subscription
   */
  removeSubscription(endpoint) {
    const beforeCount = this.subscriptions.length;
    this.subscriptions = this.subscriptions.filter(s => s.subscription?.endpoint !== endpoint);
    const removed = beforeCount - this.subscriptions.length;
    if (removed > 0) {
      this.saveSubscriptions();
      console.log(`[PUSH SERVICE] Removed ${removed} expired/unregistered subscription(s).`);
    }
    return removed > 0;
  }

  /**
   * Get subscriptions for a user role and/or clientId
   */
  getSubscriptions(targetRole, clientId = null) {
    if (targetRole === 'ALL') {
      return [...this.subscriptions];
    }

    if (targetRole === 'ADMIN') {
      return this.subscriptions.filter(s => s.role === 'ADMIN');
    }

    if (targetRole === 'CLIENT') {
      return this.subscriptions.filter(s => {
        if (s.role !== 'CLIENT') return false;
        if (!clientId) return true;
        return s.clientId === clientId || s.userId === clientId;
      });
    }

    return [];
  }

  /**
   * Get device stats for a specific client
   */
  getClientDeviceStats(clientId) {
    const subs = this.getSubscriptions('CLIENT', clientId);
    return {
      count: subs.length,
      hasActiveDevice: subs.length > 0,
      devices: subs.map(s => ({
        id: s.id,
        userAgent: s.userAgent || 'Web / Mobile Device',
        updatedAt: s.updatedAt
      }))
    };
  }

  /**
   * Get device counts for all clients
   */
  getAllClientsDeviceStats() {
    const stats = {};
    for (const s of this.subscriptions) {
      if (s.role === 'CLIENT' && (s.clientId || s.userId)) {
        const key = s.clientId || s.userId;
        stats[key] = (stats[key] || 0) + 1;
      }
    }
    return stats;
  }

  /**
   * Send notification to all subscribers matching targetRole and clientId
   */
  async sendPushToRole(targetRole, clientId, payload) {
    const targets = this.getSubscriptions(targetRole, clientId);
    if (!targets || targets.length === 0) {
      console.log(`[PUSH SERVICE] No active push subscriptions found for target ${targetRole}${clientId ? ` (Client: ${clientId})` : ''}.`);
      return { sent: 0, failed: 0, targetsCount: 0 };
    }

    console.log(`[PUSH SERVICE] Dispatching phone push notification to ${targets.length} subscriber(s) for ${targetRole}: "${payload.title}"`);

    const actionTab = payload.actionTab || 'review';
    const targetUrl = payload.data?.url || (targetRole === 'ADMIN' ? `/admin?tab=${actionTab}` : `/portal?tab=${actionTab}`);

    const formattedPayload = JSON.stringify({
      title: payload.title || 'Zenv Digital Alert',
      body: payload.body || payload.message || '',
      icon: payload.icon || '/app_icon.png',
      badge: payload.badge || '/favicon-32.png',
      tag: payload.tag || `zenv-${Date.now()}`,
      timestamp: Date.now(),
      vibrate: payload.urgent ? [300, 100, 300, 100, 300, 100, 300] : [200, 100, 200, 100, 200],
      renotify: true,
      requireInteraction: true, // Native phone popup persists until user interacts
      data: {
        url: targetUrl,
        type: payload.type || 'SYSTEM',
        actionTab,
        id: payload.data?.id || `notif-${Date.now()}`
      }
    });

    let sent = 0;
    let failed = 0;

    const promises = targets.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, formattedPayload);
        sent++;
      } catch (err) {
        failed++;
        console.warn(`[PUSH SERVICE] Failed to deliver push to subscription (${sub.userId}):`, err.statusCode || err.message);
        // Clean up expired or unregistered endpoints (HTTP 404 Not Found or 410 Gone)
        if (err.statusCode === 404 || err.statusCode === 410) {
          this.removeSubscription(sub.subscription.endpoint);
        }
      }
    });

    await Promise.allSettled(promises);
    return { sent, failed };
  }

  /**
   * Send test notification directly to a specific user
   */
  async sendTestPush(userId, role, clientId) {
    const userSubs = this.subscriptions.filter(s => s.userId === userId);
    if (userSubs.length === 0) {
      return {
        success: false,
        message: 'No push subscription found on server for this browser session. Please enable notification permissions first.'
      };
    }

    const testPayload = JSON.stringify({
      title: 'Zenv Digital • Mobile Notification Bar Alert',
      body: 'Success! Your device is now connected to receive instant alerts for new chat messages, shoot schedules, video audits, and invoice updates even when the app is closed.',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'zenv-test-notification',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      data: {
        url: role === 'ADMIN' ? '/admin' : '/portal',
        actionTab: 'review'
      }
    });

    let delivered = 0;
    for (const sub of userSubs) {
      try {
        await webpush.sendNotification(sub.subscription, testPayload);
        delivered++;
      } catch (err) {
        console.warn('[PUSH SERVICE] Test push send error:', err.message);
        if (err.statusCode === 404 || err.statusCode === 410) {
          this.removeSubscription(sub.subscription.endpoint);
        }
      }
    }

    return {
      success: delivered > 0,
      deliveredCount: delivered,
      message: delivered > 0
        ? 'Test notification dispatched to your phone/system notification bar!'
        : 'Could not deliver test notification. The browser push subscription may have expired.'
    };
  }
}

module.exports = new PushService();
