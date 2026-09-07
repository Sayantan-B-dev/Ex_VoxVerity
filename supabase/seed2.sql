-- VoxVerity seed2 — fills migration-003 tables with demo rows for org Acme Corp.
-- Run AFTER: 001, 002, 003 + seed.sql.
-- Demo login (NextAuth credentials): demo@voxverity.io / VoxVerity123!
-- Idempotent via ON CONFLICT / fixed UUIDs.

-- ============================================================
-- 0. Demo app user (bcrypt for 'VoxVerity123!')
-- ============================================================
INSERT INTO app_users (id, email, name, password_hash, role, email_verified) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'demo@voxverity.io', 'Elena Vasquez', '$2b$12$lV5b/ZXXYmk68u4JPyo/5OfcPFCVddmdSoc89gBYKRXg1KYlUXnoy', 'analyst', true),
  ('a0000000-0000-0000-0000-000000000002', 'owner@voxverity.io', 'Sayantan Bharati', '$2b$12$lV5b/ZXXYmk68u4JPyo/5OfcPFCVddmdSoc89gBYKRXg1KYlUXnoy', 'owner', true)
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

-- Membership in Acme Corp
INSERT INTO organization_members (organization_id, user_id, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'analyst'),
  ('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'owner')
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Profiles mirror (extends seed.sql org)
INSERT INTO profiles (id, email, name, first_name, last_name, role, organization_id, app_user_id, phone, department, job_title, location, language, timezone, theme) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'demo@voxverity.io', 'Elena Vasquez', 'Elena', 'Vasquez', 'analyst', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '+1 415 555 0100', 'Security Operations', 'Threat Analyst', 'Mumbai, IN', 'en', 'Asia/Kolkata', 'dark'),
  ('a0000000-0000-0000-0000-000000000002', 'owner@voxverity.io', 'Sayantan Bharati', 'Sayantan', 'Bharati', 'owner', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', '+91 90000 00000', 'Engineering', 'Owner', 'Kolkata, IN', 'en', 'Asia/Kolkata', 'dark')
ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id, app_user_id = EXCLUDED.app_user_id,
  first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, phone = EXCLUDED.phone,
  department = EXCLUDED.department, job_title = EXCLUDED.job_title, location = EXCLUDED.location;

-- Fix seed.sql calls user_id NULLs (FK still allows NULL; point at demo user)
UPDATE calls SET user_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id = '00000000-0000-0000-0000-000000000001' AND user_id IS NULL;
UPDATE audit_events SET details = details || '{"app_user_id": "a0000000-0000-0000-0000-000000000001"}' WHERE organization_id = '00000000-0000-0000-0000-000000000001';

-- Enrich calls with display columns the frontend renders
UPDATE calls SET caller_display = '“Marcus Chen” (CFO)', phone_number = '+1 415 555 0142', synthetic_label = 'SYNTHETIC_SIGNAL', speaker_similarity = 0.45, outcome = 'Flagged' WHERE id = '10000000-0000-0000-0000-000000000001';
UPDATE calls SET caller_display = '“Priya Nair”', phone_number = '+91 22 5550 8821', synthetic_label = 'NATURAL_SIGNAL', speaker_similarity = 0.96, outcome = 'Verified' WHERE id = '10000000-0000-0000-0000-000000000002';
UPDATE calls SET caller_display = 'Support queue', phone_number = '+1 800 555 0110', synthetic_label = 'UNCERTAIN', speaker_similarity = 0.83, outcome = 'Under Review' WHERE id = '10000000-0000-0000-0000-000000000003';
UPDATE calls SET caller_display = 'Vendor line 7', phone_number = '+1 312 555 0177', synthetic_label = 'REPLAY_SIGNAL', speaker_similarity = 0.71, outcome = 'Under Review' WHERE id = '10000000-0000-0000-0000-000000000004';
UPDATE calls SET caller_display = '“Rohan Mehta”', phone_number = '+91 98765 43210', synthetic_label = 'NATURAL_SIGNAL', speaker_similarity = 0.98, outcome = 'Verified' WHERE id = '10000000-0000-0000-0000-000000000005';

-- Enrich alerts / incidents / evidence display columns
UPDATE alerts SET threat_title = 'Synthetic voice clone', caller_display = '“Marcus Chen” (CFO)', phone = '+1 415 555 0142', risk_score = 91, status = 'Escalated' WHERE id = '40000000-0000-0000-0000-000000000001';
UPDATE alerts SET threat_title = 'Speaker mismatch', caller_display = 'Unknown caller', phone = '+44 20 7946 0318', risk_score = 78, status = 'Investigating' WHERE id = '40000000-0000-0000-0000-000000000002';
UPDATE alerts SET threat_title = 'Voice conversion indicators', caller_display = 'Vendor line 7', phone = '+1 312 555 0177', risk_score = 72, status = 'Acknowledged' WHERE id = '40000000-0000-0000-0000-000000000003';
UPDATE alerts SET threat_title = 'Elevated acoustic anomaly', caller_display = '“Priya Nair”', phone = '+91 22 5550 8821', risk_score = 45, status = 'Acknowledged' WHERE id = '40000000-0000-0000-0000-000000000004';

UPDATE incidents SET summary = 'Caller identified as “Marcus Chen” showed strong synthetic voice signals. No transfer executed.', owner_name = 'Elena Vasquez' WHERE id = '30000000-0000-0000-0000-000000000001';
UPDATE incidents SET summary = 'Unknown caller presented as an approved vendor. Embedding did not match any enrolled profile.', owner_name = 'Unassigned' WHERE id = '30000000-0000-0000-0000-000000000002';
UPDATE incidents SET summary = 'Flag was caused by background noise. Call verified as natural speech.', owner_name = 'Arjun Rao' WHERE id = '30000000-0000-0000-0000-000000000003';

UPDATE evidence_records SET caller_display = '“Marcus Chen” (CFO)' WHERE id = '50000000-0000-0000-0000-000000000001';
UPDATE evidence_records SET caller_display = 'Vendor line 7' WHERE id = '50000000-0000-0000-0000-000000000002';
UPDATE audit_events SET actor_name = 'Elena Vasquez', outcome = 'Success' WHERE id IN ('60000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000003');
UPDATE audit_events SET actor_name = 'System', outcome = 'Success' WHERE id IN ('60000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000004','60000000-0000-0000-0000-000000000006','60000000-0000-0000-0000-000000000007');
UPDATE audit_events SET actor_name = 'System', outcome = 'Success' WHERE id = '60000000-0000-0000-0000-000000000005';

-- ============================================================
-- 1. Roles per org
-- ============================================================
INSERT INTO roles (organization_id, name, description, permissions) VALUES
  ('00000000-0000-0000-0000-000000000001', 'OWNER', 'Full organization administration', '["users.manage","org.manage","policy.manage","audit.read","evidence.manage"]'),
  ('00000000-0000-0000-0000-000000000001', 'ADMIN', 'Users, roles, configuration, integrations', '["users.manage","policy.manage","integrations.manage","audit.read"]'),
  ('00000000-0000-0000-0000-000000000001', 'ANALYST', 'Monitoring, analysis, alerts, incidents, evidence', '["alerts.read","alerts.act","incidents.manage","evidence.manage"]'),
  ('00000000-0000-0000-0000-000000000001', 'OPERATOR', 'Protected user functions, live protection, verification', '["live.start","verification.act"]'),
  ('00000000-0000-0000-0000-000000000001', 'VIEWER', 'Read-only selected views', '["dashboard.read","calls.read"]')
ON CONFLICT DO NOTHING;

UPDATE organizations SET status = 'Active', member_count = 2 WHERE id = '00000000-0000-0000-0000-000000000001';

-- ============================================================
-- 2. Notifications
-- ============================================================
INSERT INTO notification_preferences (app_user_id, organization_id, inapp, email, sms, webhook, severity_threshold, sound_enabled) VALUES
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', true, true, false, false, 'MEDIUM', true),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', true, true, true, true, 'LOW', true)
ON CONFLICT DO NOTHING;

