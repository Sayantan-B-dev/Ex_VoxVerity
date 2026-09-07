-- ============================================================================
-- VoxVerity final_seed.sql — one-file demo seed
-- Run AFTER reset.sql + full_schema.sql (migrations folder).
-- Replaces the old seed.sql + seed2.sql.
--   Demo login (NextAuth credentials): demo@voxverity.io / VoxVerity123!
--   Second user (owner):                owner@voxverity.io / VoxVerity123!
-- Idempotent via fixed UUIDs / ON CONFLICT (see note at the end).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Drop legacy profiles.id FK (if an old migration 001 left it pointing at
--    auth.users). In the current schema profiles.id has NO foreign key on
--    purpose: app inserts use a generated UUID, seeds use the app_user id.
--    Dropping a non-existent constraint is a harmless no-op.
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
END $$;

-- ----------------------------------------------------------------------------
-- 1. Organization (Acme Corp)
-- ----------------------------------------------------------------------------
INSERT INTO organizations (id, name, plan, status, member_count) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Acme Corp', 'free', 'Active', 2)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, member_count = EXCLUDED.member_count;

-- ----------------------------------------------------------------------------
-- 2. App users (NextAuth DB-only identity)
-- ----------------------------------------------------------------------------
INSERT INTO app_users (id, email, name, password_hash, role, email_verified) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'demo@voxverity.io', 'Elena Vasquez', '$2b$12$lV5b/ZXXYmk68u4JPyo/5OfcPFCVddmdSoc89gBYKRXg1KYlUXnoy', 'analyst', true),
  ('a0000000-0000-0000-0000-000000000002', 'owner@voxverity.io', 'Sayantan Bharati', '$2b$12$lV5b/ZXXYmk68u4JPyo/5OfcPFCVddmdSoc89gBYKRXg1KYlUXnoy', 'owner', true)
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

