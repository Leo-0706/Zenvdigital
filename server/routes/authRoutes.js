const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const securityConfig = require('../config/securityConfig');
const googleSheetsService = require('../services/googleSheetsService');
const intrusionService = require('../services/intrusionService');
const otpService = require('../services/otpService');
const { checkIpLockout, authLimiter, authenticateJWT } = require('../middleware/securityMiddleware');

/**
 * POST /api/auth/login
 * Enterprise login with brute-force intrusion tracking, IP rate-limiting, and JWT issuance
 */
router.post(
  '/login',
  checkIpLockout,
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isString().notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    const clientIp = req.clientIp || req.ip;
    const userAgent = req.get('user-agent') || 'Unknown';

    try {
      const user = await googleSheetsService.findUserByEmail(email);

      // Verify user existence and password hash
      let isValidPassword = false;
      if (user && user.passwordHash) {
        isValidPassword = await bcrypt.compare(password, user.passwordHash);
      }

      if (!user || !isValidPassword) {
        // Record failed login in Intrusion Prevention Engine
        const attemptResult = await intrusionService.recordFailedLogin(clientIp, email, userAgent);

        await googleSheetsService.addAuditLog({
          event: 'AUTH_FAILURE',
          ip: clientIp,
          userId: user ? user.id : 'ANONYMOUS',
          severity: attemptResult.blocked ? 'CRITICAL' : 'WARNING',
          details: `Failed credentials for "${email}". Attempt #${securityConfig.intrusion.maxFailedAttempts - attemptResult.remainingAttempts}. Blocked: ${attemptResult.blocked}`
        });

        if (attemptResult.blocked) {
          return res.status(403).json({
            success: false,
            error: 'IP_LOCKED_OUT',
            message: 'Too many failed login attempts. Your IP has been temporarily locked and an intrusion alert dispatched to security administrators.',
            blockedUntil: attemptResult.blockedUntil
          });
        }

        return res.status(401).json({
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
          remainingAttempts: attemptResult.remainingAttempts
        });
      }

      if (user.status !== 'ACTIVE' && user.status !== 'HIBERNATED') {
        return res.status(403).json({
          success: false,
          error: 'ACCOUNT_DEACTIVATED',
          message: 'Your account has been suspended or deactivated. Contact administrative support.'
        });
      }

      // Successful authentication: Reset failed attempt counters for this IP
      intrusionService.recordSuccessfulLogin(clientIp);

      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        name: user.name
      };

      const token = jwt.sign(tokenPayload, securityConfig.jwt.secret, {
        expiresIn: securityConfig.jwt.expiresIn
      });

      // Set HttpOnly Secure Cookie
      res.cookie('zenv_token', token, securityConfig.jwt.cookieOptions);

      await googleSheetsService.addAuditLog({
        event: 'AUTH_SUCCESS',
        ip: clientIp,
        userId: user.id,
        severity: 'INFO',
        details: `User ${user.email} logged in successfully as ${user.role}.`
      });

      return res.status(200).json({
        success: true,
        message: 'Authentication successful.',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          clientId: user.clientId,
          name: user.name,
          phone: user.phone,
          status: user.status
        }
      });
    } catch (err) {
      console.error('[AUTH ERROR] /api/auth/login:', err);
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'An internal error occurred.' });
    }
  }
);

/**
 * GET /api/auth/me
 * Retrieves authenticated user session profile
 */
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const user = await googleSheetsService.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
    }

    let clientData = null;
    if (user.clientId) {
      clientData = await googleSheetsService.getClientById(user.clientId);
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        name: user.name,
        phone: user.phone,
        status: user.status,
        client: clientData
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

/**
 * POST /api/auth/logout
 * Clears authentication token cookie
 */
router.post('/logout', (req, res) => {
  res.clearCookie('zenv_token');
  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

/**
 * POST /api/auth/register-request
 * Client Account Creation: Step 1 (Validate info & Dispatch OTP to phone and email)
 */
router.post(
  '/register-request',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Full name is required'),
    body('company').trim().notEmpty().withMessage('Company or brand name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Valid phone number required for SMS OTP'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array(), message: errors.array()[0].msg });
    }

    const { name, company, email, phone, password } = req.body;

    try {
      // Check if user or client with this email already exists
      const existingUser = await googleSheetsService.findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'EMAIL_ALREADY_EXISTS',
          message: 'An enterprise account with this email address already exists. Please log in.'
        });
      }

      // Hash password in advance
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Dispatch OTP to both Phone and Email
      const otpResult = await otpService.sendOtp({
        email,
        phone,
        purpose: 'Account Registration',
        payload: { name, company, email, phone, passwordHash }
      });

      return res.status(200).json({
        success: true,
        message: 'OTP verification code dispatched to your registered phone and email.',
        email,
        phone,
        demoOtp: otpResult.demoOtp
      });
    } catch (err) {
      console.error('[AUTH ERROR] /register-request:', err);
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  }
);

