-- WC2026 Seed Data
-- League
INSERT INTO leagues (id, name, season, description) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'FIFA World Cup 2026', '2026', '48 teams, 12 groups, 104 matches');

-- Teams (48 teams, 12 groups of 4)
INSERT INTO teams (id, league_id, name, code, flag_url, group_name) VALUES
  -- Group A
  ('ta01', 'a0000000-0000-0000-0000-000000000001', 'United States', 'USA', 'https://flagcdn.com/w80/us.png', 'Group A'),
  ('ta02', 'a0000000-0000-0000-0000-000000000001', 'Canada', 'CAN', 'https://flagcdn.com/w80/ca.png', 'Group A'),
  ('ta03', 'a0000000-0000-0000-0000-000000000001', 'Mexico', 'MEX', 'https://flagcdn.com/w80/mx.png', 'Group A'),
  ('ta04', 'a0000000-0000-0000-0000-000000000001', 'New Zealand', 'NZL', 'https://flagcdn.com/w80/nz.png', 'Group A'),
  -- Group B
  ('tb01', 'a0000000-0000-0000-0000-000000000001', 'Argentina', 'ARG', 'https://flagcdn.com/w80/ar.png', 'Group B'),
  ('tb02', 'a0000000-0000-0000-0000-000000000001', 'Uruguay', 'URU', 'https://flagcdn.com/w80/uy.png', 'Group B'),
  ('tb03', 'a0000000-0000-0000-0000-000000000001', 'Chile', 'CHI', 'https://flagcdn.com/w80/cl.png', 'Group B'),
  ('tb04', 'a0000000-0000-0000-0000-000000000001', 'Paraguay', 'PAR', 'https://flagcdn.com/w80/py.png', 'Group B'),
  -- Group C
  ('tc01', 'a0000000-0000-0000-0000-000000000001', 'Brazil', 'BRA', 'https://flagcdn.com/w80/br.png', 'Group C'),
  ('tc02', 'a0000000-0000-0000-0000-000000000001', 'Colombia', 'COL', 'https://flagcdn.com/w80/co.png', 'Group C'),
  ('tc03', 'a0000000-0000-0000-0000-000000000001', 'Ecuador', 'ECU', 'https://flagcdn.com/w80/ec.png', 'Group C'),
  ('tc04', 'a0000000-0000-0000-0000-000000000001', 'Venezuela', 'VEN', 'https://flagcdn.com/w80/ve.png', 'Group C'),
  -- Group D
  ('td01', 'a0000000-0000-0000-0000-000000000001', 'France', 'FRA', 'https://flagcdn.com/w80/fr.png', 'Group D'),
  ('td02', 'a0000000-0000-0000-0000-000000000001', 'Netherlands', 'NED', 'https://flagcdn.com/w80/nl.png', 'Group D'),
  ('td03', 'a0000000-0000-0000-0000-000000000001', 'England', 'ENG', 'https://flagcdn.com/w80/gb-eng.png', 'Group D'),
  ('td04', 'a0000000-0000-0000-0000-000000000001', 'Wales', 'WAL', 'https://flagcdn.com/w80/gb-wls.png', 'Group D'),
  -- Group E
  ('te01', 'a0000000-0000-0000-0000-000000000001', 'Spain', 'ESP', 'https://flagcdn.com/w80/es.png', 'Group E'),
  ('te02', 'a0000000-0000-0000-0000-000000000001', 'Germany', 'GER', 'https://flagcdn.com/w80/de.png', 'Group E'),
  ('te03', 'a0000000-0000-0000-0000-000000000001', 'Portugal', 'POR', 'https://flagcdn.com/w80/pt.png', 'Group E'),
  ('te04', 'a0000000-0000-0000-0000-000000000001', 'Italy', 'ITA', 'https://flagcdn.com/w80/it.png', 'Group E'),
  -- Group F
  ('tf01', 'a0000000-0000-0000-0000-000000000001', 'Belgium', 'BEL', 'https://flagcdn.com/w80/be.png', 'Group F'),
  ('tf02', 'a0000000-0000-0000-0000-000000000001', 'Croatia', 'CRO', 'https://flagcdn.com/w80/hr.png', 'Group F'),
  ('tf03', 'a0000000-0000-0000-0000-000000000001', 'Denmark', 'DEN', 'https://flagcdn.com/w80/dk.png', 'Group F'),
  ('tf04', 'a0000000-0000-0000-0000-000000000001', 'Switzerland', 'SUI', 'https://flagcdn.com/w80/ch.png', 'Group F'),
  -- Group G
  ('tg01', 'a0000000-0000-0000-0000-000000000001', 'Morocco', 'MAR', 'https://flagcdn.com/w80/ma.png', 'Group G'),
  ('tg02', 'a0000000-0000-0000-0000-000000000001', 'Senegal', 'SEN', 'https://flagcdn.com/w80/sn.png', 'Group G'),
  ('tg03', 'a0000000-0000-0000-0000-000000000001', 'Nigeria', 'NGA', 'https://flagcdn.com/w80/ng.png', 'Group G'),
  ('tg04', 'a0000000-0000-0000-0000-000000000001', 'Egypt', 'EGY', 'https://flagcdn.com/w80/eg.png', 'Group G'),
  -- Group H
  ('th01', 'a0000000-0000-0000-0000-000000000001', 'Japan', 'JPN', 'https://flagcdn.com/w80/jp.png', 'Group H'),
  ('th02', 'a0000000-0000-0000-0000-000000000001', 'South Korea', 'KOR', 'https://flagcdn.com/w80/kr.png', 'Group H'),
  ('th03', 'a0000000-0000-0000-0000-000000000001', 'Saudi Arabia', 'KSA', 'https://flagcdn.com/w80/sa.png', 'Group H'),
  ('th04', 'a0000000-0000-0000-0000-000000000001', 'Australia', 'AUS', 'https://flagcdn.com/w80/au.png', 'Group H'),
  -- Group I
  ('ti01', 'a0000000-0000-0000-0000-000000000001', 'Iran', 'IRN', 'https://flagcdn.com/w80/ir.png', 'Group I'),
  ('ti02', 'a0000000-0000-0000-0000-000000000001', 'South Africa', 'RSA', 'https://flagcdn.com/w80/za.png', 'Group I'),
  ('ti03', 'a0000000-0000-0000-0000-000000000001', 'Tunisia', 'TUN', 'https://flagcdn.com/w80/tn.png', 'Group I'),
  ('ti04', 'a0000000-0000-0000-0000-000000000001', 'Cameroon', 'CMR', 'https://flagcdn.com/w80/cm.png', 'Group I'),
  -- Group J
  ('tj01', 'a0000000-0000-0000-0000-000000000001', 'Ukraine', 'UKR', 'https://flagcdn.com/w80/ua.png', 'Group J'),
  ('tj02', 'a0000000-0000-0000-0000-000000000001', 'Serbia', 'SRB', 'https://flagcdn.com/w80/rs.png', 'Group J'),
  ('tj03', 'a0000000-0000-0000-0000-000000000001', 'Sweden', 'SWE', 'https://flagcdn.com/w80/se.png', 'Group J'),
  ('tj04', 'a0000000-0000-0000-0000-000000000001', 'Poland', 'POL', 'https://flagcdn.com/w80/pl.png', 'Group J'),
  -- Group K
  ('tk01', 'a0000000-0000-0000-0000-000000000001', 'Algeria', 'ALG', 'https://flagcdn.com/w80/dz.png', 'Group K'),
  ('tk02', 'a0000000-0000-0000-0000-000000000001', 'Ghana', 'GHA', 'https://flagcdn.com/w80/gh.png', 'Group K'),
  ('tk03', 'a0000000-0000-0000-0000-000000000001', 'Ivory Coast', 'CIV', 'https://flagcdn.com/w80/ci.png', 'Group K'),
  ('tk04', 'a0000000-0000-0000-0000-000000000001', 'DR Congo', 'COD', 'https://flagcdn.com/w80/cd.png', 'Group K'),
  -- Group L
  ('tl01', 'a0000000-0000-0000-0000-000000000001', 'Costa Rica', 'CRC', 'https://flagcdn.com/w80/cr.png', 'Group L'),
  ('tl02', 'a0000000-0000-0000-0000-000000000001', 'Jamaica', 'JAM', 'https://flagcdn.com/w80/jm.png', 'Group L'),
  ('tl03', 'a0000000-0000-0000-0000-000000000001', 'Panama', 'PAN', 'https://flagcdn.com/w80/pa.png', 'Group L'),
  ('tl04', 'a0000000-0000-0000-0000-000000000001', 'Honduras', 'HON', 'https://flagcdn.com/w80/hn.png', 'Group L');

