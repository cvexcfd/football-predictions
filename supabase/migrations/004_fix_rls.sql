-- Fix RLS for access-code based auth (no Supabase Auth)
-- We use custom access codes + frontend admin checks instead

DROP POLICY IF EXISTS "read_all" ON leagues;
DROP POLICY IF EXISTS "read_all" ON teams;
DROP POLICY IF EXISTS "read_all" ON matches;
DROP POLICY IF EXISTS "read_all" ON badges;
DROP POLICY IF EXISTS "read_all" ON badge_distributions;
DROP POLICY IF EXISTS "read_self" ON players;
DROP POLICY IF EXISTS "admin_insert" ON players;
DROP POLICY IF EXISTS "read_own_predictions" ON predictions;
DROP POLICY IF EXISTS "insert_own_predictions" ON predictions;
DROP POLICY IF EXISTS "update_own_predictions" ON predictions;
DROP POLICY IF EXISTS "read_own_badges" ON player_badges;
DROP POLICY IF EXISTS "read_audit" ON prediction_audit_log;
DROP POLICY IF EXISTS "insert_audit" ON prediction_audit_log;

ALTER TABLE leagues DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE badges DISABLE ROW LEVEL SECURITY;
ALTER TABLE player_badges DISABLE ROW LEVEL SECURITY;
ALTER TABLE badge_distributions DISABLE ROW LEVEL SECURITY;
ALTER TABLE predictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_audit_log DISABLE ROW LEVEL SECURITY;
