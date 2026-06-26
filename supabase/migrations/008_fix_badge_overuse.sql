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
  SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF v_match.status <> 'upcoming' THEN
    RAISE EXCEPTION 'Match is not open for predictions';
  END IF;
  IF v_match.kickoff_at - INTERVAL '30 minutes' <= now() THEN
    RAISE EXCEPTION 'Match locks 30 minutes before kickoff';
  END IF;

  -- Validate badge ownership before allowing badge_id_used
  IF p_badge_id IS NOT NULL THEN
    SELECT quantity INTO v_badge_qty FROM player_badges
    WHERE player_id = p_player_id AND badge_id = p_badge_id
    FOR UPDATE;
    IF NOT FOUND OR v_badge_qty <= 0 THEN
      RAISE EXCEPTION 'You do not own this badge or have none left';
    END IF;
  END IF;

  SELECT * INTO v_old_pred FROM predictions
    WHERE player_id = p_player_id AND match_id = p_match_id;

  -- Upsert prediction (badge_id_used is just a selection, not consumed here)
  INSERT INTO predictions (player_id, match_id, pred_home, pred_away, badge_id_used)
  VALUES (p_player_id, p_match_id, p_pred_home, p_pred_away, p_badge_id)
  ON CONFLICT (player_id, match_id) DO UPDATE SET
    pred_home = EXCLUDED.pred_home,
    pred_away = EXCLUDED.pred_away,
    badge_id_used = EXCLUDED.badge_id_used,
    updated_at = now();

  -- Audit log with badge info
  INSERT INTO prediction_audit_log (prediction_id, player_id, match_id, action, old_pred_home, old_pred_away, new_pred_home, new_pred_away, old_badge_id, new_badge_id)
  VALUES (
    (SELECT id FROM predictions WHERE player_id = p_player_id AND match_id = p_match_id),
    p_player_id,
    p_match_id,
    CASE WHEN v_old_pred.id IS NULL THEN 'create' ELSE 'update' END,
    v_old_pred.pred_home,
    v_old_pred.pred_away,
    p_pred_home,
    p_pred_away,
    v_old_pred.badge_id_used,
    p_badge_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;