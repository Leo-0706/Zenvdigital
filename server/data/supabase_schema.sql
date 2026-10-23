-- =====================================================================
-- ZENV DIGITAL PRODUCTION DATABASE - SUPABASE POSTGRESQL SCHEMA
-- Copy and run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- =====================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CLIENT',
  "clientId" TEXT,
  name TEXT,
  phone TEXT,
  status TEXT DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  "brandKitDriveFolderId" TEXT,
  "adminDriveFolderId" TEXT,
  "driveEmail" TEXT,
  "communicationConsent" JSONB DEFAULT '{"sms": true, "whatsapp": true, "email": true}'::jsonb,
  status TEXT DEFAULT 'ACTIVE',
  "hibernatedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SHOOTS TABLE
CREATE TABLE IF NOT EXISTS public.shoots (
  id TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT,
  crew TEXT,
  status TEXT DEFAULT 'SCHEDULED',
  notes TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
  id TEXT PRIMARY KEY,
  "invoiceNumber" TEXT UNIQUE NOT NULL,
  "clientId" TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR',
  description TEXT,
  status TEXT DEFAULT 'DRAFT',
  "dueDate" TEXT,
  "issueDate" TEXT,
  "hiddenForClient" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 5. VIDEOS TABLE
CREATE TABLE IF NOT EXISTS public.videos (
  id TEXT PRIMARY KEY,
  "shootId" TEXT,
  "projectName" TEXT,
  "clientId" TEXT NOT NULL,
  title TEXT NOT NULL,
  "driveFileId" TEXT,
  "driveStreamUrl" TEXT,
  version TEXT DEFAULT 'v1.0',
  "reviewType" TEXT,
  "reviewHours" INTEGER DEFAULT 48,
  status TEXT DEFAULT 'PENDING_REVIEW',
  "uploadTimestamp" TIMESTAMPTZ DEFAULT NOW(),
  "approvalDeadline" TIMESTAMPTZ,
  "clientFeedback" JSONB DEFAULT '[]'::jsonb,
  "hiddenForAdmin" BOOLEAN DEFAULT FALSE,
  "hiddenForClient" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MESSAGES (STUDIO DIRECT CHAT) TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "senderRole" TEXT NOT NULL,
  "senderName" TEXT,
  text TEXT NOT NULL,
  tag TEXT DEFAULT 'GENERAL',
  timecode TEXT,
  "isReadByAdmin" BOOLEAN DEFAULT FALSE,
  "isReadByClient" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 7. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  "targetRole" TEXT NOT NULL,
  "clientId" TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  "actionTab" TEXT,
  "isRead" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  event TEXT NOT NULL,
  ip TEXT,
  "userId" TEXT,
  severity TEXT DEFAULT 'INFO',
  details TEXT
);

-- Pre-seed Primary Studio Administrator
INSERT INTO public.users (id, email, "passwordHash", role, name, phone, status)
VALUES (
  'usr-admin-1',
  'Bibekbisalnayak@gmail.com',
  '$2a$10$v0H51gvx2FkpOb/ayolJxug3K/EhTzia8oR/jw0QgKdiWFG1LBPSK', -- ZenvAdmin2026!
  'ADMIN',
  'Bibek Bisal Nayak',
  '+91 95083 61725',
  'ACTIVE'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (id, email, "passwordHash", role, name, phone, status)
VALUES (
  'usr-admin-sys',
  'admin@zenvdigital.com',
  '$2a$10$v0H51gvx2FkpOb/ayolJxug3K/EhTzia8oR/jw0QgKdiWFG1LBPSK', -- ZenvAdmin2026!
  'ADMIN',
  'Bibek Bisal Nayak (System)',
  '+91 95083 61725',
  'ACTIVE'
) ON CONFLICT (email) DO NOTHING;

-- Grant access
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shoots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service Role Full Access Users" ON public.users;
CREATE POLICY "Service Role Full Access Users" ON public.users FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Full Access Clients" ON public.clients;
CREATE POLICY "Service Role Full Access Clients" ON public.clients FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Full Access Shoots" ON public.shoots;
CREATE POLICY "Service Role Full Access Shoots" ON public.shoots FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Full Access Invoices" ON public.invoices;
CREATE POLICY "Service Role Full Access Invoices" ON public.invoices FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Full Access Videos" ON public.videos;
CREATE POLICY "Service Role Full Access Videos" ON public.videos FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Full Access Messages" ON public.messages;
CREATE POLICY "Service Role Full Access Messages" ON public.messages FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Full Access Notifications" ON public.notifications;
CREATE POLICY "Service Role Full Access Notifications" ON public.notifications FOR ALL USING (true);

DROP POLICY IF EXISTS "Service Role Full Access AuditLogs" ON public.audit_logs;
CREATE POLICY "Service Role Full Access AuditLogs" ON public.audit_logs FOR ALL USING (true);
