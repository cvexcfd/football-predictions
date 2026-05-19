export const APP_NAME = 'Football Predictions'

export const POINTS_CONFIG = {
  groupStage: { pts_exact: 3, pts_result: 1, pts_win: 1 },
  roundOf32: { pts_exact: 5, pts_result: 2, pts_win: 2 },
  roundOf16: { pts_exact: 5, pts_result: 2, pts_win: 2 },
  quarterFinal: { pts_exact: 7, pts_result: 3, pts_win: 3 },
  semiFinal: { pts_exact: 10, pts_result: 4, pts_win: 4 },
  thirdPlace: { pts_exact: 10, pts_result: 4, pts_win: 4 },
  final: { pts_exact: 15, pts_result: 6, pts_win: 6 },
} as const

export const STAGES = [
  'Group Stage',
  'Round of 32',
  'Round of 16',
  'Quarter-Final',
  'Semi-Final',
  'Third Place',
  'Final',
] as const

export const GROUP_NAMES = [
  'Group A', 'Group B', 'Group C', 'Group D',
  'Group E', 'Group F', 'Group G', 'Group H',
  'Group I', 'Group J', 'Group K', 'Group L',
] as const