-- ----------------------------------------------------------------------------
-- 3. Organization membership
-- ----------------------------------------------------------------------------
INSERT INTO organization_members (organization_id, user_id, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'analyst'),
  ('00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'owner')
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. Profiles (mirror of app_users; id == app_users.id)
-- ----------------------------------------------------------------------------
INSERT INTO profiles (id, email, name, first_name, last_name, role, organization_id, app_user_id, phone, department, job_title, location, language, timezone, theme) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'demo@voxverity.io', 'Elena Vasquez', 'Elena', 'Vasquez', 'analyst', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '+1 415 555 0100', 'Security Operations', 'Threat Analyst', 'Mumbai, IN', 'en', 'Asia/Kolkata', 'dark'),
  ('a0000000-0000-0000-0000-000000000002', 'owner@voxverity.io', 'Sayantan Bharati', 'Sayantan', 'Bharati', 'owner', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', '+91 90000 00000', 'Engineering', 'Owner', 'Kolkata, IN', 'en', 'Asia/Kolkata', 'dark')
ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id, app_user_id = EXCLUDED.app_user_id,
  first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, phone = EXCLUDED.phone,
  department = EXCLUDED.department, job_title = EXCLUDED.job_title, location = EXCLUDED.location;

-- ----------------------------------------------------------------------------
-- 5. Calls (enriched display columns baked in; user_id = demo analyst)
-- ----------------------------------------------------------------------------
INSERT INTO calls (id, organization_id, user_id, source, status, started_at, ended_at, duration_ms, risk_score, risk_severity, alert_count, caller_display, phone_number, synthetic_label, speaker_similarity, outcome) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'microphone', 'completed', now() - interval '3 hours', now() - interval '2 hours 55 minutes', 300000, 85, 'CRITICAL', 2, '“Marcus Chen” (CFO)', '+1 415 555 0142', 'SYNTHETIC_SIGNAL', 0.45, 'Flagged'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'webrtc', 'completed', now() - interval '1 hour', now() - interval '55 minutes', 300000, 42, 'MEDIUM', 0, '“Priya Nair”', '+91 22 5550 8821', 'NATURAL_SIGNAL', 0.96, 'Verified'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'microphone', 'active', now() - interval '10 minutes', NULL, 600000, 12, 'LOW', 0, 'Support queue', '+1 800 555 0110', 'UNCERTAIN', 0.83, 'Under Review'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'file', 'completed', now() - interval '1 day', now() - interval '1 day' + interval '2 minutes', 120000, 72, 'HIGH', 1, 'Vendor line 7', '+1 312 555 0177', 'REPLAY_SIGNAL', 0.71, 'Under Review'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'webrtc', 'completed', now() - interval '2 days', now() - interval '2 days' + interval '5 minutes', 300000, 5, 'LOW', 0, '“Rohan Mehta”', '+91 98765 43210', 'NATURAL_SIGNAL', 0.98, 'Verified')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. Analysis results (per-3s-chunk demo rows)
-- ----------------------------------------------------------------------------
INSERT INTO analysis_results (id, call_id, organization_id, chunk_sequence, risk_score, risk_severity, spoof_score, speaker_similarity, acoustic_anomaly, context_risk, dsp_metrics, quality_flags, model_versions) VALUES

  -- Call 1: Critical (spoofed audio detected)
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 1, 78, 'HIGH', 0.82, 0.31, 0.65, 0.40,
    '{"rms_energy": 0.045, "dbfs": -26.9, "peak_amplitude": 0.12, "clipping_ratio": 0.0, "zero_crossing_rate": 0.08, "silence_ratio": 0.15, "spectral_centroid_hz": 1850, "crest_factor": 2.67, "dynamic_range_db": 22.3, "duration_s": 3.0}',
    '{"low_energy": false, "clipping": false, "high_silence": false}',
    '{"aasist_l": {"model": "AASIST-L", "version": "v1.0"}, "ecapa_tdnn": {"model": "ECAPA-TDNN", "version": "v1.0"}}'),

  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 2, 91, 'CRITICAL', 0.93, 0.22, 0.78, 0.55,
    '{"rms_energy": 0.062, "dbfs": -24.1, "peak_amplitude": 0.18, "clipping_ratio": 0.02, "zero_crossing_rate": 0.12, "silence_ratio": 0.08, "spectral_centroid_hz": 2200, "crest_factor": 2.90, "dynamic_range_db": 18.7, "duration_s": 3.0}',
    '{"low_energy": false, "clipping": true, "high_silence": false}',
    '{"aasist_l": {"model": "AASIST-L", "version": "v1.0"}, "ecapa_tdnn": {"model": "ECAPA-TDNN", "version": "v1.0"}}'),

  -- Call 2: Medium (elevated acoustic anomaly)
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 1, 38, 'MEDIUM', 0.25, 0.78, 0.55, 0.30,
    '{"rms_energy": 0.038, "dbfs": -28.4, "peak_amplitude": 0.09, "clipping_ratio": 0.0, "zero_crossing_rate": 0.06, "silence_ratio": 0.22, "spectral_centroid_hz": 1650, "crest_factor": 2.37, "dynamic_range_db": 25.1, "duration_s": 3.0}',
    '{"low_energy": false, "clipping": false, "high_silence": false}',
    '{"aasist_l": {"model": "AASIST-L", "version": "v1.0"}, "ecapa_tdnn": {"model": "ECAPA-TDNN", "version": "v1.0"}}'),

  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 2, 45, 'MEDIUM', 0.30, 0.75, 0.60, 0.35,
    '{"rms_energy": 0.041, "dbfs": -27.7, "peak_amplitude": 0.11, "clipping_ratio": 0.0, "zero_crossing_rate": 0.07, "silence_ratio": 0.18, "spectral_centroid_hz": 1720, "crest_factor": 2.68, "dynamic_range_db": 23.4, "duration_s": 3.0}',
    '{"low_energy": false, "clipping": false, "high_silence": false}',
    '{"aasist_l": {"model": "AASIST-L", "version": "v1.0"}, "ecapa_tdnn": {"model": "ECAPA-TDNN", "version": "v1.0"}}'),

  -- Call 3: Low (clean audio)
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 1, 8, 'LOW', 0.05, 0.95, 0.12, 0.10,
    '{"rms_energy": 0.055, "dbfs": -25.2, "peak_amplitude": 0.15, "clipping_ratio": 0.0, "zero_crossing_rate": 0.05, "silence_ratio": 0.25, "spectral_centroid_hz": 1500, "crest_factor": 2.73, "dynamic_range_db": 28.5, "duration_s": 3.0}',
    '{"low_energy": false, "clipping": false, "high_silence": false}',
    '{"aasist_l": {"model": "AASIST-L", "version": "v1.0"}, "ecapa_tdnn": {"model": "ECAPA-TDNN", "version": "v1.0"}}'),

  -- Call 4: High (voice conversion indicators)
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 1, 68, 'HIGH', 0.75, 0.40, 0.70, 0.45,
    '{"rms_energy": 0.050, "dbfs": -26.0, "peak_amplitude": 0.14, "clipping_ratio": 0.01, "zero_crossing_rate": 0.10, "silence_ratio": 0.12, "spectral_centroid_hz": 2050, "crest_factor": 2.80, "dynamic_range_db": 20.1, "duration_s": 3.0}',
    '{"low_energy": false, "clipping": false, "high_silence": false}',
    '{"aasist_l": {"model": "AASIST-L", "version": "v1.0"}, "ecapa_tdnn": {"model": "ECAPA-TDNN", "version": "v1.0"}}'),

  -- Call 5: Low (normal call)
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 1, 5, 'LOW', 0.03, 0.97, 0.08, 0.05,
    '{"rms_energy": 0.048, "dbfs": -26.4, "peak_amplitude": 0.13, "clipping_ratio": 0.0, "zero_crossing_rate": 0.05, "silence_ratio": 0.28, "spectral_centroid_hz": 1480, "crest_factor": 2.71, "dynamic_range_db": 29.2, "duration_s": 3.0}',
    '{"low_energy": false, "clipping": false, "high_silence": false}',
    '{"aasist_l": {"model": "AASIST-L", "version": "v1.0"}, "ecapa_tdnn": {"model": "ECAPA-TDNN", "version": "v1.0"}}')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. Incidents (enriched)
