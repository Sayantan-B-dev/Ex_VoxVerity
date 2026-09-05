-- VoxVerity Seed Data
-- Run AFTER migrations: 001_initial_auth_and_profiles.sql and 002_full_schema.sql
-- This provides demo data so the dashboard is not empty on first login.

-- NOTE: User IDs are left as NULL where they reference auth.users.
-- After you create your first user account, update the NULLs to your user ID.

-- ============================================================
-- 1. Organization (Acme Corp)
-- ============================================================
INSERT INTO organizations (id, name, plan) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Acme Corp', 'free')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Demo Calls
-- ============================================================
INSERT INTO calls (id, organization_id, user_id, source, status, started_at, ended_at, duration_ms, risk_score, risk_severity, alert_count) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', NULL, 'microphone', 'completed', now() - interval '3 hours', now() - interval '2 hours 55 minutes', 300000, 85, 'CRITICAL', 2),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', NULL, 'webrtc', 'completed', now() - interval '1 hour', now() - interval '55 minutes', 300000, 42, 'MEDIUM', 0),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', NULL, 'microphone', 'active', now() - interval '10 minutes', NULL, 600000, 12, 'LOW', 0),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', NULL, 'file', 'completed', now() - interval '1 day', now() - interval '1 day' + interval '2 minutes', 120000, 72, 'HIGH', 1),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', NULL, 'webrtc', 'completed', now() - interval '2 days', now() - interval '2 days' + interval '5 minutes', 300000, 5, 'LOW', 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Demo Analysis Results
-- ============================================================
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

-- ============================================================
-- 4. Demo Incidents
-- ============================================================
INSERT INTO incidents (id, organization_id, status, scope, owner_id, risk_score, risk_severity, created_at, updated_at) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'INVESTIGATING', 'Critical spoof attempt detected in voice call', NULL, 91, 'CRITICAL', now() - interval '2 hours', now() - interval '1 hour'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'OPEN', 'Voice conversion indicators in file upload', NULL, 72, 'HIGH', now() - interval '1 day', now() - interval '1 day'),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'RESOLVED', 'False positive - background noise triggered alert', NULL, 45, 'MEDIUM', now() - interval '3 days', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. Demo Alerts
-- ============================================================
INSERT INTO alerts (id, organization_id, call_id, severity, message, trigger_rules, contributing_signals, recommended_action, acknowledged, acknowledged_at, incident_id, created_at) VALUES

  -- Critical alerts for Call 1
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'CRITICAL',
   'Risk 91/100 — Immediate alert. Escalate to security team.',
   '["spoof_score_above_80", "acoustic_anomaly_above_70"]',
   '[{"signal": "spoof_detection", "score": 0.93, "weight": 0.40}, {"signal": "acoustic_anomaly", "score": 0.78, "weight": 0.20}]',
   'Immediate verification required. Contact security team.',
   false, NULL, '30000000-0000-0000-0000-000000000001', now() - interval '3 hours' + interval '6 minutes'),

  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'HIGH',
   'Risk 78/100 — High spoof signal detected.',
   '["spoof_score_above_70"]',
   '[{"signal": "spoof_detection", "score": 0.82, "weight": 0.40}]',
   'Initiate secondary verification.',
   false, NULL, '30000000-0000-0000-0000-000000000001', now() - interval '3 hours' + interval '3 minutes'),

  -- High alert for Call 4
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'HIGH',
   'Risk 72/100 — Voice conversion indicators detected.',
   '["spoof_score_above_70", "speaker_mismatch"]',
   '[{"signal": "spoof_detection", "score": 0.75, "weight": 0.40}, {"signal": "speaker_similarity", "score": 0.40, "weight": 0.25}]',
   'Verify caller identity through secondary channel.',
   true, now() - interval '1 day' + interval '30 minutes', '30000000-0000-0000-0000-000000000002', now() - interval '1 day' + interval '2 minutes'),

  -- Medium alert for Call 2 (false positive)
  ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'MEDIUM',
   'Risk 45/100 — Elevated acoustic anomaly.',
   '["acoustic_anomaly_above_50"]',
   '[{"signal": "acoustic_anomaly", "score": 0.60, "weight": 0.20}]',
   'Monitor and log for pattern analysis.',
   true, now() - interval '2 days', '30000000-0000-0000-0000-000000000003', now() - interval '1 hour' + interval '5 minutes')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. Demo Evidence Records