-- Knockout placeholders
INSERT INTO teams (id, league_id, name, code, is_placeholder) VALUES
  ('p01', 'a0000000-0000-0000-0000-000000000001', 'Winner Group A', 'WGA', true),
  ('p02', 'a0000000-0000-0000-0000-000000000001', 'Runner-up Group A', 'RGA', true),
  ('p03', 'a0000000-0000-0000-0000-000000000001', 'Winner Group B', 'WGB', true),
  ('p04', 'a0000000-0000-0000-0000-000000000001', 'Runner-up Group B', 'RGB', true),
  ('p05', 'a0000000-0000-0000-0000-000000000001', 'Winner Group C', 'WGC', true),
  ('p06', 'a0000000-0000-0000-0000-000000000001', 'Runner-up Group C', 'RGC', true),
  ('p07', 'a0000000-0000-0000-0000-000000000001', 'Winner Group D', 'WGD', true),
  ('p08', 'a0000000-0000-0000-0000-000000000001', 'Runner-up Group D', 'RGD', true),
  ('p09', 'a0000000-0000-0000-0000-000000000001', 'Winner Group E', 'WGE', true),
  ('p10', 'a0000000-0000-0000-0000-000000000001', 'Runner-up Group E', 'RGE', true),
  ('p11', 'a0000000-0000-0000-0000-000000000001', 'Winner Group F', 'WGF', true),
  ('p12', 'a0000000-0000-0000-0000-000000000001', 'Runner-up Group F', 'RGF', true),
  ('p13', 'a0000000-0000-0000-0000-000000000001', 'Winner Group G', 'WGG', true),
  ('p14', 'a0000000-0000-0000-0000-000000000001', 'Runner-up Group G', 'RGG', true),
  ('p15', 'a0000000-0000-0000-0000-000000000001', 'Winner Group H', 'WGH', true),
  ('p16', 'a0000000-0000-0000-0000-000000000001', 'Runner-up Group H', 'RGH', true),
  ('p17', 'a0000000-0000-0000-0000-000000000001', 'Winner Group I', 'WGI', true),
  ('p18', 'a0000000-0000-0000-0000-000000000001', 'Runner-up Group I', 'RGI', true),
  ('p19', 'a0000000-0000-0000-0000-000000000001', 'Winner Group J', 'WGJ', true),
  ('p20', 'a0000000-0000-0000-0000-000000000001', 'Runner-up Group J', 'RGJ', true),
  ('p21', 'a0000000-0000-0000-0000-000000000001', 'Winner Group K', 'WGK', true),
  ('p22', 'a0000000-0000-0000-0000-000000000001', 'Runner-up Group K', 'RGK', true),
  ('p23', 'a0000000-0000-0000-0000-000000000001', 'Winner Group L', 'WGL', true),
  ('p24', 'a0000000-0000-0000-0000-000000000001', 'Runner-up Group L', 'RGL', true);