-- ----------------------------------------------------------------------------
INSERT INTO incidents (id, organization_id, status, scope, owner_id, risk_score, risk_severity, summary, owner_name, created_at, updated_at) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'INVESTIGATING', 'Critical spoof attempt detected in voice call', 'a0000000-0000-0000-0000-000000000001', 91, 'CRITICAL', 'Caller identified as “Marcus Chen” showed strong synthetic voice signals. No transfer executed.', 'Elena Vasquez', now() - interval '2 hours', now() - interval '1 hour'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'OPEN', 'Voice conversion indicators in file upload', NULL, 72, 'HIGH', 'Unknown caller presented as an approved vendor. Embedding did not match any enrolled profile.', 'Unassigned', now() - interval '1 day', now() - interval '1 day'),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'RESOLVED', 'False positive - background noise triggered alert', NULL, 45, 'MEDIUM', 'Flag was caused by background noise. Call verified as natural speech.', 'Arjun Rao', now() - interval '3 days', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 8. Alerts (enriched)
-- ----------------------------------------------------------------------------
INSERT INTO alerts (id, organization_id, call_id, severity, message, trigger_rules, contributing_signals, recommended_action, acknowledged, acknowledged_at, incident_id, threat_title, caller_display, phone, risk_score, status, created_at) VALUES

  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'CRITICAL',
   'Risk 91/100 — Immediate alert. Escalate to security team.',
   '["spoof_score_above_80", "acoustic_anomaly_above_70"]',
   '[{"signal": "spoof_detection", "score": 0.93, "weight": 0.40}, {"signal": "acoustic_anomaly", "score": 0.78, "weight": 0.20}]',
   'Immediate verification required. Contact security team.',
   false, NULL, '30000000-0000-0000-0000-000000000001',
   'Synthetic voice clone', '“Marcus Chen” (CFO)', '+1 415 555 0142', 91, 'Escalated',
   now() - interval '3 hours' + interval '6 minutes'),

  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'HIGH',
   'Risk 78/100 — High spoof signal detected.',
   '["spoof_score_above_70"]',
   '[{"signal": "spoof_detection", "score": 0.82, "weight": 0.40}]',
   'Initiate secondary verification.',
   false, NULL, '30000000-0000-0000-0000-000000000001',
   'Synthetic voice clone', '“Marcus Chen” (CFO)', '+1 415 555 0142', 78, 'Investigating',
   now() - interval '3 hours' + interval '3 minutes'),

  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'HIGH',
   'Risk 72/100 — Voice conversion indicators detected.',
   '["spoof_score_above_70", "speaker_mismatch"]',
   '[{"signal": "spoof_detection", "score": 0.75, "weight": 0.40}, {"signal": "speaker_similarity", "score": 0.40, "weight": 0.25}]',
   'Verify caller identity through secondary channel.',
   true, now() - interval '1 day' + interval '30 minutes', '30000000-0000-0000-0000-000000000002',
   'Voice conversion indicators', 'Vendor line 7', '+1 312 555 0177', 72, 'Acknowledged',
   now() - interval '1 day' + interval '2 minutes'),

  ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'MEDIUM',
   'Risk 45/100 — Elevated acoustic anomaly.',
   '["acoustic_anomaly_above_50"]',
   '[{"signal": "acoustic_anomaly", "score": 0.60, "weight": 0.20}]',
   'Monitor and log for pattern analysis.',
   true, now() - interval '2 days', '30000000-0000-0000-0000-000000000003',
   'Elevated acoustic anomaly', '“Priya Nair”', '+91 22 5550 8821', 45, 'Acknowledged',
   now() - interval '1 hour' + interval '5 minutes')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 9. Evidence records (blockchain fingerprint targets)