/**
 * POST /api/auth/register-verify
 * Client Account Creation: Step 2 (Verify OTP and activate account)
 */
router.post(
  '/register-verify',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('otp').trim().notEmpty().withMessage('6-digit OTP code required')
  ],
  async (req, res) => {
    const { email, otp } = req.body;

    try {
      const verifyResult = otpService.verifyOtp(email, otp);
      if (!verifyResult.success) {
        return res.status(400).json({ success: false, message: verifyResult.message });
      }

      const { name, company, phone, passwordHash } = verifyResult.payload;

      // 1. Provision Client
      const newClient = await googleSheetsService.createClient({
        name,
        company,
        email,
        phone
      });

      // 2. Provision User
      const newUser = await googleSheetsService.createUser({
        email,
        passwordHash,
        role: 'CLIENT',
        clientId: newClient.id,
        name,
        phone
      });

      // 3. Generate Session Token
      const tokenPayload = {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        clientId: newUser.clientId,
        name: newUser.name
      };

      const token = jwt.sign(tokenPayload, securityConfig.jwt.secret, {
        expiresIn: securityConfig.jwt.expiresIn
      });

      res.cookie('zenv_token', token, securityConfig.jwt.cookieOptions);

      await googleSheetsService.addAuditLog({
        event: 'CLIENT_SELF_REGISTERED',
        ip: req.clientIp || req.ip,
        userId: newUser.id,
        severity: 'INFO',
        details: `Client ${company} (${newUser.email}) registered and verified with OTP.`
      });

      return res.status(201).json({
        success: true,
        message: 'Account successfully registered and verified! Welcome to Zenv Digital.',
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          clientId: newUser.clientId,
          name: newUser.name,
          phone: newUser.phone
        }
      });
    } catch (err) {
      console.error('[AUTH ERROR] /register-verify:', err);
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  }
);

/**
 * POST /api/auth/forgot-password
 * Account Recovery: Step 1 (Locate account & Dispatch OTP to phone and email)
 */
router.post(
  '/forgot-password',
  authLimiter,
  [body('identifier').trim().notEmpty().withMessage('Email or phone number is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

    const { identifier } = req.body;

    try {
      // Find user by email or by phone
      let user = await googleSheetsService.findUserByEmail(identifier);
      if (!user) {
        user = await googleSheetsService.findUserByPhone(identifier);
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'No registered Zenv Digital account was found with that email or phone number.'
        });
      }

      const otpResult = await otpService.sendOtp({
        email: user.email,
        phone: user.phone,
        purpose: 'Password Reset',
        payload: { userId: user.id, email: user.email }
      });

      return res.status(200).json({
        success: true,
        message: `A 6-digit password recovery code has been sent to your phone (${user.phone ? '...' + user.phone.slice(-4) : 'SMS'}) and email (${user.email}).`,
        email: user.email,
        phone: user.phone,
        demoOtp: otpResult.demoOtp
      });
    } catch (err) {
      console.error('[AUTH ERROR] /forgot-password:', err);
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Account Recovery: Step 2 (Verify OTP and commit new password)
 */
router.post(
  '/reset-password',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('otp').trim().notEmpty().withMessage('OTP code required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

    const { email, otp, newPassword } = req.body;

    try {
      const verifyResult = otpService.verifyOtp(email, otp);
      if (!verifyResult.success) {
        return res.status(400).json({ success: false, message: verifyResult.message });
      }

      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(newPassword, salt);

      const updatedUser = await googleSheetsService.updateUserPassword(email, newHash);
      if (!updatedUser) {
        return res.status(404).json({ success: false, message: 'Account not found for password update.' });
      }

      await googleSheetsService.addAuditLog({
        event: 'PASSWORD_RESET_SUCCESS',
        ip: req.clientIp || req.ip,
        userId: updatedUser.id,
        severity: 'INFO',
        details: `User ${email} successfully reset password via multi-factor OTP.`
      });

      return res.status(200).json({
        success: true,
        message: 'Password successfully updated! You can now log in with your new password.'
      });
    } catch (err) {
      console.error('[AUTH ERROR] /reset-password:', err);
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  }
);

/**
 * POST /api/auth/resend-otp
 */
router.post('/resend-otp', authLimiter, async (req, res) => {
  const { email, phone, purpose } = req.body;
  if (!email && !phone) return res.status(400).json({ success: false, message: 'Email or phone required' });

  try {
    const otpResult = await otpService.sendOtp({
      email,
      phone,
      purpose: purpose || 'Verification'
    });

    return res.status(200).json({
      success: true,
      message: 'New OTP dispatched.',
      demoOtp: otpResult.demoOtp
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
