require('dotenv').config();

const securityConfig = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  apiPrefix: process.env.API_PREFIX || '/api',

  // Primary Administrator Configuration
  admin: {
    email: (process.env.ADMIN_EMAIL || 'Bibekbisalnayak@gmail.com').trim(),
    name: process.env.ADMIN_NAME || 'Bibek Bisal Nayak',
    phone: process.env.ADMIN_PHONE || '+91 95083 61725',
    initialPassword: process.env.ADMIN_INITIAL_PASSWORD || 'ZenvAdmin2026!'
  },
  isLive: process.env.NODE_ENV === 'production',

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'zenv_digital_dev_jwt_secret_key_change_in_production_123!',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'zenv_digital_dev_refresh_secret_key_change_in_production_456!',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  },

  // Intrusion Prevention & Rate Limiting Thresholds
  intrusion: {
    maxFailedAttempts: parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS, 10) || 5,
    lockoutWindowMinutes: parseInt(process.env.LOCKOUT_WINDOW_MINUTES, 10) || 15,
    rateLimitWindowMs: (parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) || 15) * 60 * 1000,
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 500,
    authRateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 10) || 100
  },

  // Maintenance Mode Configuration
  maintenance: {
    enabled: process.env.MAINTENANCE_MODE === 'true',
    bypassSecret: process.env.MAINTENANCE_BYPASS_SECRET || 'zenv_admin_override_key_9944'
  },

  // Google Cloud API Configuration
  google: {
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : null,
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    driveRootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  },

  // Twilio SMS & Alert System
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    adminAlertPhoneNumber: process.env.ADMIN_ALERT_PHONE_NUMBER || process.env.ADMIN_PHONE || '+91 95083 61725'
  },

  // Cron Schedules & Deadlines
  cron: {
    autoApprovalCron: process.env.AUTO_APPROVAL_CRON || '0 * * * *',
    paymentReminderCron: process.env.PAYMENT_REMINDER_CRON || '0 9 * * *',
    autoApprovalHours: parseInt(process.env.AUTO_APPROVAL_HOURS, 10) || 48
  }
};

module.exports = securityConfig;
