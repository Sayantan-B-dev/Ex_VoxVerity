-- ============================================================================
-- VoxVerity reset.sql — full database reset
-- WARNING: destroys ALL data and objects in the public schema. Irreversible.
--
-- Run order for a fresh environment:
--   1. reset.sql        (wipe everything)
--   2. full_schema.sql  (create schema — NextAuth DB-only, no Supabase Auth)
--   3. final_seed.sql   (demo data: users, calls, chunks, alerts, evidence…)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Drop legacy Supabase-Auth leftovers (from old migration 001, if applied)
--    Not part of the current schema; cleaned so the reset is complete.
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
EXCEPTION WHEN others THEN NULL;
END $$;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;

-- ----------------------------------------------------------------------------
-- 2. Drop the whole public schema and recreate it empty
-- ----------------------------------------------------------------------------
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- ----------------------------------------------------------------------------
-- 3. Restore Supabase default grants on the fresh schema
-- ----------------------------------------------------------------------------
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- Done. Run full_schema.sql next.