-- Group stage matches (72 matches) — using 2026 dates
-- Each group: 6 matches (round-robin)
-- Matchdays: MD1 = June 11-13, MD2 = June 16-18, MD3 = June 21-23

-- Helper: group team IDs
-- Group A: ta01(USA), ta02(CAN), ta03(MEX), ta04(NZL)
-- Group B: tb01(ARG), tb02(URU), tb03(CHI), tb04(PAR)
-- Group C: tc01(BRA), tc02(COL), tc03(ECU), tc04(VEN)
-- Group D: td01(FRA), td02(NED), td03(ENG), td04(WAL)
-- Group E: te01(ESP), te02(GER), te03(POR), te04(ITA)
-- Group F: tf01(BEL), tf02(CRO), tf03(DEN), tf04(SUI)
-- Group G: tg01(MAR), tg02(SEN), tg03(NGA), tg04(EGY)
-- Group H: th01(JPN), th02(KOR), th03(KSA), th04(AUS)
-- Group I: ti01(IRN), ti02(RSA), ti03(TUN), ti04(CMR)
-- Group J: tj01(UKR), tj02(SRB), tj03(SWE), tj04(POL)
-- Group K: tk01(ALG), tk02(GHA), tk03(CIV), tk04(COD)
-- Group L: tl01(CRC), tl02(JAM), tl03(PAN), tl04(HON)

