-- ============================================================================
-- VoxVerity 007_add_room_code.sql — room-code calls
--
-- The call model changed from "ring a specific teammate" (call_invites) to
-- "create a room, share a 6-character code, anyone signed in with the code
-- can join". The room code lives on the calls row; call.id (a UUID) doubles
-- as the WebRTC signaling room id, so no extra room table is needed.
--
-- HOW TO RUN:
--   1. Supabase dashboard → SQL Editor → paste → Run
--   2. Safe to re-run (IF NOT EXISTS / guarded DDL).
-- ============================================================================

ALTER TABLE calls ADD COLUMN IF NOT EXISTS room_code TEXT;

-- Unique, partial index: only active room codes count, one call per code.
CREATE UNIQUE INDEX IF NOT EXISTS idx_calls_room_code
  ON calls(room_code) WHERE room_code IS NOT NULL;

GRANT SELECT, UPDATE ON calls TO service_role;

-- Verify: SELECT room_code FROM calls WHERE room_code IS NOT NULL LIMIT 1;
-- (returns 0 rows until the first room is created — no error is success)