import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { LoadingSpinner } from '../components/ui'
import { useState } from 'react'

export default function ResultsPage() {
  const { data: matches, isLoading } = useQuery({
    queryKey: ['finished-matches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:home_team_id(*),
          away_team:away_team_id(*),
          league:league_id(*)
        `)
        .eq('status', 'finished')
        .order('kickoff_at', { ascending: false })

      if (error) throw error
      return data
    },
  })

  const [expandedMatch, setExpandedMatch] = useState<string | null>(null)
  const [predictions, setPredictions] = useState<Record<string, unknown[]>>({})

  const toggleExpand = async (matchId: string) => {
    if (expandedMatch === matchId) {
      setExpandedMatch(null)
      return
    }
    setExpandedMatch(matchId)

    if (!predictions[matchId]) {
      const { data } = await supabase
        .from('predictions')
        .select('*, player:player_id(name), badge:badge_id_used(name)')
        .eq('match_id', matchId)
        .order('pts_total', { ascending: false })

      setPredictions(prev => ({ ...prev, [matchId]: data ?? [] }))
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="p-4 pb-20 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-text mb-4">Results</h1>

      {(!matches || matches.length === 0) ? (
        <div className="text-center py-12 text-text-muted">No finished matches yet</div>
      ) : (
        <div className="space-y-3">
          {matches.map(m => (
            <div key={m.id} className="bg-white rounded-lg border border-border shadow-sm overflow-hidden">
              <button
                className="w-full p-4 flex items-center justify-between text-left"
                onClick={() => toggleExpand(m.id)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {m.home_team?.flag_url && <img src={m.home_team.flag_url} alt="" className="w-5 h-3.5 object-contain shrink-0" />}
                    <span className="font-medium text-sm truncate">{m.home_team?.name}</span>
                  </div>
                  <span className="font-bold text-primary shrink-0">
                    {m.home_score} - {m.away_score}
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    {m.away_team?.flag_url && <img src={m.away_team.flag_url} alt="" className="w-5 h-3.5 object-contain shrink-0" />}
                    <span className="font-medium text-sm truncate">{m.away_team?.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <span className="text-xs text-text-muted">{m.stage}</span>
                  <svg className={`w-4 h-4 text-text-muted transition-transform ${expandedMatch === m.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </button>

              {expandedMatch === m.id && (
                <div className="border-t border-border px-4 py-3 space-y-2">
                  {predictions[m.id]?.length ? (
                    (predictions[m.id] as Array<{ id: string; player: { name: string }; pred_home: number; pred_away: number; pts_total: number; badge?: { name: string } | null }>).map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{p.player.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-text-muted">
                            {p.pred_home} - {p.pred_away}
                          </span>
                          {p.badge && <span className="text-xs text-text-muted">({p.badge.name})</span>}
                          <span className="font-bold text-primary">+{p.pts_total}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-text-muted">No predictions for this match</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
