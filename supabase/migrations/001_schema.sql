-- ==============================
-- Football Predictions — Full Schema
-- ==============================

-- 3.1 leagues
CREATE TABLE leagues (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  season        text,
  description   text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- 3.2 teams
CREATE TABLE teams (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id       uuid REFERENCES leagues(id),
  name            text NOT NULL,
  code            text NOT NULL,
  flag_url        text,
  group_name      text,
  is_placeholder  boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (league_id, code)
);

-- 3.3 matches
CREATE TABLE matches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id       uuid REFERENCES leagues(id),
  home_team_id    uuid REFERENCES teams(id) NOT NULL,
  away_team_id    uuid REFERENCES teams(id) NOT NULL,
  kickoff_at      timestamptz NOT NULL,
  stage           text,
  status          text DEFAULT 'upcoming',
  home_score      int,
  away_score      int,
  pts_exact       int NOT NULL,
  pts_result      int NOT NULL,
  pts_win         int NOT NULL,
  created_at      timestamptz DEFAULT now(),
  CHECK (home_team_id <> away_team_id)
);

-- 3.4 players
CREATE TABLE players (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  access_code   text UNIQUE NOT NULL,
  is_admin      boolean DEFAULT false,
  total_points  int DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

-- 3.5 badges
CREATE TABLE badges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  type          text NOT NULL,
  factor        numeric NOT NULL,
  created_by    uuid REFERENCES players(id),
  created_at    timestamptz DEFAULT now()
);

-- 3.6 player_badges
CREATE TABLE player_badges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     uuid REFERENCES players(id),
  badge_id      uuid REFERENCES badges(id),
  quantity      int DEFAULT 0,
  UNIQUE (player_id, badge_id)
);

-- 3.7 badge_distributions
CREATE TABLE badge_distributions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id        uuid REFERENCES badges(id),
  distributed_at  timestamptz DEFAULT now(),
  note            text
);

-- 3.8 predictions
CREATE TABLE predictions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id         uuid REFERENCES players(id),
  match_id          uuid REFERENCES matches(id),
  pred_home         int NOT NULL,
  pred_away         int NOT NULL,
  pred_result       text GENERATED ALWAYS AS (
                      CASE
                        WHEN pred_home > pred_away THEN 'H'
                        WHEN pred_home < pred_away THEN 'A'
                        ELSE 'D'
                      END
                    ) STORED,
  badge_id_used     uuid REFERENCES badges(id),
  pts_exact_earned  int DEFAULT 0,
  pts_result_earned int DEFAULT 0,
  pts_win_earned    int DEFAULT 0,
  pts_raw           int GENERATED ALWAYS AS (
                      pts_exact_earned + pts_result_earned + pts_win_earned
                    ) STORED,
  pts_total         int DEFAULT 0,
  submitted_at      timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  is_absent         boolean DEFAULT false,
  UNIQUE (player_id, match_id)
);

-- 3.9 prediction_audit_log
CREATE TABLE prediction_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id uuid REFERENCES predictions(id),
  player_id     uuid REFERENCES players(id),
  match_id      uuid REFERENCES matches(id),
  action        text,
  old_pred_home int,
  old_pred_away int,
  new_pred_home int,
  new_pred_away int,
  changed_at    timestamptz DEFAULT now()
);

-- ==============================
-- RLS Policies
-- ==============================

ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_audit_log ENABLE ROW LEVEL SECURITY;

-- Public read access for most tables
CREATE POLICY "read_all" ON leagues FOR SELECT USING (true);
CREATE POLICY "read_all" ON teams FOR SELECT USING (true);
CREATE POLICY "read_all" ON matches FOR SELECT USING (true);
CREATE POLICY "read_all" ON badges FOR SELECT USING (true);
CREATE POLICY "read_all" ON badge_distributions FOR SELECT USING (true);

-- Players: self-read, admin-read-all
CREATE POLICY "read_self" ON players FOR SELECT USING (true);
CREATE POLICY "admin_insert" ON players FOR INSERT WITH CHECK (true);

