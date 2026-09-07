-- VoxVerity Migration 003 — NextAuth DB-only auth + frontend-backed tables
-- Supabase is used ONLY as database. Auth is NextAuth (credentials bcrypt + OAuth provisioning).
-- Supabase Auth (auth.users) is NOT used. All app identity lives in public.app_users.
--
-- Run in Supabase SQL Editor AFTER 001 + 002.
-- Idempotent: all statements use IF NOT EXISTS / ON CONFLICT / DO blocks.

-- ============================================================
-- 0. Helpers
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. App users (NextAuth credentials + OAuth provisioning)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  password_hash TEXT,
  role TEXT DEFAULT 'operator' CHECK (role IN ('owner','admin','analyst','operator','viewer')),
  email_verified BOOLEAN DEFAULT false,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);

-- OAuth linked accounts (one row per provider account)
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider, provider_account_id)
);
CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_accounts(user_id);

-- Password reset tokens (hashed token stored, raw token emailed)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reset_user ON password_reset_tokens(user_id);

-- ============================================================
-- 2. Profiles extension (fix missing organization_id + frontend fields)
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS app_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_app_user ON profiles(app_user_id);

-- Backfill first/last from name where empty
UPDATE profiles SET first_name = split_part(name, ' ', 1) WHERE first_name IS NULL AND name IS NOT NULL;
UPDATE profiles SET last_name = NULLIF(substr(name, strpos(name, ' ') + 1), '') WHERE last_name IS NULL AND name LIKE '% %';

-- ============================================================
-- 3. Roles (frontend admin/roles expects table, not just CHECK column)
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Seed global default roles (NULL org = template)
INSERT INTO roles (organization_id, name, description, permissions) VALUES
  (NULL, 'OWNER', 'Full organization administration', '["users.manage","org.manage","policy.manage","audit.read","evidence.manage"]'),
  (NULL, 'ADMIN', 'Users, roles, configuration, integrations', '["users.manage","policy.manage","integrations.manage","audit.read"]'),
  (NULL, 'ANALYST', 'Monitoring, analysis, alerts, incidents, evidence', '["alerts.read","alerts.act","incidents.manage","evidence.manage"]'),
  (NULL, 'OPERATOR', 'Protected user functions, live protection, verification', '["live.start","verification.act"]'),
  (NULL, 'VIEWER', 'Read-only selected views', '["dashboard.read","calls.read"]')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. Extend organizations (members count + status for admin UI)
-- ============================================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0;

-- ============================================================
-- 5. Notification preferences + rules (settings/notifications)
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  inapp BOOLEAN DEFAULT true,
  email BOOLEAN DEFAULT true,
  sms BOOLEAN DEFAULT false,
  webhook BOOLEAN DEFAULT false,
  severity_threshold TEXT DEFAULT 'MEDIUM',
  sound_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(app_user_id, organization_id)
);

CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  condition TEXT DEFAULT '',
  actions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. Sessions / login history / MFA (settings/security, profile)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  device TEXT DEFAULT '',
  browser TEXT DEFAULT '',
  ip TEXT DEFAULT '',
  location TEXT DEFAULT '',
  last_seen TIMESTAMPTZ DEFAULT now(),
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(app_user_id);

CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  email TEXT DEFAULT '',
  ip TEXT DEFAULT '',
  outcome TEXT DEFAULT 'Success',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_user ON login_history(app_user_id);

CREATE TABLE IF NOT EXISTS mfa_factors (
  app_user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  method TEXT DEFAULT 'totp',
  enabled BOOLEAN DEFAULT false,
  enrolled_at TIMESTAMPTZ
);

-- ============================================================
-- 7. API keys (settings API Keys tab; only hash stored)
-- ============================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  app_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT DEFAULT '',
  permissions JSONB DEFAULT '[]',
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id);

-- ============================================================
-- 8. Extend calls / alerts / incidents / verification / evidence / audit
--    (columns the frontend already renders)
-- ============================================================
ALTER TABLE calls ADD COLUMN IF NOT EXISTS caller_display TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS synthetic_label TEXT DEFAULT 'UNCERTAIN';
ALTER TABLE calls ADD COLUMN IF NOT EXISTS speaker_similarity NUMERIC(5,4);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS outcome TEXT DEFAULT 'Under Review';

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS threat_title TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS caller_display TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Investigating';

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS summary TEXT DEFAULT '';
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS owner_name TEXT DEFAULT 'Unassigned';

CREATE TABLE IF NOT EXISTS incident_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  app_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  author_name TEXT DEFAULT '',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notes_incident ON incident_notes(incident_id);

ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS caller_display TEXT;

ALTER TABLE evidence_records ADD COLUMN IF NOT EXISTS caller_display TEXT;

ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS actor_name TEXT DEFAULT 'System';
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS outcome TEXT DEFAULT 'Success';

