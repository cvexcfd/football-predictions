import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Prediction } from '../types'

export function usePrediction(matchId: string, playerId: string) {
  return useQuery({
    queryKey: ['prediction', matchId, playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('predictions')
        .select('*, badge:badge_id_used(*)')
        .eq('match_id', matchId)
        .eq('player_id', playerId)
        .maybeSingle()

      if (error) throw error
      return data as Prediction | null
    },
  })
}

export function useSubmitPrediction() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      playerId, matchId, predHome, predAway, badgeIdUsed,
    }: {
      playerId: string
      matchId: string
      predHome: number
      predAway: number
      badgeIdUsed?: string | null
    }) => {
      const { error } = await supabase.rpc('submit_prediction', {
        p_player_id: playerId,
        p_match_id: matchId,
        p_pred_home: predHome,
        p_pred_away: predAway,
        p_badge_id: badgeIdUsed ?? null,
      })

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matches'] })
      qc.invalidateQueries({ queryKey: ['prediction'] })
    },
  })
}

export function usePredictionsForMatch(matchId: string) {
  return useQuery({
    queryKey: ['predictions', matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('predictions')
        .select('*, player:player_id(name), badge:badge_id_used(*)')
        .eq('match_id', matchId)

      if (error) throw error
      return data as (Prediction & { player: { name: string } })[]
    },
  })
}
