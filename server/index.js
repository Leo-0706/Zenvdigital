require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const securityConfig = require('./config/securityConfig');
const cronService = require('./services/cronService');

// Middleware imports
const {
  checkIpLockout,
  apiLimiter,
  enforceMaintenanceMode
} = require('./middleware/securityMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const systemRoutes = require('./routes/systemRoutes');
const adminRoutes = require('./routes/adminRoutes');
const clientRoutes = require('./routes/clientRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads', 'videos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();

// Trust reverse proxy (Nginx / HAProxy) for X-Forwarded-For resolution
app.set('trust proxy', 1);

// 1. Edge Security Headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        mediaSrc: ["'self'", 'https:', 'blob:', 'data:', 'http:'],
        connectSrc: ["'self'", 'http://localhost:*', 'https://*.googleapis.com', 'https:']
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    frameguard: { action: 'deny' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })
);

// Serve static uploads with cross-origin headers and byte-range support
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  },
  express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res) => {
      res.setHeader('Accept-Ranges', 'bytes');
    }
  })
);

// 2. CORS Configuration
const allowedOrigins = [
  securityConfig.clientUrl,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://localhost',
  'capacitor://localhost',
  'http://localhost'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. native mobile app, curl, server-to-server)
      if (!origin) return callback(null, true);
      // Allow Capacitor native mobile origins and local Wi-Fi development
      if (
        origin === 'https://localhost' || 
        origin === 'capacitor://localhost' || 
        origin.startsWith('http://localhost') || 
        origin.startsWith('http://127.0.0.1') || 
        origin.startsWith('http://192.168.')
      ) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked request from unauthorized origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Maintenance-Bypass']
  })
);

// 3. Body & Cookie Parsing with payload size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 4. Global Edge Intrusion Lockout Defense
app.use(checkIpLockout);

// 5. Authentication Routes (governed independently by authLimiter & intrusion engine)
app.use('/api/auth', authRoutes);

// 6. Global API Rate Limiting for other endpoints
app.use('/api', apiLimiter);

// 7. Maintenance Mode Enforcer
app.use(enforceMaintenanceMode);

// 8. Core Application Route Handlers
app.use('/api/system', systemRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/notifications', notificationRoutes);

// Root health ping
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Zenv Digital Enterprise API Gateway',
    version: '1.0.0',
    documentation: '/api/system/health',
    securityStatus: 'ARMED'
  });
});

// 8. 404 Handler for Unmatched Endpoints
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist on this gateway.`
  });
});

// 9. Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('[UNHANDLED GATEWAY ERROR]', err);

  if (err.message && err.message.includes('CORS blocked')) {
    return res.status(403).json({ success: false, error: 'CORS_FORBIDDEN', message: err.message });
  }

  res.status(err.status || 500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected server error occurred.' : err.message
  });
});

// Start Server and Cron Automation
const PORT = securityConfig.port;
const server = app.listen(PORT, () => {
  console.log('================================================================');
  console.log(`🛡️  ZENV DIGITAL ENTERPRISE BACKEND RUNNING ON PORT ${PORT}`);
  console.log(`🔒 Edge Security: Armed (Rate Limiting, Intrusion Lockout, IDOR Defense)`);
  console.log(`🌐 Environment: ${securityConfig.nodeEnv}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log('================================================================');

  // Launch background crons
  cronService.startAll();
});

// Graceful Shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n[SHUTDOWN] Received ${signal}. Terminating gracefully...`);
  cronService.stopAll();
  server.close(() => {
    console.log('[SHUTDOWN] HTTP server closed cleanly. Exiting.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
