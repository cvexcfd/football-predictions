import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PlayerBadge } from '../types'

export function usePlayerBadges(playerId: string) {
  return useQuery({
    queryKey: ['player-badges', playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_badges')
        .select('*, badge:badge_id(*)')
        .eq('player_id', playerId)
        .gt('quantity', 0)

      if (error) throw error
      return data as PlayerBadge[]
    },
  })
}
