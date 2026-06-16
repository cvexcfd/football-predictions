-- ==============================
-- Auto-Score System v2
-- Robust locking + error handling + backoff
-- NO schema changes — compatible with existing tables
-- ==============================

-- 1. Recreate auto_lock_matches — locks 30min BEFORE kickoff
DROP FUNCTION IF EXISTS auto_lock_matches();
CREATE OR REPLACE FUNCTION auto_lock_matches() RETURNS int AS $$
DECLARE
  v_count int := 0;
  v_match RECORD;
  v_league_id uuid;
BEGIN
  SELECT id INTO v_league_id FROM leagues WHERE slug = 'world-cup-2026';
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  FOR v_match IN
    SELECT * FROM matches
    WHERE status = 'upcoming'
      AND league_id = v_league_id
      AND kickoff_at - INTERVAL '30 minutes' <= now()
  LOOP
    UPDATE matches SET status = 'locked' WHERE id = v_match.id;

    INSERT INTO predictions (player_id, match_id, pred_home, pred_away, is_absent)
    SELECT p.id, v_match.id, 0, 0, true
    FROM players p
    WHERE NOT EXISTS (
      SELECT 1 FROM predictions WHERE player_id = p.id AND match_id = v_match.id
    );

    UPDATE player_badges pb
    SET quantity = pb.quantity - 1
    FROM predictions p
    WHERE p.match_id = v_match.id
      AND p.badge_id_used IS NOT NULL
      AND pb.player_id = p.player_id
      AND pb.badge_id = p.badge_id_used
      AND pb.quantity > 0;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recreate lock_match (admin manual) — consistent pre-lock logic
DROP FUNCTION IF EXISTS lock_match(uuid);
CREATE OR REPLACE FUNCTION lock_match(p_match_id uuid) RETURNS void AS $$
DECLARE
  v_match RECORD;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF v_match.status <> 'upcoming' THEN
    RAISE EXCEPTION 'Match is not upcoming';
  END IF;

  UPDATE matches SET status = 'locked' WHERE id = p_match_id;

  INSERT INTO predictions (player_id, match_id, pred_home, pred_away, is_absent)
  SELECT p.id, p_match_id, 0, 0, true
  FROM players p
  WHERE NOT EXISTS (
    SELECT 1 FROM predictions WHERE player_id = p.id AND match_id = p_match_id
  );

  UPDATE player_badges pb
  SET quantity = pb.quantity - 1
  FROM predictions p
  WHERE p.match_id = p_match_id
    AND p.badge_id_used IS NOT NULL
    AND pb.player_id = p.player_id
    AND pb.badge_id = p.badge_id_used
    AND pb.quantity > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate auto_score_matches_now — with error handling + backoff via last_run_result
DROP FUNCTION IF EXISTS auto_score_matches_now();
CREATE OR REPLACE FUNCTION auto_score_matches_now()
RETURNS jsonb AS $$
DECLARE
  v_match RECORD;
  v_response http_response;
  v_all_games jsonb;
  v_game jsonb;
  v_home_score int;
  v_away_score int;
  v_finished text;
  v_error_detail text;
  v_scored_count int := 0;
  v_checked_count int := 0;
  v_error_count int := 0;
  v_last_result text;
  v_league_id uuid;
  v_config RECORD;
