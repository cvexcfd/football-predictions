import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PlayerStats } from '../types'

export function usePlayerStats(playerId: string) {
  return useQuery({
    queryKey: ['player-stats', playerId],
    queryFn: async () => {
      const { data: predictions, error } = await supabase
        .from('predictions')
        .select('*, match:match_id(*)')
        .eq('player_id', playerId)
        .order('updated_at', { ascending: false })

      if (error) throw error

      const total = predictions.length
      const finished = predictions.filter(p => p.match?.status === 'finished')
      const correctResult = finished.filter(p => {
        const m = p.match
        if (m?.home_score === null || m?.away_score === null) return false
        const actual = m.home_score > m.away_score ? 'H' : m.home_score < m.away_score ? 'A' : 'D'
        return p.pred_result === actual
      })
      const exactScores = finished.filter(p => p.match?.home_score === p.pred_home && p.match?.away_score === p.pred_away)
      const totalPts = predictions.reduce((sum, p) => sum + p.pts_total, 0)
      const badgesUsed = predictions.filter(p => p.badge_id_used).length

      const pointsPerMatch = predictions
        .filter(p => p.match?.status === 'finished')
        .map(p => ({
          match: `${p.match?.home_team?.name ?? '?'} vs ${p.match?.away_team?.name ?? '?'}`,
          points: p.pts_total,
          date: p.match?.kickoff_at ?? p.updated_at,
          badgeUsed: p.badge_id_used ? 'Yes' : 'No',
          result: p.pred_result,
          predScore: `${p.pred_home}-${p.pred_away}`,
        }))
        .reverse()

      return {
        totalPredictions: total,
        finishedPredictions: finished.length,
        correctResults: correctResult.length,
        accuracy: finished.length > 0 ? Math.round((correctResult.length / finished.length) * 100) : 0,
        exactScores: exactScores.length,
        totalPoints: totalPts,
        badgesUsed,
        pointsPerMatch,
      } as PlayerStats
    },
  })
}
