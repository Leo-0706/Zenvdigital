const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/securityMiddleware');
const pushService = require('../services/pushService');
const googleSheetsService = require('../services/googleSheetsService');

/**
 * GET /api/notifications/vapid-public-key
 * Returns VAPID public key needed by browser to subscribe to Web Push
 */
router.get('/vapid-public-key', (req, res) => {
  try {
    const publicKey = pushService.getPublicKey();
    return res.status(200).json({
      success: true,
      publicKey
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/notifications/subscribe
 * Registers browser/device push subscription for the authenticated user
 */
router.post('/subscribe', authenticateJWT, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: 'Valid push subscription object required.' });
    }

    pushService.addSubscription({
      userId: req.user.id,
      role: req.user.role,
      clientId: req.user.clientId,
      subscription,
      userAgent: req.headers['user-agent']
    });

    await googleSheetsService.addAuditLog({
      event: 'PUSH_SUBSCRIBED',
      ip: req.clientIp || req.ip,
      userId: req.user.id,
      severity: 'INFO',
      details: `Push subscription registered for user ${req.user.email} (${req.user.role}).`
    });

    return res.status(200).json({
      success: true,
      message: 'Mobile and system push notifications enabled successfully.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/notifications/unsubscribe
 * Unregisters browser push subscription
 */
router.post('/unsubscribe', authenticateJWT, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      pushService.removeSubscription(endpoint);
    }
    return res.status(200).json({
      success: true,
      message: 'Push subscription removed successfully.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/notifications/test
 * Dispatches an immediate test notification to the user's phone notification bar
 */
router.post('/test', authenticateJWT, async (req, res) => {
  try {
    const result = await pushService.sendTestPush(req.user.id, req.user.role, req.user.clientId);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
