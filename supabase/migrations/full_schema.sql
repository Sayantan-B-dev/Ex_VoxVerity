-- ============================================================================
-- VoxVerity full_schema.sql — consolidated schema (replaces old 001+002+003)
--
-- Auth model: NextAuth DB-only. ALL app identity lives in public.app_users.
-- Supabase is used ONLY as a database / realtime broadcast — Supabase Auth
-- (auth.users) is never used, so nothing in this file references it.
--   - profiles.id intentionally has NO foreign key (app inserts use a random
--     UUID; seeds use the app_user id as a convention).
--   - Every user FK points at app_users.
--   - RLS is enabled everywhere; browsers read via anon/authenticated read
--     policies (needed for Supabase Realtime). All writes go through server
--     routes with the service_role key, which bypasses RLS.
--
-- Run AFTER reset.sql, BEFORE final_seed.sql.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Identity (NextAuth)
-- ============================================================================

CREATE TABLE app_users (
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
CREATE INDEX idx_app_users_email ON app_users(email);

CREATE TABLE oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider, provider_account_id)
);
CREATE INDEX idx_oauth_user ON oauth_accounts(user_id);

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_reset_user ON password_reset_tokens(user_id);

-- ============================================================================
-- 2. Organizations + profiles
-- ============================================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  status TEXT DEFAULT 'Active',
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'operator' CHECK (role IN ('owner','admin','analyst','operator','viewer')),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  app_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  department TEXT,
  job_title TEXT,
  location TEXT,
  avatar_url TEXT,
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  theme TEXT DEFAULT 'dark',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_profiles_org ON profiles(organization_id);
CREATE INDEX idx_profiles_app_user ON profiles(app_user_id);

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'operator' CHECK (role IN ('owner','admin','analyst','operator','viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- ============================================================================
-- 3. Calls / sessions / audio analysis
-- ============================================================================

CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'webrtc' CHECK (source IN ('webrtc','microphone','display_audio','file','telephony_adapter')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','failed')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER,
  risk_score INTEGER DEFAULT 0,
  risk_severity TEXT DEFAULT 'LOW' CHECK (risk_severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  alert_count INTEGER DEFAULT 0,
  caller_display TEXT,
  phone_number TEXT,
  synthetic_label TEXT DEFAULT 'UNCERTAIN',
  speaker_similarity NUMERIC(5,4),
  outcome TEXT DEFAULT 'Under Review',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_calls_org ON calls(organization_id);
CREATE INDEX idx_calls_user ON calls(user_id);
CREATE INDEX idx_calls_status ON calls(status);

-- Call invitations (ring/accept/reject state machine between org users)
CREATE TABLE call_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  caller_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  callee_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'ringing' CHECK (status IN ('ringing','accepted','rejected','ended')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_invites_callee ON call_invites(callee_id, status);
CREATE INDEX idx_invites_room ON call_invites(room_id);

CREATE TABLE lab_audio_files (
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
CREATE INDEX idx_lab_org ON lab_audio_files(organization_id);

CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  file_id UUID REFERENCES lab_audio_files(id) ON DELETE SET NULL,
  chunk_sequence INTEGER,
  risk_score INTEGER DEFAULT 0,
  risk_severity TEXT DEFAULT 'LOW',
  spoof_score NUMERIC(5,4),
  speaker_similarity NUMERIC(5,4),
  acoustic_anomaly NUMERIC(5,4),
  context_risk NUMERIC(5,4),
  prosody_anomaly NUMERIC(5,4),
  dsp_metrics JSONB DEFAULT '{}',
  quality_flags JSONB DEFAULT '{}',
  model_versions JSONB DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_analysis_call ON analysis_results(call_id);
CREATE INDEX idx_analysis_org ON analysis_results(organization_id);

-- ============================================================================
-- 4. Incidents / alerts / verification / evidence
-- ============================================================================

CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN','INVESTIGATING','CONTAINED','RESOLVED','FALSE_POSITIVE')),
  scope TEXT,
  summary TEXT DEFAULT '',
  owner_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  owner_name TEXT DEFAULT 'Unassigned',
  risk_score INTEGER DEFAULT 0,
  risk_severity TEXT DEFAULT 'LOW',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_incidents_org ON incidents(organization_id);
CREATE INDEX idx_incidents_status ON incidents(status);

CREATE TABLE incident_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  app_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  author_name TEXT DEFAULT '',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_notes_incident ON incident_notes(incident_id);

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  message TEXT NOT NULL,
  trigger_rules JSONB DEFAULT '[]',
  contributing_signals JSONB DEFAULT '[]',
  recommended_action TEXT,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  threat_title TEXT,
  caller_display TEXT,
  phone TEXT,
  risk_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Investigating',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_alerts_org ON alerts(organization_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);

CREATE TABLE verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','REJECTED','ESCALATED','EXPIRED')),
  method TEXT,
  requested_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  caller_display TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE evidence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  manifest JSONB NOT NULL,
  evidence_hash TEXT NOT NULL,
  hash_algorithm TEXT DEFAULT 'SHA-256',
  blockchain_tx TEXT,
  blockchain_network TEXT,
  verified BOOLEAN DEFAULT false,
  caller_display TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_evidence_org ON evidence_records(organization_id);

CREATE TABLE blockchain_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  evidence_id UUID REFERENCES evidence_records(id) ON DELETE SET NULL,
  network TEXT DEFAULT 'polygon-amoy',
  chain_id INTEGER DEFAULT 80002,
  contract_address TEXT,
  tx_hash TEXT,
  block_number INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  actor_name TEXT DEFAULT 'System',
  outcome TEXT DEFAULT 'Success',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_org ON audit_events(organization_id);
CREATE INDEX idx_audit_user ON audit_events(user_id);

-- ============================================================================
-- 5. Models / policy / integrations
-- ============================================================================

CREATE TABLE model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  source_url TEXT,
  version TEXT,
  license TEXT,
  input_format TEXT,
  output_semantics TEXT,
  parameters_count TEXT,
  deployment_status TEXT DEFAULT 'active',
  evaluation_notes TEXT,
  known_limitations TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  deactivated_at TIMESTAMPTZ
);

CREATE TABLE risk_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT DEFAULT 'default',
  thresholds JSONB DEFAULT '{"low":25,"medium":50,"high":75}',
  weights JSONB DEFAULT '{"spoof":40,"speaker":25,"acoustic":20,"context":15}',
  is_active BOOLEAN DEFAULT true,
  verification_threshold INTEGER DEFAULT 75,
  auto_escalation BOOLEAN DEFAULT true,
  sensitivity TEXT DEFAULT 'High (Strict)',
  model_version TEXT DEFAULT 'v3.2 (Latest)',
  band_actions JSONB DEFAULT '{"LOW":"Monitor","MEDIUM":"Review","HIGH":"Alert + verify","CRITICAL":"Escalate + incident"}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active','inactive','error')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 6. Notifications / sessions / security settings
-- ============================================================================

CREATE TABLE notification_preferences (
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

CREATE TABLE notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  condition TEXT DEFAULT '',
  actions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_sessions (
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
CREATE INDEX idx_sessions_user ON user_sessions(app_user_id);

CREATE TABLE login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  email TEXT DEFAULT '',
  ip TEXT DEFAULT '',
  outcome TEXT DEFAULT 'Success',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_login_user ON login_history(app_user_id);

CREATE TABLE mfa_factors (
  app_user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  method TEXT DEFAULT 'totp',
  enabled BOOLEAN DEFAULT false,
  enrolled_at TIMESTAMPTZ
);

CREATE TABLE api_keys (
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
CREATE INDEX idx_api_keys_org ON api_keys(organization_id);

-- ============================================================================
-- 7. Intelligence / analytics / dashboard rollups
-- ============================================================================

CREATE TABLE threat_campaigns (
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

CREATE TABLE analytics_daily (
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

CREATE TABLE pipeline_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  avg_chunk_ms INTEGER DEFAULT 0,
  p95_chunk_ms INTEGER DEFAULT 0,
  inference_ms INTEGER DEFAULT 0,
  ws_uptime_pct NUMERIC(5,2) DEFAULT 100,
  queue_depth INTEGER DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE protected_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sub TEXT DEFAULT '',
  tag TEXT DEFAULT 'Low',
  health INTEGER DEFAULT 100,
  sessions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE dashboard_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  level TEXT DEFAULT 'Low',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 8. Presence (who is online right now, logged in only)
--    Heartbeat API upserts last_seen every ~15s; rows older than 45s are
--    treated as offline by the UI (and pruned by the heartbeat API).
-- ============================================================================

CREATE TABLE presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  app_user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'online' CHECK (status IN ('online','in_call')),
  last_seen TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, app_user_id)
);
CREATE INDEX idx_presence_org ON presence(organization_id);
CREATE INDEX idx_presence_seen ON presence(last_seen);

-- ============================================================================
-- 9. Row Level Security
--    Browsers read via anon/authenticated policies (Supabase Realtime).
--    All writes happen server-side with service_role (bypasses RLS).
-- ============================================================================

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE protected_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_invites ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "browser read app_users" ON app_users FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read oauth" ON oauth_accounts FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read reset_tokens" ON password_reset_tokens FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read orgs" ON organizations FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read profiles" ON profiles FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read members" ON organization_members FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read roles" ON roles FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read calls" ON calls FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read lab_files" ON lab_audio_files FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read analysis" ON analysis_results FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read incidents" ON incidents FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read notes" ON incident_notes FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read alerts" ON alerts FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read verification" ON verification_requests FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read evidence" ON evidence_records FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read blockchain" ON blockchain_registrations FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read audit" ON audit_events FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read models" ON model_registry FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read policies" ON risk_policies FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read integrations" ON integrations FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read notif_prefs" ON notification_preferences FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read notif_rules" ON notification_rules FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read sessions" ON user_sessions FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read login_history" ON login_history FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read mfa" ON mfa_factors FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read api_keys" ON api_keys FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read threats" ON threat_campaigns FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read analytics" ON analytics_daily FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read pipeline" ON pipeline_health FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read lines" ON protected_lines FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read insights" ON dashboard_insights FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read presence" ON presence FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "browser read invites" ON call_invites FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 10. updated_at triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_users_updated_at BEFORE UPDATE ON app_users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER risk_policies_updated_at BEFORE UPDATE ON risk_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER integrations_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 11. Supabase Realtime publication
--     Tables the browser subscribes to (dashboard live feed, live presence,
--     alerts, incidents, evidence). Add them to the realtime publication
--     if it exists.
-- ============================================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE presence;
  ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
  ALTER PUBLICATION supabase_realtime ADD TABLE calls;
  ALTER PUBLICATION supabase_realtime ADD TABLE analysis_results;
  ALTER PUBLICATION supabase_realtime ADD TABLE call_invites;
  ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
  ALTER PUBLICATION supabase_realtime ADD TABLE evidence_records;
EXCEPTION WHEN undefined_object OR duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Done. Run final_seed.sql for demo data.
-- ============================================================================