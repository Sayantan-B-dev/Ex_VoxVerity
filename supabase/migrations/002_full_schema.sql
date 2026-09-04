-- VoxVerity Full Database Schema
-- Run in Supabase SQL Editor after 001_initial_auth_and_profiles.sql

-- ============================================================
-- 1. Organizations
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. Organization Members
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'operator' CHECK (role IN ('owner','admin','analyst','operator','viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- ============================================================
-- 3. Calls / Sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  source TEXT DEFAULT 'webrtc' CHECK (source IN ('webrtc','microphone','display_audio','file','telephony_adapter')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','failed')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER,
  risk_score INTEGER DEFAULT 0,
  risk_severity TEXT DEFAULT 'LOW' CHECK (risk_severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  alert_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. Analysis Results
-- ============================================================
CREATE TABLE IF NOT EXISTS analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  chunk_sequence INTEGER,
  risk_score INTEGER DEFAULT 0,
  risk_severity TEXT DEFAULT 'LOW',
  spoof_score NUMERIC(5,4),
  speaker_similarity NUMERIC(5,4),
  acoustic_anomaly NUMERIC(5,4),
  context_risk NUMERIC(5,4),
  dsp_metrics JSONB DEFAULT '{}',
  quality_flags JSONB DEFAULT '{}',
  model_versions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. Alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  message TEXT NOT NULL,
  trigger_rules JSONB DEFAULT '[]',
  contributing_signals JSONB DEFAULT '[]',
  recommended_action TEXT,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  incident_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. Incidents
-- ============================================================
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN','INVESTIGATING','CONTAINED','RESOLVED','FALSE_POSITIVE')),
  scope TEXT,
  owner_id UUID REFERENCES auth.users(id),
  risk_score INTEGER DEFAULT 0,
  risk_severity TEXT DEFAULT 'LOW',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Link alerts to incidents
ALTER TABLE alerts ADD CONSTRAINT fk_alert_incident
  FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE SET NULL;

-- ============================================================
-- 7. Verification Requests
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','REJECTED','ESCALATED','EXPIRED')),
  method TEXT,
  requested_by UUID REFERENCES auth.users(id),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 8. Evidence Records
-- ============================================================
CREATE TABLE IF NOT EXISTS evidence_records (
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
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 9. Audit Events
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 10. Model Registry
-- ============================================================
CREATE TABLE IF NOT EXISTS model_registry (
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

-- ============================================================
-- 11. Risk Policies
-- ============================================================
CREATE TABLE IF NOT EXISTS risk_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT DEFAULT 'default',
  thresholds JSONB DEFAULT '{"low":25,"medium":50,"high":75}',
  weights JSONB DEFAULT '{"spoof":40,"speaker":25,"acoustic":20,"context":15}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 12. Integrations
-- ============================================================
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active','inactive','error')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 13. Blockchain Registrations
-- ============================================================
CREATE TABLE IF NOT EXISTS blockchain_registrations (
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

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_calls_org ON calls(organization_id);
CREATE INDEX idx_calls_user ON calls(user_id);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_analysis_call ON analysis_results(call_id);
CREATE INDEX idx_analysis_org ON analysis_results(organization_id);
CREATE INDEX idx_alerts_org ON alerts(organization_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_incidents_org ON incidents(organization_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_audit_org ON audit_events(organization_id);
CREATE INDEX idx_audit_user ON audit_events(user_id);
CREATE INDEX idx_evidence_org ON evidence_records(organization_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_registrations ENABLE ROW LEVEL SECURITY;

-- Helper: get user's organization IDs
CREATE OR REPLACE FUNCTION user_org_ids()
RETURNS SETOF UUID AS $$
  SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Organizations: members can read their org
CREATE POLICY "Members can view org" ON organizations
  FOR SELECT USING (id IN (SELECT user_org_ids()));

-- Organization Members: members can view their org's members
CREATE POLICY "Members can view org members" ON organization_members
  FOR SELECT USING (organization_id IN (SELECT user_org_ids()));

-- Calls: org-scoped
CREATE POLICY "Org members can view calls" ON calls
  FOR SELECT USING (organization_id IN (SELECT user_org_ids()));
CREATE POLICY "Org members can insert calls" ON calls
  FOR INSERT WITH CHECK (organization_id IN (SELECT user_org_ids()));
CREATE POLICY "Org members can update calls" ON calls
  FOR UPDATE USING (organization_id IN (SELECT user_org_ids()));

-- Analysis Results: org-scoped
CREATE POLICY "Org members can view analysis" ON analysis_results
  FOR SELECT USING (organization_id IN (SELECT user_org_ids()));
CREATE POLICY "Org members can insert analysis" ON analysis_results
  FOR INSERT WITH CHECK (organization_id IN (SELECT user_org_ids()));

-- Alerts: org-scoped
CREATE POLICY "Org members can view alerts" ON alerts
  FOR SELECT USING (organization_id IN (SELECT user_org_ids()));
CREATE POLICY "Org members can insert alerts" ON alerts
  FOR INSERT WITH CHECK (organization_id IN (SELECT user_org_ids()));
CREATE POLICY "Org members can update alerts" ON alerts
  FOR UPDATE USING (organization_id IN (SELECT user_org_ids()));

-- Incidents: org-scoped
CREATE POLICY "Org members can view incidents" ON incidents
  FOR SELECT USING (organization_id IN (SELECT user_org_ids()));
CREATE POLICY "Org members can insert incidents" ON incidents
  FOR INSERT WITH CHECK (organization_id IN (SELECT user_org_ids()));
CREATE POLICY "Org members can update incidents" ON incidents
  FOR UPDATE USING (organization_id IN (SELECT user_org_ids()));

-- Verification Requests: org-scoped
CREATE POLICY "Org members can view verifications" ON verification_requests
  FOR SELECT USING (organization_id IN (SELECT user_org_ids()));
CREATE POLICY "Org members can insert verifications" ON verification_requests
  FOR INSERT WITH CHECK (organization_id IN (SELECT user_org_ids()));
CREATE POLICY "Org members can update verifications" ON verification_requests
  FOR UPDATE USING (organization_id IN (SELECT user_org_ids()));

-- Evidence Records: org-scoped
CREATE POLICY "Org members can view evidence" ON evidence_records
  FOR SELECT USING (organization_id IN (SELECT user_org_ids()));
CREATE POLICY "Org members can insert evidence" ON evidence_records
  FOR INSERT WITH CHECK (organization_id IN (SELECT user_org_ids()));

-- Audit Events: org-scoped read, insert only
CREATE POLICY "Org members can view audit" ON audit_events
  FOR SELECT USING (organization_id IN (SELECT user_org_ids()));
CREATE POLICY "Org members can insert audit" ON audit_events
  FOR INSERT WITH CHECK (organization_id IN (SELECT user_org_ids()));

-- Model Registry: read for all authenticated, admin write
CREATE POLICY "Authenticated can view models" ON model_registry
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Risk Policies: org-scoped
CREATE POLICY "Org members can view policies" ON risk_policies
  FOR SELECT USING (organization_id IN (SELECT user_org_ids()));
CREATE POLICY "Org members can manage policies" ON risk_policies
  FOR ALL USING (organization_id IN (SELECT user_org_ids()));

-- Integrations: org-scoped
CREATE POLICY "Org members can view integrations" ON integrations
  FOR SELECT USING (organization_id IN (SELECT user_org_ids()));
CREATE POLICY "Org members can manage integrations" ON integrations
  FOR ALL USING (organization_id IN (SELECT user_org_ids()));

-- Blockchain Registrations: org-scoped
CREATE POLICY "Org members can view blockchain" ON blockchain_registrations
  FOR SELECT USING (organization_id IN (SELECT user_org_ids()));
CREATE POLICY "Org members can insert blockchain" ON blockchain_registrations
  FOR INSERT WITH CHECK (organization_id IN (SELECT user_org_ids()));

-- ============================================================
-- SEED: Default organization and membership
-- ============================================================
INSERT INTO organizations (id, name, plan) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Acme Corp', 'free')
ON CONFLICT (id) DO NOTHING;

-- Seed risk policy
INSERT INTO risk_policies (organization_id, name, thresholds, weights) VALUES
  ('00000000-0000-0000-0000-000000000001', 'default',
   '{"low":25,"medium":50,"high":75}',
   '{"spoof":40,"speaker":25,"acoustic":20,"context":15}')
ON CONFLICT DO NOTHING;

-- Seed model registry
INSERT INTO model_registry (model_id, name, source_url, version, license, parameters_count, deployment_status) VALUES
  ('AASIST-L', 'Audio Anti-Spoofing', 'https://huggingface.co/SpeechAntiSpoofingBenchmarks/AASIST-L', 'v1.0', 'MIT', '85K', 'active'),
  ('ECAPA-TDNN', 'Speaker Embeddings', 'https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb', 'v1.0', 'Apache-2.0', '6.2M', 'active')
ON CONFLICT (model_id) DO NOTHING;

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER risk_policies_updated_at BEFORE UPDATE ON risk_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER integrations_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;
