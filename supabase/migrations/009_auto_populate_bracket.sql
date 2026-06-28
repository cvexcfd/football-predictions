-- ==============================
-- Migration 009: auto_populate_bracket
-- ==============================
-- Computes group standings from finished group matches,
-- determines advancing teams (winners, runners-up, 8 best 3rd-placed),
-- and populates the Round of 32 matches with actual team IDs.
--
-- Call via:  SELECT auto_populate_bracket();
-- Returns:   JSON { updated: N, skipped: N, message: '...' }
-- ==============================

CREATE OR REPLACE FUNCTION auto_populate_bracket()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match RECORD;
  v_home_id uuid;
  v_away_id uuid;
  v_old_home_id uuid;
  v_old_away_id uuid;
  v_updated int := 0;
  v_skipped int := 0;
  v_eligible_groups text[];
  v_best_third RECORD;
  v_third_allocated text[] := '{}';
  v_group_letter text;
  v_group_name text;
BEGIN
  -- ============================================================
  -- Step 1: Build group standings from finished group matches
  -- ============================================================
  CREATE TEMP TABLE _gs ON COMMIT DROP AS
  WITH
    teams_in_groups AS (
      SELECT id, name, group_name
      FROM teams
      WHERE group_name IS NOT NULL
        AND is_placeholder IS DISTINCT FROM true
    ),
    results AS (
      -- Home team contributions
      SELECT
        m.home_team_id AS team_id,
        tg.group_name,
        m.home_score AS gf,
        m.away_score AS ga,
        CASE
          WHEN m.home_score > m.away_score THEN 3
          WHEN m.home_score = m.away_score THEN 1
          ELSE 0
        END AS pts
      FROM matches m
      JOIN teams_in_groups tg ON tg.id = m.home_team_id
      WHERE m.stage = 'Group Stage' AND m.status = 'finished'
      UNION ALL
      -- Away team contributions
      SELECT
        m.away_team_id,
        tg.group_name,
        m.away_score,
        m.home_score,
        CASE
          WHEN m.away_score > m.home_score THEN 3
          WHEN m.away_score = m.home_score THEN 1
          ELSE 0
        END
      FROM matches m
      JOIN teams_in_groups tg ON tg.id = m.away_team_id
      WHERE m.stage = 'Group Stage' AND m.status = 'finished'
    ),
    totals AS (
      SELECT
        r.team_id,
        t.name,
        r.group_name,
        SUM(r.pts) AS pts,
        SUM(r.gf) AS gf,
        SUM(r.ga) AS ga,
        SUM(r.gf) - SUM(r.ga) AS gd
      FROM results r
      JOIN teams t ON t.id = r.team_id
      GROUP BY r.team_id, t.name, r.group_name
    ),
    ranked AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY group_name
          ORDER BY pts DESC, gd DESC, gf DESC, name
        ) AS pos
      FROM totals
    )
  SELECT
    group_name,
    MAX(CASE WHEN pos = 1 THEN team_id END) AS winner_id,
    MAX(CASE WHEN pos = 1 THEN name END) AS winner_name,
    MAX(CASE WHEN pos = 2 THEN team_id END) AS runnerup_id,
    MAX(CASE WHEN pos = 2 THEN name END) AS runnerup_name,
    MAX(CASE WHEN pos = 3 THEN team_id END) AS third_id,
    MAX(CASE WHEN pos = 3 THEN name END) AS third_name,
    MAX(CASE WHEN pos = 3 THEN pts END) AS third_pts,
    MAX(CASE WHEN pos = 3 THEN gd END) AS third_gd,
    MAX(CASE WHEN pos = 3 THEN gf END) AS third_gf
  FROM ranked
  GROUP BY group_name
  ORDER BY group_name;

  -- ============================================================
  -- Step 2: Rank 3rd-placed teams across all groups
  -- ============================================================
  CREATE TEMP TABLE _third_ranked ON COMMIT DROP AS
  SELECT
    third_id AS team_id,
    third_name AS name,
    group_name,
    third_pts AS pts,
    third_gd AS gd,
    third_gf AS gf,
    ROW_NUMBER() OVER (ORDER BY third_pts DESC, third_gd DESC, third_gf DESC, group_name) AS rank
  FROM _gs
  WHERE third_id IS NOT NULL;

  -- ============================================================
  -- Helper function: get team ID for a named slot
  -- Winner/Runner-up: direct lookup
  -- Best 3rd: pick best unallocated from eligible groups
  -- ============================================================
  -- Since PL/pgSQL doesn't allow nested functions, we inline the logic.

  -- ============================================================
  -- Step 3: Process each Round of 32 match
  -- ============================================================
  FOR v_match IN
    SELECT m.id, m.home_team_id AS current_home, m.away_team_id AS current_away,
           ht.name AS home_placeholder, at.name AS away_placeholder
    FROM matches m
    JOIN teams ht ON ht.id = m.home_team_id
    JOIN teams at ON at.id = m.away_team_id
    WHERE m.stage = 'Round of 32'
    ORDER BY m.kickoff_at
  LOOP
    v_old_home_id := v_match.current_home;
    v_old_away_id := v_match.current_away;

    -- ---- Resolve HOME team ----
    v_home_id := NULL;

    -- Winner Group X
    IF v_match.home_placeholder LIKE 'Winner Group %' THEN
      v_group_letter := RIGHT(v_match.home_placeholder, 1);
      v_group_name := 'Group ' || v_group_letter;
      SELECT winner_id INTO v_home_id FROM _gs WHERE group_name = v_group_name;

    -- Runner-up Group X
    ELSIF v_match.home_placeholder LIKE 'Runner-up Group %' THEN
      v_group_letter := RIGHT(v_match.home_placeholder, 1);
      v_group_name := 'Group ' || v_group_letter;
      SELECT runnerup_id INTO v_home_id FROM _gs WHERE group_name = v_group_name;

    -- Best 3rd (X/Y/Z)
    ELSIF v_match.home_placeholder LIKE 'Best 3rd%' THEN
      -- Extract eligible group letters: "Best 3rd (A/B/C/D/F)" → {A,B,C,D,F}
      v_eligible_groups := string_to_array(
        substring(v_match.home_placeholder FROM '\(([^)]+)\)'),
        '/'
      );
      -- Prepend 'Group ' to each letter
      v_eligible_groups := (
        SELECT array_agg('Group ' || letter)
        FROM unnest(v_eligible_groups) AS letter
      );

      -- Pick best-ranked unallocated 3rd from eligible groups
      SELECT tr.team_id, tr.group_name INTO v_best_third
      FROM _third_ranked tr
      WHERE tr.group_name = ANY(v_eligible_groups)
        AND NOT (tr.group_name = ANY(v_third_allocated))
      ORDER BY tr.rank
      LIMIT 1;

      IF FOUND THEN
        v_home_id := v_best_third.team_id;
        v_third_allocated := array_append(v_third_allocated, v_best_third.group_name);
      END IF;
    END IF;

    -- ---- Resolve AWAY team ----
    v_away_id := NULL;

    -- Winner Group X
    IF v_match.away_placeholder LIKE 'Winner Group %' THEN
      v_group_letter := RIGHT(v_match.away_placeholder, 1);
      v_group_name := 'Group ' || v_group_letter;
      SELECT winner_id INTO v_away_id FROM _gs WHERE group_name = v_group_name;

    -- Runner-up Group X
    ELSIF v_match.away_placeholder LIKE 'Runner-up Group %' THEN
      v_group_letter := RIGHT(v_match.away_placeholder, 1);
      v_group_name := 'Group ' || v_group_letter;
      SELECT runnerup_id INTO v_away_id FROM _gs WHERE group_name = v_group_name;

    -- Best 3rd (X/Y/Z)
    ELSIF v_match.away_placeholder LIKE 'Best 3rd%' THEN
      v_eligible_groups := string_to_array(
        substring(v_match.away_placeholder FROM '\(([^)]+)\)'),
        '/'
      );
      v_eligible_groups := (
        SELECT array_agg('Group ' || letter)
        FROM unnest(v_eligible_groups) AS letter
      );

      SELECT tr.team_id, tr.group_name INTO v_best_third
      FROM _third_ranked tr
      WHERE tr.group_name = ANY(v_eligible_groups)
        AND NOT (tr.group_name = ANY(v_third_allocated))
      ORDER BY tr.rank
      LIMIT 1;

      IF FOUND THEN
        v_away_id := v_best_third.team_id;
        v_third_allocated := array_append(v_third_allocated, v_best_third.group_name);
      END IF;
    END IF;

    -- ---- Update match if teams changed ----
    IF v_home_id IS NOT NULL OR v_away_id IS NOT NULL THEN
      UPDATE matches
      SET home_team_id = COALESCE(v_home_id, home_team_id),
          away_team_id = COALESCE(v_away_id, away_team_id)
      WHERE id = v_match.id;

      v_updated := v_updated + 1;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;

  -- ============================================================
  -- Cleanup
  -- ============================================================
  -- Temp tables are ON COMMIT DROP

  RETURN json_build_object(
    'updated', v_updated,
    'skipped', v_skipped,
    'message', CASE
      WHEN v_updated = 16 THEN 'All Round of 32 matches populated successfully'
      WHEN v_updated > 0 THEN v_updated || ' of 16 Round of 32 matches updated'
      ELSE 'No matches updated — ensure group stage matches are finished'
    END
  );
END;
$$;
