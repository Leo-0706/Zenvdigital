const securityConfig = require('../config/securityConfig');
const twilioService = require('./twilioService');

class IntrusionService {
  constructor() {
    // In-memory rate and attempt trackers (maps IP/Key to state)
    this.failedAttempts = new Map(); // ip -> { count, firstAttempt, lastAttempt, usernames: Set }
    this.blockedIps = new Map(); // ip -> { blockedAt, blockedUntil, reason }
    this.intrusionLogs = []; // persistent event log (can be synced to sheets)
  }

  /**
   * Check whether an IP is currently blocked
   */
  isBlocked(ip) {
    if (securityConfig.nodeEnv === 'development' && (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost')) {
      return false;
    }
    const blockInfo = this.blockedIps.get(ip);
    if (!blockInfo) return false;

    // Check if lockout window has expired
    if (Date.now() > blockInfo.blockedUntil) {
      this.blockedIps.delete(ip);
      this.failedAttempts.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * Get block details for an IP
   */
  getBlockInfo(ip) {
    return this.blockedIps.get(ip) || null;
  }

  /**
   * Record a failed login attempt from an IP and username
   */
  async recordFailedLogin(ip, attemptedUsername, userAgent = 'Unknown') {
    const now = Date.now();
    const windowMs = securityConfig.intrusion.lockoutWindowMinutes * 60 * 1000;
    const maxAttempts = securityConfig.intrusion.maxFailedAttempts;

    let tracker = this.failedAttempts.get(ip);

    if (!tracker || now - tracker.firstAttempt > windowMs) {
      // First attempt or window reset
      tracker = {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
        usernames: new Set([attemptedUsername])
      };
    } else {
      tracker.count += 1;
      tracker.lastAttempt = now;
      tracker.usernames.add(attemptedUsername);
    }

    this.failedAttempts.set(ip, tracker);

    const logEntry = {
      id: `INT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      type: 'FAILED_LOGIN',
      ip,
      attemptedUsername,
      attemptCount: tracker.count,
      userAgent,
      status: tracker.count >= maxAttempts ? 'BLOCKED' : 'WARNING'
    };

    this.intrusionLogs.unshift(logEntry);
    if (this.intrusionLogs.length > 500) this.intrusionLogs.pop(); // keep last 500 in memory

    // Check if threshold breached
    if (tracker.count >= maxAttempts && !this.blockedIps.has(ip)) {
      const blockedUntil = now + windowMs;
      this.blockedIps.set(ip, {
        blockedAt: now,
        blockedUntil,
        reason: `Exceeded ${maxAttempts} failed login attempts within ${securityConfig.intrusion.lockoutWindowMinutes} minutes.`
      });

      console.warn(`[SECURITY ALERT] IP ${ip} BLOCKED for brute-force activity. Attempted usernames: ${Array.from(tracker.usernames).join(', ')}`);

      // Dispatch automated emergency alert via Twilio to Admin
      await twilioService.sendIntrusionAlert({
        ip,
        attempts: tracker.count,
        usernames: Array.from(tracker.usernames),
        userAgent,
        blockedUntil: new Date(blockedUntil).toISOString()
      });

      return {
        blocked: true,
        remainingAttempts: 0,
        blockedUntil: new Date(blockedUntil).toISOString()
      };
    }

    return {
      blocked: false,
      remainingAttempts: Math.max(0, maxAttempts - tracker.count)
    };
  }

  /**
   * Reset attempts on successful authentication
   */
  recordSuccessfulLogin(ip) {
    this.failedAttempts.delete(ip);
  }

  /**
   * Administrative unblock of an IP
   */
  unblockIp(ip) {
    const wasBlocked = this.blockedIps.delete(ip);
    this.failedAttempts.delete(ip);
    return wasBlocked;
  }

  /**
   * Return recent intrusion audit logs
   */
  getIntrusionLogs() {
    return this.intrusionLogs;
  }

  /**
   * List all currently active blocked IPs
   */
  getActiveBlocks() {
    const now = Date.now();
    const active = [];
    for (const [ip, info] of this.blockedIps.entries()) {
      if (now < info.blockedUntil) {
        active.push({
          ip,
          ...info,
          remainingMinutes: Math.ceil((info.blockedUntil - now) / 60000)
        });
      } else {
        this.blockedIps.delete(ip);
      }
    }
    return active;
  }
}

module.exports = new IntrusionService();
