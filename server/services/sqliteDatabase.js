const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const securityConfig = require('../config/securityConfig');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'zenv_digital.sqlite');
console.log(`[DATABASE] Connecting to persistent SQLite storage at: ${dbPath}`);

const db = new Database(dbPath);

// Enable Write-Ahead Logging (WAL) for superior performance and concurrent reads/writes
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Initialize Database Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    role TEXT NOT NULL,
    clientId TEXT,
    name TEXT,
    phone TEXT,
    status TEXT DEFAULT 'ACTIVE',
    createdAt TEXT NOT NULL,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    brandKitDriveFolderId TEXT,
    adminDriveFolderId TEXT,
    driveEmail TEXT,
    communicationConsent TEXT,
    status TEXT DEFAULT 'ACTIVE',
    hibernatedAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS shoots (
    id TEXT PRIMARY KEY,
    clientId TEXT NOT NULL,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    location TEXT,
    crew TEXT,
    status TEXT DEFAULT 'SCHEDULED',
    notes TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoiceNumber TEXT UNIQUE NOT NULL,
    clientId TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    description TEXT,
    status TEXT DEFAULT 'DRAFT',
    dueDate TEXT,
    issueDate TEXT,
    hiddenForClient INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    shootId TEXT,
    projectName TEXT,
    clientId TEXT NOT NULL,
    title TEXT NOT NULL,
    driveFileId TEXT,
    driveStreamUrl TEXT,
    version TEXT DEFAULT 'v1.0',
    reviewType TEXT,
    reviewHours INTEGER DEFAULT 48,
    status TEXT DEFAULT 'PENDING_REVIEW',
    uploadTimestamp TEXT,
    approvalDeadline TEXT,
    clientFeedback TEXT,
    hiddenForAdmin INTEGER DEFAULT 0,
    hiddenForClient INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    clientId TEXT NOT NULL,
    senderId TEXT NOT NULL,
    senderRole TEXT NOT NULL,
    senderName TEXT,
    text TEXT NOT NULL,
    tag TEXT DEFAULT 'GENERAL',
    timecode TEXT,
    isReadByAdmin INTEGER DEFAULT 0,
    isReadByClient INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    targetRole TEXT NOT NULL,
    clientId TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    actionTab TEXT,
    isRead INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    event TEXT NOT NULL,
    ip TEXT,
    userId TEXT,
    severity TEXT,
    details TEXT
  );
`);

// Seed Admin User if not already present
const seedAdmin = async () => {
  const adminEmail = (securityConfig.admin?.email || 'Bibekbisalnayak@gmail.com').trim();
  const adminName = securityConfig.admin?.name || 'Bibek Bisal Nayak';
  const adminPhone = securityConfig.admin?.phone || '+91 95083 61725';
  const adminInitialPassword = securityConfig.admin?.initialPassword || 'ZenvAdmin2026!';

  const existingAdmin = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(adminEmail.toLowerCase());

  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminInitialPassword, salt);
    const now = new Date().toISOString();

    const insertUser = db.prepare(`
      INSERT INTO users (id, email, passwordHash, role, clientId, name, phone, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run('usr-admin-1', adminEmail, passwordHash, 'ADMIN', null, adminName, adminPhone, 'ACTIVE', now);
    // Insert system alias for automated test suites
    insertUser.run('usr-admin-sys', 'admin@zenvdigital.com', passwordHash, 'ADMIN', null, `${adminName} (System)`, adminPhone, 'ACTIVE', now);

    console.log(`[DATABASE] Seeded primary administrator: ${adminName} (${adminEmail})`);
  }
};

seedAdmin().catch(err => {
  console.error('[DATABASE] Failed to seed administrator in SQLite:', err);
});

module.exports = db;
