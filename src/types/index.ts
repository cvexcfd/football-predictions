export interface League {
  id: string
  name: string
  season: string | null
  description: string | null
  is_active: boolean
  created_at: string
}

export interface Team {
  id: string
  league_id: string
  name: string
  code: string
  flag_url: string | null
  group_name: string | null
  is_placeholder: boolean
  created_at: string
}

export type MatchStatus = 'upcoming' | 'locked' | 'finished'

export interface Match {
  id: string
  league_id: string
  home_team_id: string
  away_team_id: string
  kickoff_at: string
  stage: string | null
  status: MatchStatus
  home_score: number | null
  away_score: number | null
  pts_exact: number
  pts_result: number
  pts_win: number
  created_at: string
  home_team?: Team
  away_team?: Team
  league?: League
  predictions?: Prediction[]
}

export interface Player {
  id: string
  name: string
  access_code: string
  is_admin: boolean
  total_points: number
  created_at: string
}

export type BadgeType = 'multiplier' | 'addition'

export interface Badge {
  id: string
  name: string
  type: BadgeType
  factor: number
  created_by: string
  created_at: string
}

export interface PlayerBadge {
  id: string
  player_id: string
  badge_id: string
  quantity: number
  badge?: Badge
}

export interface BadgeDistribution {
  id: string
  badge_id: string
  distributed_at: string
  note: string | null
}

export type PredResult = 'H' | 'A' | 'D'

export interface Prediction {
  id: string
  player_id: string
  match_id: string
  pred_home: number
  pred_away: number
  pred_result: PredResult
  badge_id_used: string | null
  pts_exact_earned: number
  pts_result_earned: number
  pts_win_earned: number
  pts_raw: number
  pts_total: number
  submitted_at: string
  updated_at: string
  is_absent: boolean
  badge?: Badge
  match?: Match
}

export interface PredictionAuditLog {
  id: string
  prediction_id: string
  player_id: string
  match_id: string
  action: 'create' | 'update'
  old_pred_home: number
  old_pred_away: number
  new_pred_home: number
  new_pred_away: number
  changed_at: string
}

export interface LeaderboardEntry {
  id: string
  name: string
  total_points: number
  first_prediction_at: string | null
  badge_count: number
  predictions_count: number
  rankDelta?: number
  streak?: number
}

export interface MatchHistoryEntry {
  id: string
  kickoff_at: string
  stage: string | null
  home_score: number | null
  away_score: number | null
  home_team: { name: string; code: string | null; flag_url: string | null } | null
  away_team: { name: string; code: string | null; flag_url: string | null } | null
  predictions: Array<{
    player_id: string
    player_name: string
    pred_home: number
    pred_away: number
    pts_total: number
  }>
}

export interface MatchWithPrediction extends Match {
  prediction?: Prediction | null
}

export interface PlayerStats {
  totalPredictions: number
  finishedPredictions: number
  correctResults: number
  accuracy: number
  exactScores: number
  totalPoints: number
  badgesUsed: number
  pointsPerMatch: { match: string; points: number; date: string; badgeUsed: string; result: string; predScore: string }[]
}
