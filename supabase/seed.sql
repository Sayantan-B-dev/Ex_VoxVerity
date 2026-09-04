-- VoxVerity Demo Seed Data
-- Run after 002_full_schema.sql

-- Note: User-specific data (calls, alerts, etc.) should be created
-- through the application after signing in. This seed provides
-- reference data only.

-- Demo calls (will need real user_id and organization_id)
-- Uncomment and replace IDs after creating a test user:

/*
INSERT INTO calls (organization_id, user_id, source, status, risk_score, risk_severity, alert_count, duration_ms) VALUES
  ('00000000-0000-0000-0000-000000000001', 'YOUR_USER_ID', 'webrtc', 'completed', 42, 'MEDIUM', 0, 272000),
  ('00000000-0000-0000-0000-000000000001', 'YOUR_USER_ID', 'webrtc', 'completed', 62, 'HIGH', 1, 728000),
  ('00000000-0000-0000-0000-000000000001', 'YOUR_USER_ID', 'microphone', 'completed', 85, 'CRITICAL', 1, 135000);
*/
