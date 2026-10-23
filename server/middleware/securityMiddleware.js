const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const securityConfig = require('../config/securityConfig');
const intrusionService = require('../services/intrusionService');

// State for dynamic maintenance mode (runtime toggling by admin)
let isMaintenanceModeActive = securityConfig.maintenance.enabled;

const maintenanceManager = {
  isEnabled: () => isMaintenanceModeActive,
  setMode: (status) => {
    isMaintenanceModeActive = Boolean(status);
    return isMaintenanceModeActive;
  }
};

/**
 * 1. IP Lockout & Intrusion Blocker
 */
const checkIpLockout = (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || req.ip;

  if (intrusionService.isBlocked(clientIp)) {
    const blockInfo = intrusionService.getBlockInfo(clientIp);
    const remainingMinutes = blockInfo ? Math.max(1, Math.ceil((blockInfo.blockedUntil - Date.now()) / 60000)) : 15;

    return res.status(403).json({
      success: false,
      error: 'ACCESS_RESTRICTED',
      message: `Your IP (${clientIp}) has been temporarily suspended due to repeated unauthorized attempts.`,
      lockoutExpiresInMinutes: remainingMinutes,
      supportNotice: 'Intrusion alert logged and security dispatched.'
    });
  }

  req.clientIp = clientIp;
  next();
};

const isLoopbackIp = (ip) => {
  if (!ip) return false;
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.startsWith('127.') ||
    ip === 'localhost'
  );
};

/**
 * 2. Rate Limiting Middlewares
 */
const apiLimiter = rateLimit({
  windowMs: securityConfig.intrusion.rateLimitWindowMs,
  max: securityConfig.nodeEnv === 'development' ? 50000 : securityConfig.intrusion.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // In development mode, skip localhost/loopback to prevent developer lockouts during dev/hot-reloading
    if (securityConfig.nodeEnv === 'development') {
      const ip = req.clientIp || req.ip || req.socket?.remoteAddress;
      if (isLoopbackIp(ip)) return true;
    }
    // Auth routes have their own dedicated authLimiter with brute-force tracking
    if (req.originalUrl?.includes('/api/auth') || req.path?.startsWith('/auth')) {
      return true;
    }
    // Background polling (notifications, studio chat messages, health checks) shouldn't count against limit
    if (
      req.originalUrl?.includes('/notifications') ||
      req.originalUrl?.includes('/messages') ||
      req.originalUrl?.includes('/health')
    ) {
      return true;
    }
    return false;
  },
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP address. Please wait before retrying.'
  }
});

const authLimiter = rateLimit({
  windowMs: securityConfig.intrusion.rateLimitWindowMs,
  max: securityConfig.nodeEnv === 'development' ? 2000 : securityConfig.intrusion.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // In development mode, skip localhost/loopback
    if (securityConfig.nodeEnv === 'development') {
      const ip = req.clientIp || req.ip || req.socket?.remoteAddress;
      if (isLoopbackIp(ip)) return true;
    }
    return false;
  },
  message: {
    success: false,
    error: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});

/**
 * 3. Maintenance Mode Enforcer
 */
const enforceMaintenanceMode = (req, res, next) => {
  // Allow health check and maintenance status queries unconditionally
  if (req.path.startsWith('/api/system/health') || req.path === '/api/system/maintenance/status') {
    return next();
  }

  if (maintenanceManager.isEnabled()) {
    // Check for secret bypass header
    const bypassToken = req.headers['x-maintenance-bypass'];
    if (bypassToken && bypassToken === securityConfig.maintenance.bypassSecret) {
      return next();
    }

    // Check if token exists and belongs to ADMIN
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, securityConfig.jwt.secret);
        if (decoded && decoded.role === 'ADMIN') {
          return next();
        }
      } catch (e) {
        // Fall through to 503
      }
    }

    return res.status(503).json({
      success: false,
      error: 'MAINTENANCE_MODE',
      message: 'Zenv Digital platform is currently undergoing scheduled maintenance for system upgrades.',
      maintenanceNotice: {
        status: 'UPDATING',
        expectedReturn: 'Shortly',
        contact: 'support@zenvdigital.com'
      }
    });
  }

  next();
};

/**
 * 4. JWT Authentication
 */
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.zenv_token;

  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (cookieToken) {
    token = cookieToken;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Access token missing or expired. Please sign in.'
    });
  }

  try {
    const decoded = jwt.verify(token, securityConfig.jwt.secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Session invalid or expired. Re-authentication required.'
    });
  }
};

/**
 * 5. Role-Based Access Control (RBAC)
 */
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`[RBAC VIOLATION] User ${req.user.email} (${req.user.role}) attempted to access restricted endpoint ${req.originalUrl}`);
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You lack insufficient privileges to access this resource.'
      });
    }

    next();
  };
};

/**
 * 6. Insecure Direct Object Reference (IDOR) Defense
 * Guarantees a client cannot read or mutate another client's files, shoots, videos, or invoices.
 */
const preventIDOR = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
  }

  // Admins have organization-wide access
  if (req.user.role === 'ADMIN') {
    return next();
  }

  // For Client role, examine requested target clientId in params, query, or body
  const targetClientId = req.params.clientId || req.query.clientId || req.body.clientId;

  if (targetClientId && String(targetClientId) !== String(req.user.clientId)) {
    console.warn(`[IDOR DEFENSE TRIGGERED] User ${req.user.email} (clientId: ${req.user.clientId}) attempted to access foreign clientId: ${targetClientId}`);
    return res.status(403).json({
      success: false,
      error: 'IDOR_ACCESS_DENIED',
      message: 'Unauthorized access: You are only permitted to access assets and records belonging to your registered agency account.'
    });
  }

  next();
};

/**
 * Resource-level IDOR helper function to check object ownership
 */
const verifyResourceOwnership = (req, resourceClientId) => {
  if (req.user.role === 'ADMIN') return true;
  return String(resourceClientId) === String(req.user.clientId);
};

module.exports = {
  checkIpLockout,
  apiLimiter,
  authLimiter,
  enforceMaintenanceMode,
  authenticateJWT,
  requireRole,
  preventIDOR,
  verifyResourceOwnership,
  maintenanceManager
};