-- ============================================================
-- 9. Analysis extensions + lab files (analysis/, lab/audio/)
-- ============================================================
CREATE TABLE IF NOT EXISTS lab_audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  app_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  duration_sec INTEGER DEFAULT 0,
  sample_rate INTEGER DEFAULT 16000,
  channels INTEGER DEFAULT 1,
  size_kb INTEGER DEFAULT 0,
  storage_path TEXT DEFAULT '',
  analyzed BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lab_org ON lab_audio_files(organization_id);

ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS file_id UUID REFERENCES lab_audio_files(id) ON DELETE SET NULL;
ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS prosody_anomaly NUMERIC(5,4);
ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- ============================================================
-- 10. Threat campaigns, analytics rollups, protected lines, insights
-- ============================================================
CREATE TABLE IF NOT EXISTS threat_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  attack TEXT DEFAULT '',
  active_sessions INTEGER DEFAULT 0,
  risk INTEGER DEFAULT 0,
  last_seen TIMESTAMPTZ DEFAULT now(),
  indicators JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  calls_total INTEGER DEFAULT 0,
  risk_avg NUMERIC(5,2) DEFAULT 0,
  distribution JSONB DEFAULT '{}',
  volumes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, day)
);

CREATE TABLE IF NOT EXISTS pipeline_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  avg_chunk_ms INTEGER DEFAULT 0,
  p95_chunk_ms INTEGER DEFAULT 0,
  inference_ms INTEGER DEFAULT 0,
  ws_uptime_pct NUMERIC(5,2) DEFAULT 100,
  queue_depth INTEGER DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS protected_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sub TEXT DEFAULT '',
  tag TEXT DEFAULT 'Low',
  health INTEGER DEFAULT 100,
  sessions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dashboard_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  level TEXT DEFAULT 'Low',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 11. Extend risk_policies (settings/risk fields)
-- ============================================================
ALTER TABLE risk_policies ADD COLUMN IF NOT EXISTS verification_threshold INTEGER DEFAULT 75;
ALTER TABLE risk_policies ADD COLUMN IF NOT EXISTS auto_escalation BOOLEAN DEFAULT true;
ALTER TABLE risk_policies ADD COLUMN IF NOT EXISTS sensitivity TEXT DEFAULT 'High (Strict)';
ALTER TABLE risk_policies ADD COLUMN IF NOT EXISTS model_version TEXT DEFAULT 'v3.2 (Latest)';
ALTER TABLE risk_policies ADD COLUMN IF NOT EXISTS band_actions JSONB DEFAULT '{"LOW":"Monitor","MEDIUM":"Review","HIGH":"Alert + verify","CRITICAL":"Escalate + incident"}';

-- ============================================================
-- 13. Re-point user FKs from auth.users → app_users (NextAuth DB-only)
-- ============================================================
DO $$ BEGIN
  ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey;
  ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_user_id_fkey;
  ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_acknowledged_by_fkey;
  ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_owner_id_fkey;
  ALTER TABLE verification_requests DROP CONSTRAINT IF EXISTS verification_requests_requested_by_fkey;
  ALTER TABLE verification_requests DROP CONSTRAINT IF EXISTS verification_requests_resolved_by_fkey;
  ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS audit_events_user_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE organization_members ADD CONSTRAINT organization_members_app_user_fk FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE calls ADD CONSTRAINT calls_app_user_fk FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE incidents ADD CONSTRAINT incidents_owner_fk FOREIGN KEY (owner_id) REFERENCES app_users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 14. RLS — service_role bypasses RLS (server writes). Allow anon/authenticated
--     reads so Supabase Realtime + browser live views work without Supabase Auth.
--     Writes MUST go through server API routes using SUPABASE_SERVICE_ROLE_KEY.
-- ============================================================
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE protected_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_insights ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Read-only for browser realtime (anon + authenticated). No write policies:
  -- writes happen server-side with service_role which bypasses RLS.
  CREATE POLICY "browser read app_users" ON app_users FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read roles" ON roles FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read calls" ON calls FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read alerts" ON alerts FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read incidents" ON incidents FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read analysis" ON analysis_results FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read verification" ON verification_requests FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read evidence" ON evidence_records FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read audit" ON audit_events FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read models" ON model_registry FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read policies" ON risk_policies FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read integrations" ON integrations FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read blockchain" ON blockchain_registrations FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read lab_files" ON lab_audio_files FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read threats" ON threat_campaigns FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read analytics" ON analytics_daily FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read pipeline" ON pipeline_health FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read lines" ON protected_lines FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read insights" ON dashboard_insights FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read orgs" ON organizations FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read notes" ON incident_notes FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
