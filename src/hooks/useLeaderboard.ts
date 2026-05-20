import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { LeaderboardEntry } from '../types'

export function useLeaderboard() {
  const prevRanksRef = useRef<Map<string, number>>(new Map())

  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, total_points, created_at')
        .order('total_points', { ascending: false })

      if (error) throw error

      const playerIds = data.map(p => p.id)

      const { data: firstPreds } = await supabase
        .from('predictions')
        .select('player_id, submitted_at')
        .in('player_id', playerIds)
        .order('submitted_at', { ascending: true })

      const firstPredMap = new Map<string, string>()
      const predCountMap = new Map<string, number>()

      if (firstPreds) {
        for (const p of firstPreds) {
          if (!firstPredMap.has(p.player_id)) {
            firstPredMap.set(p.player_id, p.submitted_at)
          }
          predCountMap.set(p.player_id, (predCountMap.get(p.player_id) ?? 0) + 1)
        }
      }

      const { data: badges } = await supabase
        .from('player_badges')
        .select('player_id, quantity')
        .in('player_id', playerIds)

      const badgeCountMap = new Map<string, number>()
      if (badges) {
        for (const b of badges) {
          badgeCountMap.set(b.player_id, (badgeCountMap.get(b.player_id) ?? 0) + b.quantity)
        }
      }

      const { data: finishedPreds } = await supabase
        .from('predictions')
        .select(`
          player_id, pts_total,
          match:match_id(kickoff_at)
        `)
        .in('player_id', playerIds)
        .in('match_id', (await supabase.from('matches').select('id').eq('status', 'finished')).data?.map(m => m.id) ?? [])

      const streakMap = new Map<string, number>()
      if (finishedPreds) {
        const byPlayer = new Map<string, Array<{ pts_total: number; kickoff_at: string }>>()
        for (const p of finishedPreds as unknown as Array<{ player_id: string; pts_total: number; match: Array<{ kickoff_at: string }> | { kickoff_at: string } | null }>) {
          const match = Array.isArray(p.match) ? p.match[0] : p.match
          if (!match) continue
          const arr = byPlayer.get(p.player_id) ?? []
          arr.push({ pts_total: p.pts_total, kickoff_at: match.kickoff_at })
          byPlayer.set(p.player_id, arr)
        }
        for (const [pid, preds] of byPlayer) {
          preds.sort((a, b) => new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime())
          let streak = 0
          for (const p of preds) {
            if (p.pts_total > 0) streak++
            else break
          }
          streakMap.set(pid, streak)
        }
      }

      const leaderboard: LeaderboardEntry[] = data.map(p => ({
        id: p.id,
        name: p.name,
        total_points: p.total_points,
        first_prediction_at: firstPredMap.get(p.id) ?? null,
        badge_count: badgeCountMap.get(p.id) ?? 0,
        predictions_count: predCountMap.get(p.id) ?? 0,
        streak: streakMap.get(p.id) ?? 0,
      }))

      leaderboard.sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points
        if (a.first_prediction_at && b.first_prediction_at) {
          return new Date(a.first_prediction_at).getTime() - new Date(b.first_prediction_at).getTime()
        }
        return 0
      })

      const prevRanks = prevRanksRef.current
      const currentRanks = new Map(leaderboard.map((e, i) => [e.id, i + 1]))
      for (const entry of leaderboard) {
        const prevRank = prevRanks.get(entry.id)
        entry.rankDelta = prevRank ? prevRank - (currentRanks.get(entry.id) ?? 0) : 0
      }
      prevRanksRef.current = currentRanks

      return leaderboard
    },
    refetchInterval: 30_000,
  })
}
