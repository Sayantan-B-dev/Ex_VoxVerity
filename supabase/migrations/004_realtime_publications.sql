-- =============================================================================
-- 004: Supabase Realtime Publications
--
-- Run this on an EXISTING database that already has the tables from
-- full_schema.sql but is missing the realtime publications.
--
-- Adds the tables the browser subscribes to via Supabase Realtime:
--   - presence      (online user list on /live)
--   - calls         (dashboard live feed)
--   - call_invites  (incoming call notifications)
--   - analysis_results (per-chunk risk on dashboard)
--   - alerts        (alert feed)
--   - incidents     (incident timeline)
--   - evidence_records (evidence/区块链 page)
--
-- Safe to run multiple times (idempotent via EXCEPTION handler).
-- =============================================================================

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE presence;
EXCEPTION WHEN undefined_object OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE calls;
EXCEPTION WHEN undefined_object OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE call_invites;
EXCEPTION WHEN undefined_object OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE analysis_results;
EXCEPTION WHEN undefined_object OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
EXCEPTION WHEN undefined_object OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
EXCEPTION WHEN undefined_object OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE evidence_records;
EXCEPTION WHEN undefined_object OR duplicate_object THEN NULL;
END $$;