-- ============================================================
INSERT INTO evidence_records (id, organization_id, incident_id, call_id, manifest, evidence_hash, hash_algorithm, blockchain_tx, blockchain_network, verified, created_at) VALUES
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   '{"result_id": "20000000-0000-0000-0000-000000000002", "session_id": "10000000-0000-0000-0000-000000000001", "risk_score": 91, "risk_severity": "CRITICAL", "spoof_score": 0.93, "model_versions": {"aasist_l": "v1.0"}, "timestamp": "2026-09-05T10:00:00Z"}',
   'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2', 'SHA-256', NULL, NULL, false,
   now() - interval '3 hours'),

  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004',
   '{"result_id": "20000000-0000-0000-0000-000000000006", "session_id": "10000000-0000-0000-0000-000000000004", "risk_score": 68, "risk_severity": "HIGH", "spoof_score": 0.75, "model_versions": {"aasist_l": "v1.0"}, "timestamp": "2026-09-04T15:30:00Z"}',
   'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3', 'SHA-256', NULL, NULL, false,
   now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. Demo Audit Events
-- ============================================================
INSERT INTO audit_events (id, organization_id, user_id, action, resource_type, resource_id, details, created_at) VALUES
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', NULL, 'session_started', 'call', '10000000-0000-0000-0000-000000000001', '{"source": "microphone"}', now() - interval '3 hours'),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', NULL, 'alert_created', 'alert', '40000000-0000-0000-0000-000000000001', '{"severity": "CRITICAL", "score": 91}', now() - interval '3 hours' + interval '6 minutes'),
  ('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', NULL, 'incident_opened', 'incident', '30000000-0000-0000-0000-000000000001', '{"scope": "Critical spoof attempt"}', now() - interval '2 hours'),
  ('60000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', NULL, 'evidence_registered', 'evidence', '50000000-0000-0000-0000-000000000001', '{"hash_algorithm": "SHA-256"}', now() - interval '3 hours'),
  ('60000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', NULL, 'alert_acknowledged', 'alert', '40000000-0000-0000-0000-000000000003', '{"severity": "HIGH"}', now() - interval '1 day' + interval '30 minutes'),
  ('60000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', NULL, 'session_started', 'call', '10000000-0000-0000-0000-000000000003', '{"source": "microphone"}', now() - interval '10 minutes'),
  ('60000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', NULL, 'model_loaded', 'model', NULL, '{"model_id": "AASIST-L", "version": "v1.0"}', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. Risk Policy
-- ============================================================
INSERT INTO risk_policies (organization_id, name, thresholds, weights, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'default',
   '{"low": 25, "medium": 50, "high": 75}',
   '{"spoof": 40, "speaker": 25, "acoustic": 20, "context": 15}',
   true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9. Model Registry
-- ============================================================
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

-- ============================================================
-- 10. Integrations (stubs)
-- ============================================================
INSERT INTO integrations (organization_id, provider, config, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'twilio', '{"name": "Twilio Media Streams", "description": "Telephony adapter"}', 'inactive'),
  ('00000000-0000-0000-0000-000000000001', 'zoom', '{"name": "Zoom Meeting SDK", "description": "Video meeting integration"}', 'inactive'),
  ('00000000-0000-0000-0000-000000000001', 'microsoft-teams', '{"name": "Microsoft Teams", "description": "Teams meeting integration"}', 'inactive')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Done! After running this, your dashboard will show:
--   - 5 demo calls with different risk levels
--   - 7 analysis results across those calls
--   - 3 incidents (investigating, open, resolved)
--   - 4 alerts (critical, high, medium)
--   - 2 evidence records with SHA-256 hashes
--   - 7 audit events
--   - 2 models in registry
--   - 3 integration stubs
-- ============================================================