INSERT INTO notification_rules (organization_id, name, condition, actions, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Critical → Slack #vox-secops', 'severity = CRITICAL', '["slack:vox-secops","email:analysts"]', true),
  ('00000000-0000-0000-0000-000000000001', 'High → PagerDuty', 'severity = HIGH', '["pagerduty:sec-oncall"]', false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. Sessions / login history / MFA / API keys
-- ============================================================
INSERT INTO user_sessions (app_user_id, device, browser, ip, location) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'MacBook Pro', 'Chrome 126', '192.168.1.100', 'Mumbai, IN'),
  ('a0000000-0000-0000-0000-000000000002', 'ThinkPad', 'Firefox 127', '10.0.0.8', 'Kolkata, IN')
ON CONFLICT DO NOTHING;

INSERT INTO login_history (app_user_id, email, ip, outcome) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'demo@voxverity.io', '192.168.1.100', 'Success'),
  ('a0000000-0000-0000-0000-000000000001', 'demo@voxverity.io', '203.0.113.45', 'Denied'),
  ('a0000000-0000-0000-0000-000000000002', 'owner@voxverity.io', '10.0.0.8', 'Success')
ON CONFLICT DO NOTHING;

INSERT INTO mfa_factors (app_user_id, method, enabled, enrolled_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'totp', true, now() - interval '30 days'),
  ('a0000000-0000-0000-0000-000000000002', 'totp', false, NULL)