-- Predictions: player manages their own, admin can read all
CREATE POLICY "read_own_predictions" ON predictions FOR SELECT USING (true);
CREATE POLICY "insert_own_predictions" ON predictions FOR INSERT
  WITH CHECK (player_id = auth.uid()::uuid);
CREATE POLICY "update_own_predictions" ON predictions FOR UPDATE
  USING (player_id = auth.uid()::uuid)
  WITH CHECK (player_id = auth.uid()::uuid);

-- Player badges: read own, admin manages
CREATE POLICY "read_own_badges" ON player_badges FOR SELECT USING (true);

-- Audit log: read-all, insert-only
CREATE POLICY "read_audit" ON prediction_audit_log FOR SELECT USING (true);
CREATE POLICY "insert_audit" ON prediction_audit_log FOR INSERT WITH CHECK (true);

-- ==============================
-- Functions
-- ==============================

-- Submit prediction (player-facing)
CREATE OR REPLACE FUNCTION submit_prediction(
  p_player_id uuid,
  p_match_id uuid,
  p_pred_home int,
  p_pred_away int,
  p_badge_id uuid DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_match matches;
  v_old_pred predictions;
  v_badge_qty int;
BEGIN
  -- Lock match row and validate
  SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF v_match.status <> 'upcoming' THEN
    RAISE EXCEPTION 'Match is not open for predictions';
  END IF;
  IF v_match.kickoff_at <= now() THEN
    RAISE EXCEPTION 'Match has already kicked off';
  END IF;

  -- Get existing prediction if any
  SELECT * INTO v_old_pred FROM predictions
    WHERE player_id = p_player_id AND match_id = p_match_id;

  -- Handle badge changes
  IF v_old_pred.id IS NOT NULL AND v_old_pred.badge_id_used IS NOT NULL THEN
    -- Refund old badge
    UPDATE player_badges SET quantity = quantity + 1
      WHERE player_id = p_player_id AND badge_id = v_old_pred.badge_id_used;
  END IF;

  IF p_badge_id IS NOT NULL THEN
    -- Check badge quantity atomically
    SELECT quantity INTO v_badge_qty FROM player_badges
      WHERE player_id = p_player_id AND badge_id = p_badge_id
      FOR UPDATE;
    IF v_badge_qty IS NULL OR v_badge_qty <= 0 THEN
      RAISE EXCEPTION 'Badge not available';
    END IF;
    -- Decrement badge
    UPDATE player_badges SET quantity = quantity - 1
      WHERE player_id = p_player_id AND badge_id = p_badge_id;
  END IF;

  -- Upsert prediction
  INSERT INTO predictions (player_id, match_id, pred_home, pred_away, badge_id_used)
  VALUES (p_player_id, p_match_id, p_pred_home, p_pred_away, p_badge_id)
  ON CONFLICT (player_id, match_id) DO UPDATE SET
    pred_home = EXCLUDED.pred_home,
    pred_away = EXCLUDED.pred_away,
    badge_id_used = EXCLUDED.badge_id_used,
    updated_at = now();

  -- Audit log
  INSERT INTO prediction_audit_log (prediction_id, player_id, match_id, action, old_pred_home, old_pred_away, new_pred_home, new_pred_away)
  VALUES (
    (SELECT id FROM predictions WHERE player_id = p_player_id AND match_id = p_match_id),
    p_player_id,
    p_match_id,
    CASE WHEN v_old_pred.id IS NULL THEN 'create' ELSE 'update' END,
    v_old_pred.pred_home,
    v_old_pred.pred_away,
    p_pred_home,
    p_pred_away
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate points for a match (admin trigger)
CREATE OR REPLACE FUNCTION calculate_match_points(
  p_match_id uuid,
  p_home_score int,
  p_away_score int
) RETURNS void AS $$
DECLARE
  v_match matches;
  v_actual_result text;
  v_pred RECORD;
  v_pts_exact_earned int;
  v_pts_result_earned int;
  v_pts_win_earned int;
  v_pts_raw int;
  v_pts_total int;
  v_badge RECORD;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  -- Set actual score and result
  UPDATE matches SET home_score = p_home_score, away_score = p_away_score, status = 'finished'
  WHERE id = p_match_id;

  v_actual_result := CASE
    WHEN p_home_score > p_away_score THEN 'H'
    WHEN p_home_score < p_away_score THEN 'A'
    ELSE 'D'
  END;

  -- Process each prediction
  FOR v_pred IN SELECT * FROM predictions WHERE match_id = p_match_id LOOP
    -- Calculate exact
    IF v_pred.pred_home = p_home_score AND v_pred.pred_away = p_away_score THEN
      v_pts_exact_earned := v_match.pts_exact;
      v_pts_result_earned := 0;
      v_pts_win_earned := v_match.pts_win;
    -- Calculate result
    ELSIF v_pred.pred_result = v_actual_result THEN
      v_pts_exact_earned := 0;
      v_pts_result_earned := v_match.pts_result;
      v_pts_win_earned := v_match.pts_win;
    ELSE
      v_pts_exact_earned := 0;
      v_pts_result_earned := 0;
      v_pts_win_earned := 0;
    END IF;

    v_pts_raw := v_pts_exact_earned + v_pts_result_earned + v_pts_win_earned;

    -- Apply badge
    IF v_pred.badge_id_used IS NOT NULL THEN
      SELECT * INTO v_badge FROM badges WHERE id = v_pred.badge_id_used;
      IF v_badge.type = 'multiplier' THEN
        v_pts_total := v_pts_raw * v_badge.factor;
      ELSIF v_badge.type = 'addition' THEN
        IF v_pts_raw > 0 THEN
          v_pts_total := v_pts_raw + v_badge.factor;
        ELSE
          v_pts_total := 0;
        END IF;
      ELSE
        v_pts_total := v_pts_raw;
      END IF;
    ELSE
      v_pts_total := v_pts_raw;
    END IF;

    -- Update prediction
    UPDATE predictions SET
      pts_exact_earned = v_pts_exact_earned,
      pts_result_earned = v_pts_result_earned,
      pts_win_earned = v_pts_win_earned,
      pts_total = v_pts_total
    WHERE id = v_pred.id;
  END LOOP;

  -- Recompute total_points for all players (prevents drift)
  UPDATE players p SET total_points = (
    SELECT COALESCE(SUM(pts_total), 0) FROM predictions WHERE player_id = p.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-lock matches (called by cron)
CREATE OR REPLACE FUNCTION auto_lock_matches() RETURNS int AS $$
DECLARE
  v_count int := 0;
  v_match RECORD;
BEGIN
  FOR v_match IN SELECT * FROM matches WHERE status = 'upcoming' AND kickoff_at <= now() LOOP
    UPDATE matches SET status = 'locked' WHERE id = v_match.id;
    
    -- Insert absent rows for players without predictions
    INSERT INTO predictions (player_id, match_id, pred_home, pred_away, is_absent)
    SELECT p.id, v_match.id, 0, 0, true
    FROM players p
    WHERE NOT EXISTS (
      SELECT 1 FROM predictions WHERE player_id = p.id AND match_id = v_match.id
    );
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Distribute badge to all players (admin)
CREATE OR REPLACE FUNCTION distribute_badge(p_badge_id uuid) RETURNS void AS $$
BEGIN
  INSERT INTO player_badges (player_id, badge_id, quantity)
  SELECT id, p_badge_id, 1 FROM players
  ON CONFLICT (player_id, badge_id) DO UPDATE SET
    quantity = player_badges.quantity + 1;

  INSERT INTO badge_distributions (badge_id, note) VALUES (p_badge_id, 'Distributed to all players');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Login helper (used client-side via RPC)
CREATE OR REPLACE FUNCTION login_by_code(p_code text) RETURNS SETOF players AS $$
BEGIN
  RETURN QUERY SELECT * FROM players WHERE access_code = p_code LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
