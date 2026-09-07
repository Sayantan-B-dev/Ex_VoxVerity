-- ============================================================================
-- VoxVerity 005_fix_grants.sql — restore missing table privileges
--
-- SYMPTOM: Every API call touching the DB returns 500 ("Could not create
-- account.", "permission denied for table app_users", ...) because the tables
-- created by full_schema.sql have NO privileges granted to the roles the app
-- connects as:
--   - anon / authenticated   → used by the browser (Supabase Realtime reads,
--                              RLS read policies)
--   - service_role           → used by server routes / auth.ts (all writes,
--                              bypasses RLS)
--
-- FIX: Grant the standard Supabase role privileges on the public schema,
-- existing objects, and future objects (default privileges), so this never
-- silently breaks again after a migration.
--
-- HOW TO RUN:
--   1. Open your Supabase project → SQL Editor (https://supabase.com/dashboard)
--   2. Paste this whole file
--   3. Click "Run"
-- Safe to run repeatedly (GRANT is idempotent).
-- ============================================================================

-- Schema-level usage (already granted by reset.sql, kept for completeness)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Existing tables: browser reads + server writes
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;

-- Sequences (if any exist now or later)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Future tables/sequences created by later migrations keep working too
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;

-- ============================================================================
-- Verify after running:
--   SELECT has_table_privilege('anon', 'public.app_users', 'SELECT'),
--          has_table_privilege('service_role', 'public.app_users', 'INSERT'),
--          has_table_privilege('authenticated', 'public.profiles', 'SELECT');
-- Expect: t | t | t
-- ============================================================================