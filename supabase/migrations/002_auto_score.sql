-- ==============================
-- Auto-Score System
-- ==============================

-- 1. Install http extension for synchronous HTTP requests
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2. Add external_id column to matches
ALTER TABLE matches ADD COLUMN external_id INT;

-- 3. Auto-score config table (singleton)
CREATE TABLE auto_score_config (
  id boolean PRIMARY KEY DEFAULT true,
  enabled boolean NOT NULL DEFAULT false,
  last_run_at timestamptz,
  last_run_result text,
  CONSTRAINT singleton CHECK (id = true)
);

INSERT INTO auto_score_config (id, enabled) VALUES (true, false);

-- 4. Auto-score logs
CREATE TABLE auto_score_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id),
  external_id int,
  action text NOT NULL,
  details text,
  success boolean NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE auto_score_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON auto_score_logs FOR SELECT USING (true);
CREATE POLICY "insert_all" ON auto_score_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "update_all" ON auto_score_logs FOR UPDATE USING (true);

-- 5. Auto-score config RLS
ALTER TABLE auto_score_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON auto_score_config FOR SELECT USING (true);
CREATE POLICY "update_all" ON auto_score_config FOR UPDATE USING (true);

-- 6. RPC: Toggle auto-score on/off
CREATE OR REPLACE FUNCTION auto_score_set_enabled(p_enabled boolean)
RETURNS void AS $$
BEGIN
  UPDATE auto_score_config SET enabled = p_enabled WHERE id = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: Get current config
CREATE OR REPLACE FUNCTION auto_score_get_config()
RETURNS TABLE(enabled boolean, last_run_at timestamptz, last_run_result text) AS $$
BEGIN
  RETURN QUERY SELECT c.enabled, c.last_run_at, c.last_run_result
  FROM auto_score_config c WHERE c.id = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC: Manual trigger — run auto-score synchronously for matches 2h+ past kickoff
CREATE OR REPLACE FUNCTION auto_score_matches_now()
RETURNS jsonb AS $$
DECLARE
  v_match RECORD;
  v_response extensions.http_response;
  v_result jsonb;
  v_home_score int;
  v_away_score int;
  v_finished text;
  v_log_id uuid;
  v_results jsonb := '[]'::jsonb;
  v_error_detail text;
  v_url text;
BEGIN
  FOR v_match IN
    SELECT m.id, m.external_id, ht.code AS home_code, at.code AS away_code
    FROM matches m
    JOIN teams ht ON ht.id = m.home_team_id
    JOIN teams at ON at.id = m.away_team_id
    WHERE m.status = 'locked'
      AND m.external_id IS NOT NULL
      AND m.kickoff_at + INTERVAL '2 hours' <= now()
    ORDER BY m.kickoff_at
  LOOP
    BEGIN
      v_url := 'https://worldcup26.ir/get/game/' || v_match.external_id;

      v_response := extensions.http_get(v_url);

      IF v_response.status <> 200 THEN
        INSERT INTO auto_score_logs (match_id, external_id, action, details, success)
        VALUES (v_match.id, v_match.external_id, 'error',
          'HTTP ' || v_response.status || ' from worldcup26.ir for game ' || v_match.external_id, false)
        RETURNING id INTO v_log_id;
        CONTINUE;
      END IF;

      v_result := v_response.body::jsonb;
      v_finished := v_result->>'finished';

      IF v_finished = 'TRUE' THEN
        v_home_score := (v_result->>'home_score')::int;
        v_away_score := (v_result->>'away_score')::int;

        PERFORM calculate_match_points(v_match.id, v_home_score, v_away_score);

        INSERT INTO auto_score_logs (match_id, external_id, action, details, success)
        VALUES (v_match.id, v_match.external_id, 'auto_score',
          v_match.home_code || ' ' || v_home_score || '-' || v_away_score || ' ' || v_match.away_code,
          true);

        v_results := v_results || jsonb_build_object(
          'match_id', v_match.id,
          'external_id', v_match.external_id,
          'score', v_home_score || '-' || v_away_score,
          'status', 'scored'
        );
      ELSE
        INSERT INTO auto_score_logs (match_id, external_id, action, details, success)
        VALUES (v_match.id, v_match.external_id, 'check',
          'Match not yet finished on worldcup26.ir (finished=' || COALESCE(v_finished, 'NULL') || ')',
          true);

        v_results := v_results || jsonb_build_object(
          'match_id', v_match.id,
          'external_id', v_match.external_id,
          'status', 'not_finished'
        );
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_error_detail := SQLERRM;
      INSERT INTO auto_score_logs (match_id, external_id, action, details, success)
      VALUES (v_match.id, v_match.external_id, 'error', v_error_detail, false);

      v_results := v_results || jsonb_build_object(
        'match_id', v_match.id,
        'external_id', v_match.external_id,
        'status', 'error',
        'error', v_error_detail
      );
    END;
  END LOOP;

  UPDATE auto_score_config
  SET last_run_at = now(),
      last_run_result = CASE WHEN jsonb_array_length(v_results) > 0
        THEN v_results::text ELSE 'no_matches' END
  WHERE id = true;

  RETURN jsonb_build_object(
    'processed', jsonb_array_length(v_results),
    'results', v_results
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC: Cron-friendly auto-score (checks config before running)
CREATE OR REPLACE FUNCTION auto_score_cron()
RETURNS jsonb AS $$
DECLARE
  v_enabled boolean;
BEGIN
  SELECT enabled INTO v_enabled FROM auto_score_config WHERE id = true;
  IF NOT v_enabled THEN
    RETURN '{"cron_skipped": true, "reason": "auto_score_disabled"}'::jsonb;
  END IF;

  RETURN auto_score_matches_now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Schedule pg_cron (every 10 minutes)
SELECT cron.schedule('auto-score', '*/10 * * * *', 'SELECT auto_score_cron()');