-- Group A matches
INSERT INTO matches (id, league_id, home_team_id, away_team_id, kickoff_at, stage, status, pts_exact, pts_result, pts_win) VALUES
  ('ma01', 'a0000000-0000-0000-0000-000000000001', 'ta01', 'ta03', '2026-06-11 18:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('ma02', 'a0000000-0000-0000-0000-000000000001', 'ta02', 'ta04', '2026-06-11 21:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('ma03', 'a0000000-0000-0000-0000-000000000001', 'ta01', 'ta02', '2026-06-16 18:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('ma04', 'a0000000-0000-0000-0000-000000000001', 'ta03', 'ta04', '2026-06-16 21:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('ma05', 'a0000000-0000-0000-0000-000000000001', 'ta01', 'ta04', '2026-06-21 18:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('ma06', 'a0000000-0000-0000-0000-000000000001', 'ta03', 'ta02', '2026-06-21 21:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1);

-- Group B matches
INSERT INTO matches (id, league_id, home_team_id, away_team_id, kickoff_at, stage, status, pts_exact, pts_result, pts_win) VALUES
  ('mb01', 'a0000000-0000-0000-0000-000000000001', 'tb01', 'tb03', '2026-06-12 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mb02', 'a0000000-0000-0000-0000-000000000001', 'tb02', 'tb04', '2026-06-12 18:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mb03', 'a0000000-0000-0000-0000-000000000001', 'tb01', 'tb02', '2026-06-17 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mb04', 'a0000000-0000-0000-0000-000000000001', 'tb03', 'tb04', '2026-06-17 18:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mb05', 'a0000000-0000-0000-0000-000000000001', 'tb01', 'tb04', '2026-06-22 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mb06', 'a0000000-0000-0000-0000-000000000001', 'tb03', 'tb02', '2026-06-22 18:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1);

-- Group C matches
INSERT INTO matches (id, league_id, home_team_id, away_team_id, kickoff_at, stage, status, pts_exact, pts_result, pts_win) VALUES
  ('mc01', 'a0000000-0000-0000-0000-000000000001', 'tc01', 'tc03', '2026-06-12 21:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mc02', 'a0000000-0000-0000-0000-000000000001', 'tc02', 'tc04', '2026-06-13 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mc03', 'a0000000-0000-0000-0000-000000000001', 'tc01', 'tc02', '2026-06-17 21:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mc04', 'a0000000-0000-0000-0000-000000000001', 'tc03', 'tc04', '2026-06-18 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mc05', 'a0000000-0000-0000-0000-000000000001', 'tc01', 'tc04', '2026-06-22 21:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mc06', 'a0000000-0000-0000-0000-000000000001', 'tc03', 'tc02', '2026-06-23 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1);

-- Group D matches
INSERT INTO matches (id, league_id, home_team_id, away_team_id, kickoff_at, stage, status, pts_exact, pts_result, pts_win) VALUES
  ('md01', 'a0000000-0000-0000-0000-000000000001', 'td01', 'td03', '2026-06-13 18:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('md02', 'a0000000-0000-0000-0000-000000000001', 'td02', 'td04', '2026-06-13 21:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('md03', 'a0000000-0000-0000-0000-000000000001', 'td01', 'td02', '2026-06-18 18:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('md04', 'a0000000-0000-0000-0000-000000000001', 'td03', 'td04', '2026-06-18 21:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('md05', 'a0000000-0000-0000-0000-000000000001', 'td01', 'td04', '2026-06-23 18:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('md06', 'a0000000-0000-0000-0000-000000000001', 'td03', 'td02', '2026-06-23 21:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1);

-- Group E matches
INSERT INTO matches (id, league_id, home_team_id, away_team_id, kickoff_at, stage, status, pts_exact, pts_result, pts_win) VALUES
  ('me01', 'a0000000-0000-0000-0000-000000000001', 'te01', 'te03', '2026-06-14 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('me02', 'a0000000-0000-0000-0000-000000000001', 'te02', 'te04', '2026-06-14 18:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('me03', 'a0000000-0000-0000-0000-000000000001', 'te01', 'te02', '2026-06-19 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('me04', 'a0000000-0000-0000-0000-000000000001', 'te03', 'te04', '2026-06-19 18:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('me05', 'a0000000-0000-0000-0000-000000000001', 'te01', 'te04', '2026-06-24 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('me06', 'a0000000-0000-0000-0000-000000000001', 'te03', 'te02', '2026-06-24 18:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1);

-- Group F matches
INSERT INTO matches (id, league_id, home_team_id, away_team_id, kickoff_at, stage, status, pts_exact, pts_result, pts_win) VALUES
  ('mf01', 'a0000000-0000-0000-0000-000000000001', 'tf01', 'tf03', '2026-06-14 21:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mf02', 'a0000000-0000-0000-0000-000000000001', 'tf02', 'tf04', '2026-06-15 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mf03', 'a0000000-0000-0000-0000-000000000001', 'tf01', 'tf02', '2026-06-19 21:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mf04', 'a0000000-0000-0000-0000-000000000001', 'tf03', 'tf04', '2026-06-20 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mf05', 'a0000000-0000-0000-0000-000000000001', 'tf01', 'tf04', '2026-06-24 21:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mf06', 'a0000000-0000-0000-0000-000000000001', 'tf03', 'tf02', '2026-06-25 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1);

-- Group G matches
INSERT INTO matches (id, league_id, home_team_id, away_team_id, kickoff_at, stage, status, pts_exact, pts_result, pts_win) VALUES
  ('mg01', 'a0000000-0000-0000-0000-000000000001', 'tg01', 'tg03', '2026-06-15 18:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mg02', 'a0000000-0000-0000-0000-000000000001', 'tg02', 'tg04', '2026-06-15 21:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mg03', 'a0000000-0000-0000-0000-000000000001', 'tg01', 'tg02', '2026-06-20 18:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mg04', 'a0000000-0000-0000-0000-000000000001', 'tg03', 'tg04', '2026-06-20 21:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mg05', 'a0000000-0000-0000-0000-000000000001', 'tg01', 'tg04', '2026-06-25 18:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mg06', 'a0000000-0000-0000-0000-000000000001', 'tg03', 'tg02', '2026-06-25 21:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1);

-- Group H matches
INSERT INTO matches (id, league_id, home_team_id, away_team_id, kickoff_at, stage, status, pts_exact, pts_result, pts_win) VALUES
  ('mh01', 'a0000000-0000-0000-0000-000000000001', 'th01', 'th03', '2026-06-11 12:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mh02', 'a0000000-0000-0000-0000-000000000001', 'th02', 'th04', '2026-06-11 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mh03', 'a0000000-0000-0000-0000-000000000001', 'th01', 'th02', '2026-06-16 12:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mh04', 'a0000000-0000-0000-0000-000000000001', 'th03', 'th04', '2026-06-16 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mh05', 'a0000000-0000-0000-0000-000000000001', 'th01', 'th04', '2026-06-21 12:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mh06', 'a0000000-0000-0000-0000-000000000001', 'th03', 'th02', '2026-06-21 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1);

-- Group I matches
INSERT INTO matches (id, league_id, home_team_id, away_team_id, kickoff_at, stage, status, pts_exact, pts_result, pts_win) VALUES
  ('mi01', 'a0000000-0000-0000-0000-000000000001', 'ti01', 'ti03', '2026-06-12 12:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mi02', 'a0000000-0000-0000-0000-000000000001', 'ti02', 'ti04', '2026-06-12 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mi03', 'a0000000-0000-0000-0000-000000000001', 'ti01', 'ti02', '2026-06-17 12:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mi04', 'a0000000-0000-0000-0000-000000000001', 'ti03', 'ti04', '2026-06-17 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mi05', 'a0000000-0000-0000-0000-000000000001', 'ti01', 'ti04', '2026-06-22 12:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mi06', 'a0000000-0000-0000-0000-000000000001', 'ti03', 'ti02', '2026-06-22 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1);

-- Group J matches
INSERT INTO matches (id, league_id, home_team_id, away_team_id, kickoff_at, stage, status, pts_exact, pts_result, pts_win) VALUES
  ('mj01', 'a0000000-0000-0000-0000-000000000001', 'tj01', 'tj03', '2026-06-13 12:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mj02', 'a0000000-0000-0000-0000-000000000001', 'tj02', 'tj04', '2026-06-13 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mj03', 'a0000000-0000-0000-0000-000000000001', 'tj01', 'tj02', '2026-06-18 12:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mj04', 'a0000000-0000-0000-0000-000000000001', 'tj03', 'tj04', '2026-06-18 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mj05', 'a0000000-0000-0000-0000-000000000001', 'tj01', 'tj04', '2026-06-23 12:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mj06', 'a0000000-0000-0000-0000-000000000001', 'tj03', 'tj02', '2026-06-23 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1);

-- Group K matches
INSERT INTO matches (id, league_id, home_team_id, away_team_id, kickoff_at, stage, status, pts_exact, pts_result, pts_win) VALUES
  ('mk01', 'a0000000-0000-0000-0000-000000000001', 'tk01', 'tk03', '2026-06-14 12:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mk02', 'a0000000-0000-0000-0000-000000000001', 'tk02', 'tk04', '2026-06-14 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mk03', 'a0000000-0000-0000-0000-000000000001', 'tk01', 'tk02', '2026-06-19 12:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mk04', 'a0000000-0000-0000-0000-000000000001', 'tk03', 'tk04', '2026-06-19 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mk05', 'a0000000-0000-0000-0000-000000000001', 'tk01', 'tk04', '2026-06-24 12:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('mk06', 'a0000000-0000-0000-0000-000000000001', 'tk03', 'tk02', '2026-06-24 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1);

-- Group L matches
INSERT INTO matches (id, league_id, home_team_id, away_team_id, kickoff_at, stage, status, pts_exact, pts_result, pts_win) VALUES
  ('ml01', 'a0000000-0000-0000-0000-000000000001', 'tl01', 'tl03', '2026-06-15 12:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('ml02', 'a0000000-0000-0000-0000-000000000001', 'tl02', 'tl04', '2026-06-15 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('ml03', 'a0000000-0000-0000-0000-000000000001', 'tl01', 'tl02', '2026-06-20 12:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('ml04', 'a0000000-0000-0000-0000-000000000001', 'tl03', 'tl04', '2026-06-20 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('ml05', 'a0000000-0000-0000-0000-000000000001', 'tl01', 'tl04', '2026-06-25 12:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1),
  ('ml06', 'a0000000-0000-0000-0000-000000000001', 'tl03', 'tl02', '2026-06-25 15:00:00+00', 'Group Stage', 'upcoming', 3, 1, 1);

-- Knockout stage: Round of 32 (16 matches, June 27-30)
-- Match pairing: 1A vs 2B, 1C vs 2D, etc.
INSERT INTO matches (id, league_id, home_team_id, away_team_id, kickoff_at, stage, status, pts_exact, pts_result, pts_win) VALUES
  ('r32_01', 'a0000000-0000-0000-0000-000000000001', 'p01', 'p04', '2026-06-27 16:00:00+00', 'Round of 32', 'upcoming', 5, 2, 2),
  ('r32_02', 'a0000000-0000-0000-0000-000000000001', 'p03', 'p02', '2026-06-27 20:00:00+00', 'Round of 32', 'upcoming', 5, 2, 2),
  ('r32_03', 'a0000000-0000-0000-0000-000000000001', 'p05', 'p08', '2026-06-28 16:00:00+00', 'Round of 32', 'upcoming', 5, 2, 2),
  ('r32_04', 'a0000000-0000-0000-0000-000000000001', 'p07', 'p06', '2026-06-28 20:00:00+00', 'Round of 32', 'upcoming', 5, 2, 2),
  ('r32_05', 'a0000000-0000-0000-0000-000000000001', 'p09', 'p12', '2026-06-28 16:00:00+00', 'Round of 32', 'upcoming', 5, 2, 2),
  ('r32_06', 'a0000000-0000-0000-0000-000000000001', 'p11', 'p10', '2026-06-28 20:00:00+00', 'Round of 32', 'upcoming', 5, 2, 2),
  ('r32_07', 'a0000000-0000-0000-0000-000000000001', 'p13', 'p16', '2026-06-29 16:00:00+00', 'Round of 32', 'upcoming', 5, 2, 2),
  ('r32_08', 'a0000000-0000-0000-0000-000000000001', 'p15', 'p14', '2026-06-29 20:00:00+00', 'Round of 32', 'upcoming', 5, 2, 2),
  ('r32_09', 'a0000000-0000-0000-0000-000000000001', 'p17', 'p20', '2026-06-29 16:00:00+00', 'Round of 32', 'upcoming', 5, 2, 2),
  ('r32_10', 'a0000000-0000-0000-0000-000000000001', 'p19', 'p18', '2026-06-29 20:00:00+00', 'Round of 32', 'upcoming', 5, 2, 2),
  ('r32_11', 'a0000000-0000-0000-0000-000000000001', 'p21', 'p24', '2026-06-30 16:00:00+00', 'Round of 32', 'upcoming', 5, 2, 2),
  ('r32_12', 'a0000000-0000-0000-0000-000000000001', 'p23', 'p22', '2026-06-30 20:00:00+00', 'Round of 32', 'upcoming', 5, 2, 2);

-- Round of 16 (8 matches, July 2-5)
INSERT INTO matches (id, league_id, home_team_id, away_team_id, kickoff_at, stage, status, pts_exact, pts_result, pts_win) VALUES
  ('r16_01', 'a0000000-0000-0000-0000-000000000001', 'p01', 'p03', '2026-07-02 16:00:00+00', 'Round of 16', 'upcoming', 5, 2, 2),
  ('r16_02', 'a0000000-0000-0000-0000-000000000001', 'p05', 'p07', '2026-07-02 20:00:00+00', 'Round of 16', 'upcoming', 5, 2, 2),
  ('r16_03', 'a0000000-0000-0000-0000-000000000001', 'p09', 'p11', '2026-07-03 16:00:00+00', 'Round of 16', 'upcoming', 5, 2, 2),
  ('r16_04', 'a0000000-0000-0000-0000-000000000001', 'p13', 'p15', '2026-07-03 20:00:00+00', 'Round of 16', 'upcoming', 5, 2, 2),
  ('r16_05', 'a0000000-0000-0000-0000-000000000001', 'p17', 'p19', '2026-07-04 16:00:00+00', 'Round of 16', 'upcoming', 5, 2, 2),
  ('r16_06', 'a0000000-0000-0000-0000-000000000001', 'p21', 'p23', '2026-07-04 20:00:00+00', 'Round of 16', 'upcoming', 5, 2, 2);

-- Quarter-Finals (4 matches, July 7-8)
INSERT INTO matches (id, league_id, home_team_id, away_team_id, kickoff_at, stage, status, pts_exact, pts_result, pts_win) VALUES
  ('qf01', 'a0000000-0000-0000-0000-000000000001', 'p01', 'p05', '2026-07-07 16:00:00+00', 'Quarter-Final', 'upcoming', 7, 3, 3),
  ('qf02', 'a0000000-0000-0000-0000-000000000001', 'p09', 'p13', '2026-07-07 20:00:00+00', 'Quarter-Final', 'upcoming', 7, 3, 3),
  ('qf03', 'a0000000-0000-0000-0000-000000000001', 'p17', 'p21', '2026-07-08 16:00:00+00', 'Quarter-Final', 'upcoming', 7, 3, 3);

-- Semi-Finals (2 matches, July 11-12)
INSERT INTO matches (id, league_id, home_team_id, away_team_id, kickoff_at, stage, status, pts_exact, pts_result, pts_win) VALUES
  ('sf01', 'a0000000-0000-0000-0000-000000000001', 'p01', 'p09', '2026-07-11 20:00:00+00', 'Semi-Final', 'upcoming', 10, 4, 4),
  ('sf02', 'a0000000-0000-0000-0000-000000000001', 'p17', 'p21', '2026-07-12 20:00:00+00', 'Semi-Final', 'upcoming', 10, 4, 4);

-- Third Place & Final (July 14 & July 15)
INSERT INTO matches (id, league_id, home_team_id, away_team_id, kickoff_at, stage, status, pts_exact, pts_result, pts_win) VALUES
  ('tp01', 'a0000000-0000-0000-0000-000000000001', 'p01', 'p17', '2026-07-14 16:00:00+00', 'Third Place', 'upcoming', 10, 4, 4),
  ('fn01', 'a0000000-0000-0000-0000-000000000001', 'p09', 'p21', '2026-07-15 18:00:00+00', 'Final', 'upcoming', 15, 6, 6);
