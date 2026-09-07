-- ============================================================================
-- VoxVerity 006_add_call_invites.sql — add missing call_invites table
--
-- SYMPTOM: POST /api/call-invites returns 500 "Could not create invite"
-- (server log: "Could not find the table 'public.call_invites' in the schema
-- cache"). The app code needs this table, but it was missing from older
-- migrations applied to this database.
--
-- This file creates it exactly as defined in full_schema.sql, then wires up
-- RLS, the realtime publication (callee sees the ring via Realtime), the
-- updated_at trigger, and role privileges (granted automatically by the
-- default privileges from 005_fix_grants.sql, but made explicit for safety).
--
-- HOW TO RUN:
--   1. Supabase dashboard → SQL Editor → paste → Run
--   2. Re-run is safe (IF NOT EXISTS / guarded DDL).
-- ============================================================================

CREATE TABLE IF NOT EXISTS call_invites (
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

CREATE INDEX IF NOT EXISTS idx_invites_callee ON call_invites(callee_id, status);
CREATE INDEX IF NOT EXISTS idx_invites_room ON call_invites(room_id);

ALTER TABLE call_invites ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "browser read invites" ON call_invites FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- updated_at trigger (function exists from full_schema.sql)
DO $$ BEGIN
  DROP TRIGGER IF EXISTS call_invites_updated_at ON call_invites;
  CREATE TRIGGER call_invites_updated_at BEFORE UPDATE ON call_invites
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Realtime: callee's dashboard subscribes to invite rows
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE call_invites;
EXCEPTION WHEN undefined_object OR duplicate_object THEN NULL;
END $$;

-- Privileges (explicit, in case default privileges weren't applied)
GRANT SELECT ON call_invites TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON call_invites TO service_role;

-- Verify: SELECT * FROM call_invites LIMIT 1;  → should return 0 rows, no error.