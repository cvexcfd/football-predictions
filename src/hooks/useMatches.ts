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

      if (playerId) {
        const [matchResult, predResult] = await Promise.all([
          query,
          supabase.from('predictions').select('*').eq('player_id', playerId),
        ])

        if (matchResult.error) throw matchResult.error

        const matches = matchResult.data ?? []
        const predictions = predResult.data ?? []
        const predMap = new Map(predictions.map(p => [p.match_id, p]))

        return (matches as MatchWithPrediction[]).map(m => ({
          ...m,
          prediction: predMap.get(m.id) ?? null,
        }))
      }

      const { data: matches, error } = await query
      if (error) throw error
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
