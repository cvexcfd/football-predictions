-- Migration 008: Add bonus_points to players (hidden from leaderboard display)
-- Bonus points persist through auto-score recalculations.

ALTER TABLE players ADD COLUMN IF NOT EXISTS bonus_points integer NOT NULL DEFAULT 0;

-- Update calculate_match_points to include bonus_points in total_points recalculation
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
  v_pts_raw int;
  v_pts_total int;
  v_badge RECORD;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  UPDATE matches SET home_score = p_home_score, away_score = p_away_score, status = 'finished'
  WHERE id = p_match_id;

  v_actual_result := CASE
    WHEN p_home_score > p_away_score THEN 'H'
    WHEN p_home_score < p_away_score THEN 'A'
    ELSE 'D'
  END;

  FOR v_pred IN SELECT * FROM predictions WHERE match_id = p_match_id LOOP
    IF v_pred.pred_home = p_home_score AND v_pred.pred_away = p_away_score THEN
      v_pts_exact_earned := v_match.pts_exact;
      v_pts_result_earned := 0;
    ELSIF v_pred.pred_result = v_actual_result THEN
      v_pts_exact_earned := 0;
      v_pts_result_earned := v_match.pts_result;
    ELSE
      v_pts_exact_earned := 0;
      v_pts_result_earned := 0;
    END IF;

    v_pts_raw := v_pts_exact_earned + v_pts_result_earned;

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

    UPDATE predictions SET
      pts_exact_earned = v_pts_exact_earned,
      pts_result_earned = v_pts_result_earned,
      pts_total = v_pts_total
    WHERE id = v_pred.id;
  END LOOP;

  -- CHANGED: Now includes bonus_points so manual adjustments survive recalculation
  UPDATE players p SET total_points = (
    SELECT COALESCE(SUM(pts_total), 0) FROM predictions WHERE player_id = p.id
  ) + COALESCE(p.bonus_points, 0)
  WHERE p.id IN (SELECT player_id FROM predictions WHERE match_id = p_match_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
