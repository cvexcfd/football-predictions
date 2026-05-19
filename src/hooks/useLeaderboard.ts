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

      const leaderboard: LeaderboardEntry[] = data.map(p => ({
        id: p.id,
        name: p.name,
        total_points: p.total_points,
        first_prediction_at: firstPredMap.get(p.id) ?? null,
        badge_count: badgeCountMap.get(p.id) ?? 0,
        predictions_count: predCountMap.get(p.id) ?? 0,
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