ON CONFLICT (app_user_id) DO UPDATE SET enabled = EXCLUDED.enabled, method = EXCLUDED.method;

INSERT INTO api_keys (organization_id, app_user_id, name, key_hash, key_prefix, permissions) VALUES
  ('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'secops-export', 'sha256:demo-hash-not-a-secret', 'vv_live_9f2c', '["calls.read","alerts.read"]')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. Incident notes + verification requests
-- ============================================================
INSERT INTO incident_notes (incident_id, organization_id, app_user_id, author_name, body) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Elena Vasquez', 'Requested trusted callback to the CFO number on file. Awaiting confirmation.'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Elena Vasquez', 'Vendor claims the IVR prompt changed last week — checking change log.')
ON CONFLICT DO NOTHING;

INSERT INTO verification_requests (organization_id, call_id, status, method, notes) VALUES
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'PENDING', 'Trusted Callback', 'Callback to the approved number on file for the CFO role.'),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'ESCALATED', 'Human Review', 'Escalated to vendor-security team for line audit.')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. Lab files + prosody/notes on analysis
-- ============================================================
INSERT INTO lab_audio_files (id, organization_id, app_user_id, name, duration_sec, sample_rate, channels, size_kb, analyzed) VALUES
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'sample-cfo-clone.wav', 12, 16000, 1, 384, true),
  ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'sample-natural-speech.wav', 9, 16000, 1, 288, true),
  ('70000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'sample-replay-segment.wav', 6, 16000, 1, 192, false)
ON CONFLICT (id) DO NOTHING;

UPDATE analysis_results SET file_id = '70000000-0000-0000-0000-000000000001', prosody_anomaly = 0.69, notes = 'Strong synthetic-signal indicators across all windows.' WHERE id IN ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002');
UPDATE analysis_results SET file_id = '70000000-0000-0000-0000-000000000002', prosody_anomaly = 0.14, notes = 'Natural prosody and spectral pattern.' WHERE id IN ('20000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000004');

-- ============================================================
-- 6. Threats / analytics / lines / insights / policy / integrations
-- ============================================================
INSERT INTO threat_campaigns (organization_id, name, attack, active_sessions, risk, last_seen, indicators) VALUES
  ('00000000-0000-0000-0000-000000000001', 'CEO Voice-Clone Wave', 'Voice cloning / vishing', 4, 88, now() - interval '15 minutes', '["CFO impersonation","New payee requests","Eastern Europe origin"]'),
  ('00000000-0000-0000-0000-000000000001', 'Replay Against Vendor Lines', 'Replay', 2, 61, now() - interval '70 minutes', '["Repeated utterances","Known IVR segments"]'),
  ('00000000-0000-0000-0000-000000000001', 'Conversion on Unknown Numbers', 'Voice conversion', 1, 74, now() - interval '21 minutes', '["Unenrolled speakers","UK numbers"]')
ON CONFLICT DO NOTHING;

INSERT INTO analytics_daily (organization_id, day, calls_total, risk_avg, distribution, volumes) VALUES
  ('00000000-0000-0000-0000-000000000001', CURRENT_DATE - 6, 412, 34, '{"LOW": 280, "MEDIUM": 90, "HIGH": 30, "CRITICAL": 12}', '{"synthetic": 8, "replay": 3, "conversion": 1, "natural": 412}'),
  ('00000000-0000-0000-0000-000000000001', CURRENT_DATE - 1, 388, 57, '{"LOW": 220, "MEDIUM": 110, "HIGH": 40, "CRITICAL": 18}', '{"synthetic": 21, "replay": 6, "conversion": 4, "natural": 388}'),
  ('00000000-0000-0000-0000-000000000001', CURRENT_DATE, 128, 42, '{"LOW": 80, "MEDIUM": 30, "HIGH": 12, "CRITICAL": 6}', '{"synthetic": 5, "replay": 1, "conversion": 1, "natural": 121}')
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_health (organization_id, avg_chunk_ms, p95_chunk_ms, inference_ms, ws_uptime_pct, queue_depth) VALUES
  ('00000000-0000-0000-0000-000000000001', 640, 980, 310, 99.7, 0)
ON CONFLICT DO NOTHING;

INSERT INTO protected_lines (organization_id, name, sub, tag, health, sessions) VALUES
  ('00000000-0000-0000-0000-000000000001', 'CFO Line', 'Executive protection · WebRTC', 'High', 46, 12),
  ('00000000-0000-0000-0000-000000000001', 'Payments Desk', 'UPI & wire approvals · Telephony adapter', 'Medium', 72, 6),
  ('00000000-0000-0000-0000-000000000001', 'Support Queue', 'Customer voice line · Adapter', 'Low', 89, 4)
ON CONFLICT DO NOTHING;

INSERT INTO dashboard_insights (organization_id, title, body, level) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Synthetic voice signal spike', 'Synthetic indicators rose 347% vs baseline in the last 2 hours, concentrated on CFO-line impersonation.', 'Critical'),
  ('00000000-0000-0000-0000-000000000001', 'New campaign — replay on vendor lines', 'Repeated known-IVR segments detected across 2 vendor lines. Recommend quarantining both lines.', 'Medium'),
  ('00000000-0000-0000-0000-000000000001', 'Speaker enrollment gap', '12 protected users have no enrolled voice reference. Enrollments improve verification accuracy.', 'Low')
ON CONFLICT DO NOTHING;

UPDATE risk_policies SET verification_threshold = 75, auto_escalation = true, sensitivity = 'High (Strict)', model_version = 'v3.2 (Latest)',
  band_actions = '{"LOW":"Monitor","MEDIUM":"Review","HIGH":"Alert + verify","CRITICAL":"Escalate + incident"}'
  WHERE organization_id = '00000000-0000-0000-0000-000000000001';

INSERT INTO integrations (organization_id, provider, config, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'slack', '{"name": "Slack", "description": "Alert routing and analyst notifications"}', 'active'),
  ('00000000-0000-0000-0000-000000000001', 'splunk', '{"name": "Splunk", "description": "Audit and evidence log forwarding"}', 'active'),
  ('00000000-0000-0000-0000-000000000001', 'pagerduty', '{"name": "PagerDuty", "description": "On-call escalation for critical alerts"}', 'inactive'),
  ('00000000-0000-0000-0000-000000000001', 'microsoft-teams', '{"name": "Microsoft Teams", "description": "Protected call join via Teams meeting SDK"}', 'inactive')
ON CONFLICT DO NOTHING;
