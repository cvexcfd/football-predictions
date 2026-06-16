import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PlayerStats } from '../types'

export function usePlayerStats(playerId: string) {
  return useQuery({
    queryKey: ['player-stats', playerId],
    queryFn: async () => {
      const { data: predictions, error } = await supabase
        .from('predictions')
        .select('*, match:match_id(*, home_team:home_team_id(name), away_team:away_team_id(name))')
        .eq('player_id', playerId)
        .order('updated_at', { ascending: false })

      if (error) throw error

      const raw = predictions as Array<Record<string, unknown>>
      const total = raw.length
      const finished = raw.filter(p => {
        const m = p.match as Record<string, unknown> | null
        return m?.status === 'finished'
      })
      const correctResult = finished.filter(p => {
        const m = p.match as Record<string, unknown> | null
        if (!m || m.home_score === null || m.away_score === null) return false
        const actual = (m.home_score as number) > (m.away_score as number) ? 'H' : (m.home_score as number) < (m.away_score as number) ? 'A' : 'D'
        return p.pred_result === actual
      })
      const exactScores = finished.filter(p => {
        const m = p.match as Record<string, unknown> | null
        if (!m) return false
        return m.home_score === p.pred_home && m.away_score === p.pred_away
      })
      const totalPts = raw.reduce((sum, p) => sum + (p.pts_total as number), 0)
      const badgesUsed = raw.filter(p => p.badge_id_used).length

      const pointsPerMatch = finished.map(p => {
        const m = p.match as Record<string, unknown>
        const ht = m.home_team as Record<string, unknown> | Array<Record<string, unknown>> | null
        const at = m?.away_team as Record<string, unknown> | Array<Record<string, unknown>> | null
        const homeName = ht ? (Array.isArray(ht) ? (ht[0]?.name as string ?? '?') : (ht.name as string ?? '?')) : '?'
        const awayName = at ? (Array.isArray(at) ? (at[0]?.name as string ?? '?') : (at.name as string ?? '?')) : '?'
        const isAbsent = (p.is_absent as boolean) ?? false
        return {
          match: `${homeName} vs ${awayName}`,
          points: p.pts_total as number,
          date: (m.kickoff_at ?? p.updated_at) as string,
          badgeUsed: p.badge_id_used ? 'Yes' : 'No',
          result: p.pred_result as string,
          predScore: isAbsent ? '—' : `${p.pred_home}-${p.pred_away}`,
          isAbsent,
        }
      }).reverse()

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