BEGIN
  -- Read config
  SELECT * INTO v_config FROM auto_score_config WHERE id = true;
  v_last_result := v_config.last_run_result;

  -- Check if we're in backoff mode (last_run_result encoded as 'backoff_<iso_timestamp>')
  IF v_last_result IS NOT NULL AND v_last_result LIKE 'backoff_%' THEN
    BEGIN
      -- Extract timestamp after 'backoff_'
      IF to_timestamp(substr(v_last_result, 9), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') > now() THEN
        INSERT INTO auto_score_logs (match_id, external_id, action, details, success)
        VALUES (NULL, NULL, 'info',
          'Skipped — in backoff until ' || substr(v_last_result, 9), true);
        RETURN jsonb_build_object('skipped', true, 'reason', 'backoff');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;  -- If parsing fails, clear backoff
    END;
  END IF;

  -- Clear backoff (we passed it or couldn't parse)
  IF v_last_result IS NOT NULL AND v_last_result LIKE 'backoff_%' THEN
    v_last_result := NULL;
  END IF;

  -- Get league ID
  SELECT id INTO v_league_id FROM leagues WHERE slug = 'world-cup-2026';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'League not found');
  END IF;

  -- Try primary API with timeout/error protection
  BEGIN
    v_response := extensions.http_get('https://worldcup26.ir/get/games');
  EXCEPTION WHEN OTHERS THEN
    v_error_detail := SQLERRM;
    INSERT INTO auto_score_logs (match_id, external_id, action, details, success)
    VALUES (NULL, NULL, 'error', 'HTTP request failed: ' || v_error_detail, false);

    UPDATE auto_score_config
    SET last_run_at = now(),
        last_run_result = 'backoff_' || to_char(now() + INTERVAL '15 minutes', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    WHERE id = true;

    RETURN jsonb_build_object('error', 'HTTP request failed: ' || v_error_detail);
  END;

  -- Check HTTP status
  IF v_response.status <> 200 THEN
    INSERT INTO auto_score_logs (match_id, external_id, action, details, success)
    VALUES (NULL, NULL, 'error', 'HTTP ' || v_response.status || ' from worldcup26.ir', false);

    IF v_response.status = 429 THEN
      -- Rate limited: backoff 1 hour
      UPDATE auto_score_config
      SET last_run_at = now(),
          last_run_result = 'backoff_' || to_char(now() + INTERVAL '1 hour', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      WHERE id = true;
    ELSE
      -- Server error: backoff 15 minutes
      UPDATE auto_score_config
      SET last_run_at = now(),
          last_run_result = 'backoff_' || to_char(now() + INTERVAL '15 minutes', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      WHERE id = true;
    END IF;

    RETURN jsonb_build_object('error', 'HTTP ' || v_response.status);
  END IF;

  -- Success: clear backoff
  UPDATE auto_score_config
  SET last_run_at = now(),
      last_run_result = 'ok'
  WHERE id = true;

  -- Parse JSON response safely
  BEGIN
    v_all_games := v_response.content::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_error_detail := SQLERRM;
    INSERT INTO auto_score_logs (match_id, external_id, action, details, success)
    VALUES (NULL, NULL, 'error', 'JSON parse failed: ' || v_error_detail, false);
    RETURN jsonb_build_object('error', 'JSON parse failed: ' || v_error_detail);
  END;

  -- Score locked matches that are 2h+ past kickoff
  FOR v_match IN
    SELECT m.id, m.external_id, ht.code AS home_code, at.code AS away_code
    FROM matches m
    JOIN teams ht ON ht.id = m.home_team_id
    JOIN teams at ON at.id = m.away_team_id
    WHERE m.status = 'locked'
      AND m.external_id IS NOT NULL
      AND m.kickoff_at + INTERVAL '2 hours' <= now()
      AND m.league_id = v_league_id
    ORDER BY m.kickoff_at
  LOOP
    BEGIN
      SELECT value INTO v_game
      FROM jsonb_array_elements(v_all_games->'games')
      WHERE value->>'id' = v_match.external_id::text;

      IF v_game IS NULL THEN
        INSERT INTO auto_score_logs (match_id, external_id, action, details, success)
        VALUES (v_match.id, v_match.external_id, 'error',
          'Game ID ' || v_match.external_id || ' not found in API response', false);
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;

      v_finished := v_game->>'finished';

      IF v_finished = 'TRUE' THEN
        v_home_score := (v_game->>'home_score')::int;
        v_away_score := (v_game->>'away_score')::int;

        PERFORM calculate_match_points(v_match.id, v_home_score, v_away_score);

        INSERT INTO auto_score_logs (match_id, external_id, action, details, success)
        VALUES (v_match.id, v_match.external_id, 'auto_score',
          v_match.home_code || ' ' || v_home_score || '-' || v_away_score || ' ' || v_match.away_code,
          true);

        v_scored_count := v_scored_count + 1;
      ELSE
        INSERT INTO auto_score_logs (match_id, external_id, action, details, success)
        VALUES (v_match.id, v_match.external_id, 'check',
          'Not yet finished (finished=' || COALESCE(v_finished, 'NULL') || ')',
          true);

        v_checked_count := v_checked_count + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_error_detail := SQLERRM;
      INSERT INTO auto_score_logs (match_id, external_id, action, details, success)
      VALUES (v_match.id, v_match.external_id, 'error', v_error_detail, false);
      v_error_count := v_error_count + 1;
    END;
  END LOOP;

  UPDATE auto_score_config
  SET last_run_at = now(),
      last_run_result = 'scored=' || v_scored_count || ' checked=' || v_checked_count || ' errors=' || v_error_count
  WHERE id = true;

  RETURN jsonb_build_object(
    'scored', v_scored_count,
    'checked', v_checked_count,
    'errors', v_error_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate auto_score_cron — always locks first, then scores (with crash protection)
DROP FUNCTION IF EXISTS auto_score_cron();
CREATE OR REPLACE FUNCTION auto_score_cron()
RETURNS jsonb AS $$
DECLARE
  v_enabled boolean;
BEGIN
  -- STEP 1: Lock matches (ALWAYS runs — isolated, won't roll back on scoring failure)
  -- This uses a separate function call with its own transaction semantics
  PERFORM auto_lock_matches();

  -- STEP 2: Check if scoring is enabled
  SELECT enabled INTO v_enabled FROM auto_score_config WHERE id = true;
  IF NOT v_enabled THEN
    RETURN '{"cron_skipped": true, "reason": "auto_score_disabled"}'::jsonb;
  END IF;

  -- STEP 3: Attempt scoring with crash isolation
  BEGIN
    RETURN auto_score_matches_now();
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO auto_score_logs (match_id, external_id, action, details, success)
    VALUES (NULL, NULL, 'error', 'auto_score_cron crashed: ' || SQLERRM, false);

    UPDATE auto_score_config
    SET last_run_at = now(),
        last_run_result = 'cron_crash: ' || SQLERRM
    WHERE id = true;

    RETURN jsonb_build_object('error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Reschedule pg_cron to every 30 minutes instead of 10
SELECT cron.unschedule('auto-score');
SELECT cron.schedule('auto-score', '*/30 * * * *', 'SELECT auto_score_cron()');
