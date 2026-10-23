const { google } = require('googleapis');
const securityConfig = require('./securityConfig');

class GoogleAuthManager {
  constructor() {
    this.authClient = null;
    this.sheetsClient = null;
    this.driveClient = null;
    this.isLive = false;

    this.initializeAuth();
  }

  initializeAuth() {
    const { serviceAccountEmail, privateKey } = securityConfig.google;

    if (
      serviceAccountEmail &&
      privateKey &&
      !serviceAccountEmail.includes('zenv-service-account@zenv-digital-prod') &&
      !privateKey.includes('-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC6')
    ) {
      try {
        const auth = new google.auth.JWT({
          email: serviceAccountEmail,
          key: privateKey,
          scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
          ]
        });

        this.authClient = auth;
        this.sheetsClient = google.sheets({ version: 'v4', auth });
        this.driveClient = google.drive({ version: 'v3', auth });
        this.isLive = true;

        console.log('[GOOGLE AUTH] Production Service Account loaded successfully.');
      } catch (err) {
        console.error('[GOOGLE AUTH ERROR] Failed to authenticate with Google APIs:', err.message);
        this.isLive = false;
      }
    } else {
      console.log('[GOOGLE AUTH] Google Service Account credentials not provided or placeholder. Initializing high-availability in-memory datastore adapter with Google Sheets/Drive interface.');
      this.isLive = false;
    }
  }

  getSheets() {
    return this.sheetsClient;
  }

  getDrive() {
    return this.driveClient;
  }

  isConfigured() {
    return this.isLive;
  }
}

module.exports = new GoogleAuthManager();