-- ----------------------------------------------------------------------------
INSERT INTO evidence_records (id, organization_id, incident_id, call_id, manifest, evidence_hash, hash_algorithm, blockchain_tx, blockchain_network, verified, caller_display, created_at) VALUES
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   '{"result_id": "20000000-0000-0000-0000-000000000002", "session_id": "10000000-0000-0000-0000-000000000001", "risk_score": 91, "risk_severity": "CRITICAL", "spoof_score": 0.93, "model_versions": {"aasist_l": "v1.0"}, "timestamp": "2026-09-05T10:00:00Z"}',
   'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2', 'SHA-256', NULL, NULL, false, '“Marcus Chen” (CFO)',
   now() - interval '3 hours'),

  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004',
   '{"result_id": "20000000-0000-0000-0000-000000000006", "session_id": "10000000-0000-0000-0000-000000000004", "risk_score": 68, "risk_severity": "HIGH", "spoof_score": 0.75, "model_versions": {"aasist_l": "v1.0"}, "timestamp": "2026-09-04T15:30:00Z"}',
   'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3', 'SHA-256', NULL, NULL, false, 'Vendor line 7',
   now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 10. Audit events (enriched)
-- ----------------------------------------------------------------------------
INSERT INTO audit_events (id, organization_id, user_id, action, resource_type, resource_id, details, actor_name, outcome, created_at) VALUES
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'session_started', 'call', '10000000-0000-0000-0000-000000000001', '{"source": "microphone"}', 'Elena Vasquez', 'Success', now() - interval '3 hours'),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', NULL, 'alert_created', 'alert', '40000000-0000-0000-0000-000000000001', '{"severity": "CRITICAL", "score": 91}', 'System', 'Success', now() - interval '3 hours' + interval '6 minutes'),
  ('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'incident_opened', 'incident', '30000000-0000-0000-0000-000000000001', '{"scope": "Critical spoof attempt"}', 'Elena Vasquez', 'Success', now() - interval '2 hours'),
  ('60000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', NULL, 'evidence_registered', 'evidence', '50000000-0000-0000-0000-000000000001', '{"hash_algorithm": "SHA-256"}', 'System', 'Success', now() - interval '3 hours'),
  ('60000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', NULL, 'alert_acknowledged', 'alert', '40000000-0000-0000-0000-000000000003', '{"severity": "HIGH"}', 'System', 'Success', now() - interval '1 day' + interval '30 minutes'),
  ('60000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'session_started', 'call', '10000000-0000-0000-0000-000000000003', '{"source": "microphone"}', 'System', 'Success', now() - interval '10 minutes'),
  ('60000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', NULL, 'model_loaded', 'model', NULL, '{"model_id": "AASIST-L", "version": "v1.0"}', 'System', 'Success', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 11. Risk policy + model registry
-- ----------------------------------------------------------------------------
INSERT INTO risk_policies (organization_id, name, thresholds, weights, is_active, verification_threshold, auto_escalation, sensitivity, model_version, band_actions) VALUES
  ('00000000-0000-0000-0000-000000000001', 'default',
   '{"low": 25, "medium": 50, "high": 75}',
   '{"spoof": 40, "speaker": 25, "acoustic": 20, "context": 15}',
   true, 75, true, 'High (Strict)', 'v3.2 (Latest)',
   '{"LOW":"Monitor","MEDIUM":"Review","HIGH":"Alert + verify","CRITICAL":"Escalate + incident"}')
ON CONFLICT DO NOTHING;

INSERT INTO model_registry (model_id, name, source_url, version, license, input_format, output_semantics, parameters_count, deployment_status, evaluation_notes, known_limitations) VALUES
  ('AASIST-L', 'Audio Anti-Spoofing Transformer',
   'https://huggingface.co/SpeechAntiSpoofingBenchmarks/AASIST-L',
   'v1.0', 'MIT', 'Raw waveform 16kHz mono',
   'Higher score = more bona fide. Range 0-1.',
   '85K', 'active',
   'Strong in-domain on ASVspoof2019 LA. Out-of-domain performance degrades.',
   'Not calibrated for universal spoof detection. Do not treat as probability.'),

  ('ECAPA-TDNN', 'Speaker Embedding Network',
   'https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb',
   'v1.0', 'Apache-2.0', '16kHz mono waveform',
   'Speaker embedding vector (192-dim). Cosine similarity for comparison.',
   '6.2M', 'active',
   'Good for same-language speaker verification. Cross-language reduces accuracy.',
   'Not identity proof. Channel/noise/domain affect similarity scores.')
ON CONFLICT (model_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 12. Roles (global templates + Acme Corp)
-- ----------------------------------------------------------------------------
INSERT INTO roles (organization_id, name, description, permissions) VALUES
  (NULL, 'OWNER', 'Full organization administration', '["users.manage","org.manage","policy.manage","audit.read","evidence.manage"]'),
  (NULL, 'ADMIN', 'Users, roles, configuration, integrations', '["users.manage","policy.manage","integrations.manage","audit.read"]'),
  (NULL, 'ANALYST', 'Monitoring, analysis, alerts, incidents, evidence', '["alerts.read","alerts.act","incidents.manage","evidence.manage"]'),
  (NULL, 'OPERATOR', 'Protected user functions, live protection, verification', '["live.start","verification.act"]'),
  (NULL, 'VIEWER', 'Read-only selected views', '["dashboard.read","calls.read"]'),
  ('00000000-0000-0000-0000-000000000001', 'OWNER', 'Full organization administration', '["users.manage","org.manage","policy.manage","audit.read","evidence.manage"]'),
  ('00000000-0000-0000-0000-000000000001', 'ADMIN', 'Users, roles, configuration, integrations', '["users.manage","policy.manage","integrations.manage","audit.read"]'),
  ('00000000-0000-0000-0000-000000000001', 'ANALYST', 'Monitoring, analysis, alerts, incidents, evidence', '["alerts.read","alerts.act","incidents.manage","evidence.manage"]'),
  ('00000000-0000-0000-0000-000000000001', 'OPERATOR', 'Protected user functions, live protection, verification', '["live.start","verification.act"]'),
  ('00000000-0000-0000-0000-000000000001', 'VIEWER', 'Read-only selected views', '["dashboard.read","calls.read"]')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 13. Notifications
-- ----------------------------------------------------------------------------
INSERT INTO notification_preferences (app_user_id, organization_id, inapp, email, sms, webhook, severity_threshold, sound_enabled) VALUES
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', true, true, false, false, 'MEDIUM', true),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', true, true, true, true, 'LOW', true)
ON CONFLICT DO NOTHING;

INSERT INTO notification_rules (organization_id, name, condition, actions, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Critical → Slack #vox-secops', 'severity = CRITICAL', '["slack:vox-secops","email:analysts"]', true),
  ('00000000-0000-0000-0000-000000000001', 'High → PagerDuty', 'severity = HIGH', '["pagerduty:sec-oncall"]', false)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 14. Sessions / login history / MFA / API keys
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 15. Incident notes + verification requests
-- ----------------------------------------------------------------------------
INSERT INTO incident_notes (incident_id, organization_id, app_user_id, author_name, body) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Elena Vasquez', 'Requested trusted callback to the CFO number on file. Awaiting confirmation.'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Elena Vasquez', 'Vendor claims the IVR prompt changed last week — checking change log.')
ON CONFLICT DO NOTHING;

INSERT INTO verification_requests (organization_id, call_id, status, method, notes) VALUES
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'PENDING', 'Trusted Callback', 'Callback to the approved number on file for the CFO role.'),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'ESCALATED', 'Human Review', 'Escalated to vendor-security team for line audit.')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 16. Analysis Lab files
-- ----------------------------------------------------------------------------
INSERT INTO lab_audio_files (id, organization_id, app_user_id, name, duration_sec, sample_rate, channels, size_kb, analyzed) VALUES
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'sample-cfo-clone.wav', 12, 16000, 1, 384, true),
  ('70000000-0000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'sample-natural-speech.wav', 9, 16000, 1, 288, true),
  ('70000000-0000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'sample-replay-segment.wav', 6, 16000, 1, 192, false)

-- Lab file linkage + prosody/notes (Analysis Lab) — AFTER lab files exist (FK)
UPDATE analysis_results SET file_id = '70000000-0000-0000-0000-000000000001', prosody_anomaly = 0.69, notes = 'Strong synthetic-signal indicators across all windows.' WHERE id IN ('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002');
UPDATE analysis_results SET file_id = '70000000-0000-0000-0000-000000000002', prosody_anomaly = 0.14, notes = 'Natural prosody and spectral pattern.' WHERE id IN ('20000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000004');
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 17. Threats / analytics / pipeline / lines / insights
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 18. Integrations (stubs — twilio/zoom/teams from seed.sql + secops set from seed2)
-- ----------------------------------------------------------------------------
INSERT INTO integrations (organization_id, provider, config, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'twilio', '{"name": "Twilio Media Streams", "description": "Telephony adapter"}', 'inactive'),
  ('00000000-0000-0000-0000-000000000001', 'zoom', '{"name": "Zoom Meeting SDK", "description": "Video meeting integration"}', 'inactive'),
  ('00000000-0000-0000-0000-000000000001', 'microsoft-teams', '{"name": "Microsoft Teams", "description": "Protected call join via Teams meeting SDK"}', 'inactive'),
  ('00000000-0000-0000-0000-000000000001', 'slack', '{"name": "Slack", "description": "Alert routing and analyst notifications"}', 'active'),
  ('00000000-0000-0000-0000-000000000001', 'splunk', '{"name": "Splunk", "description": "Audit and evidence log forwarding"}', 'active'),
  ('00000000-0000-0000-0000-000000000001', 'pagerduty', '{"name": "PagerDuty", "description": "On-call escalation for critical alerts"}', 'inactive')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Done! Demo data: 2 users, 5 calls, 7 chunk-level analysis results,
-- 3 incidents, 4 alerts, 2 evidence records, 7 audit events, risk policy,
-- 2 models, 10 roles, notifications, sessions, lab files, threats, insights.
-- Re-run safe: fixed UUIDs / ON CONFLICT. Tables without unique keys
-- (integrations, sessions, notes, insights, ...) will append rows if re-run.
-- ============================================================================