import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { MatchWithPrediction } from '../types'

export function useMatches(status: 'upcoming' | 'locked' | 'finished' | 'all' = 'upcoming', playerId?: string) {
  return useQuery({
    queryKey: ['matches', status, playerId],
    queryFn: async () => {
      let query = supabase
        .from('matches')
        .select(`
          *,
          home_team:home_team_id(*),
          away_team:away_team_id(*),
          league:league_id(*)
        `)
        .order('kickoff_at', { ascending: true })

      if (status !== 'all') {
        query = query.eq('status', status)
      }

      const { data: matches, error } = await query

      if (error) throw error

      if (playerId) {
        const { data: predictions } = await supabase
          .from('predictions')
          .select('*')
          .eq('player_id', playerId)
          .in('match_id', (matches ?? []).map(m => m.id))

        const predMap = new Map(predictions?.map(p => [p.match_id, p]) ?? [])

        return (matches as MatchWithPrediction[]).map(m => ({
          ...m,
          prediction: predMap.get(m.id) ?? null,
        }))
      }

      return matches as MatchWithPrediction[]
    },
  })
}

export function useMatch(matchId: string) {
  return useQuery({
    queryKey: ['match', matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:home_team_id(*),
          away_team:away_team_id(*),
          league:league_id(*)
        `)
        .eq('id', matchId)
        .single()

      if (error) throw error
      return data
    },
  })
}
