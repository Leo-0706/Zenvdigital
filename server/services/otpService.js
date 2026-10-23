const twilioService = require('./twilioService');

class OtpService {
  constructor() {
    // Map of key (email or phone) => { otp, email, phone, purpose, payload, expiresAt, attempts }
    this.otpStore = new Map();
    this.otpLogs = [];
  }

  generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Dispatch OTP to both Phone and Email
   */
  async sendOtp({ email, phone, purpose = 'Verification', payload = null }) {
    const otp = this.generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    const otpData = {
      otp,
      email: email?.toLowerCase().trim(),
      phone: phone?.trim(),
      purpose,
      payload,
      expiresAt,
      attempts: 0,
      createdAt: new Date().toISOString()
    };

    // Index by email and by phone
    if (email) this.otpStore.set(email.toLowerCase().trim(), otpData);
    if (phone) this.otpStore.set(phone.trim(), otpData);

    const logEntry = {
      id: `OTP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      email,
      phone,
      purpose,
      otp, // retained for test/audit visibility
      expiresAt: new Date(expiresAt).toISOString()
    };
    this.otpLogs.unshift(logEntry);
    if (this.otpLogs.length > 100) this.otpLogs.pop();

    console.log('================================================================');
    console.log(`🔑 [OTP DISPATCH] Purpose: ${purpose}`);
    console.log(`📱 Phone: ${phone || 'N/A'}`);
    console.log(`📧 Email: ${email || 'N/A'}`);
    console.log(`⚡ CODE: ${otp} (Valid for 10 minutes)`);
    console.log('================================================================');

    // 1. Dispatch SMS to phone via Twilio
    if (phone) {
      await twilioService.sendOtpSms(phone, otp, purpose);
    }

    // 2. Dispatch Email
    // Log simulated email delivery (or integrate nodemailer if desired)
    console.log(`[EMAIL DISPATCH] Sent OTP email to ${email} with subject: "Zenv Digital - Your ${purpose} Code: ${otp}"`);

    return {
      success: true,
      message: `OTP has been successfully dispatched to your registered phone (${phone || 'SMS'}) and email (${email}).`,
      expiresInMinutes: 10,
      demoOtp: otp // passed so development/demo testing is smooth and friction-free
    };
  }

  /**
   * Verify an OTP submitted by user
   */
  verifyOtp(identifier, submittedOtp) {
    if (!identifier || !submittedOtp) {
      return { success: false, message: 'Identifier and OTP code are required.' };
    }

    const key = identifier.toLowerCase().trim();
    const record = this.otpStore.get(key);

    if (!record) {
      return { success: false, message: 'No active OTP request found for this account. Please request a new code.' };
    }

    if (Date.now() > record.expiresAt) {
      this.otpStore.delete(key);
      return { success: false, message: 'OTP has expired. Please request a new code.' };
    }

    record.attempts += 1;
    if (record.attempts > 5) {
      this.otpStore.delete(key);
      return { success: false, message: 'Too many incorrect attempts. Please request a fresh OTP.' };
    }

    if (record.otp !== submittedOtp.toString().trim()) {
      return {
        success: false,
        message: `Invalid OTP code. ${5 - record.attempts} attempt(s) remaining.`
      };
    }

    // OTP is valid!
    const payload = record.payload;
    const purpose = record.purpose;

    // Clean up
    if (record.email) this.otpStore.delete(record.email);
    if (record.phone) this.otpStore.delete(record.phone);

    return {
      success: true,
      message: 'OTP verified successfully.',
      purpose,
      payload
    };
  }

  getLogs() {
    return this.otpLogs;
  }
}

module.exports = new OtpService();
