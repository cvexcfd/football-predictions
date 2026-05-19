-- Additional Round of 32 matches (4 more needed)
INSERT INTO matches (id, league_id, home_team_id, away_team_id, kickoff_at, stage, status, pts_exact, pts_result, pts_win) VALUES
  ('r32_13', 'a0000000-0000-0000-0000-000000000001', 'p01', 'p15', '2026-06-30 16:00:00+00', 'Round of 32', 'upcoming', 5, 2, 2),
  ('r32_14', 'a0000000-0000-0000-0000-000000000001', 'p07', 'p13', '2026-06-30 20:00:00+00', 'Round of 32', 'upcoming', 5, 2, 2),
  ('r32_15', 'a0000000-0000-0000-0000-000000000001', 'p11', 'p23', '2026-07-01 16:00:00+00', 'Round of 32', 'upcoming', 5, 2, 2),
  ('r32_16', 'a0000000-0000-0000-0000-000000000001', 'p17', 'p05', '2026-07-01 20:00:00+00', 'Round of 32', 'upcoming', 5, 2, 2);

-- Additional Round of 16 matches (2 more needed)
INSERT INTO matches (id, league_id, home_team_id, away_team_id, kickoff_at, stage, status, pts_exact, pts_result, pts_win) VALUES
  ('r16_07', 'a0000000-0000-0000-0000-000000000001', 'p01', 'p07', '2026-07-05 16:00:00+00', 'Round of 16', 'upcoming', 5, 2, 2),
  ('r16_08', 'a0000000-0000-0000-0000-000000000001', 'p11', 'p17', '2026-07-05 20:00:00+00', 'Round of 16', 'upcoming', 5, 2, 2);

-- Additional Quarter-Final match (1 more needed)
INSERT INTO matches (id, league_id, home_team_id, away_team_id, kickoff_at, stage, status, pts_exact, pts_result, pts_win) VALUES
  ('qf04', 'a0000000-0000-0000-0000-000000000001', 'p01', 'p11', '2026-07-08 20:00:00+00', 'Quarter-Final', 'upcoming', 7, 3, 3);
