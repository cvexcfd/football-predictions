import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { LoadingSpinner, EmptyState, Badge, SkeletonCard, Button } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/Toast'
import { GroupStandings } from '../components/GroupStandings'

export default function ResultsPage() {
  const { player } = useAuth()
  const qc = useQueryClient()
  const { toast } = useToast()
  const isAdmin = player?.is_admin

   const { data: groupStageMatches, isLoading: groupStageMatchesLoading } = useQuery({
     queryKey: ['finished-group-matches'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('matches')
         .select('*, home_team:home_team_id(*), away_team:away_team_id(*)')
         .eq('status', 'finished')
         .eq('stage', 'Group Stage')
         .order('kickoff_at', { ascending: false })

       if (error) throw error
       return data as Array<Record<string, unknown>>
     },
   })

   const { data: allFinishedMatches, isLoading: allFinishedMatchesLoading } = useQuery({
     queryKey: ['all-finished-matches'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('matches')
         .select('*, home_team:home_team_id(*), away_team:away_team_id(*)')
         .eq('status', 'finished')
         .order('kickoff_at', { ascending: false })

       if (error) throw error
       return data as Array<Record<string, unknown>>
     },
   })

   const { data: teams, isLoading: teamsLoading } = useQuery({
     queryKey: ['teams'],
     queryFn: async () => {
       const { data, error } = await supabase.from('teams').select('*')
       if (error) throw error
       return data as Array<Record<string, unknown>>
     },
   })

  const [expandedMatch, setExpandedMatch] = useState<string | null>(null)
  const [predictions, setPredictions] = useState<Record<string, unknown[]>>({})
  const [editingScore, setEditingScore] = useState<string | null>(null)
  const [scoreInputs, setScoreInputs] = useState<Record<string, { h: string; a: string }>>({})

  const enterResult = useMutation({
    mutationFn: async ({ matchId, homeScore, awayScore }: { matchId: string; homeScore: number; awayScore: number }) => {
      const { error } = await supabase.rpc('calculate_match_points', {
        p_match_id: matchId, p_home_score: homeScore, p_away_score: awayScore,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast('Score saved, points recalculated', 'success')
      setEditingScore(null)
      qc.invalidateQueries({ queryKey: ['finished-group-matches'] })
      qc.invalidateQueries({ queryKey: ['all-finished-matches'] })
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
    },
    onError: (err: Error) => {
      toast(err.message, 'error')
    },
  })

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

   const isLoading = groupStageMatchesLoading || allFinishedMatchesLoading || teamsLoading;
   
   if (isLoading) {
     return (
       <div className="pb-20 max-w-3xl mx-auto">
         <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
           <div className="h-4 w-24 bg-border rounded mb-2 animate-shimmer" />
           <div className="h-8 w-32 bg-border rounded mb-1 animate-shimmer" />
           <div className="h-4 w-28 bg-border rounded animate-shimmer" />
         </div>
         <div className="px-4 space-y-3">
           {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
         </div>
       </div>
     )
   }

   if (!allFinishedMatches || allFinishedMatches.length === 0) {
    return (
      <div className="pb-20 max-w-3xl mx-auto">
        <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
          <h1 className="text-lg font-semibold opacity-90 text-text">World Cup 2026</h1>
          <p className="text-2xl font-bold mt-1 text-text">Results</p>
        </div>
        <EmptyState
          icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
          title="No finished matches yet"
          description="Results will appear here once matches have been played"
        />
      </div>
    )
  }

   return (
     <div className="pb-20 max-w-3xl mx-auto">
       <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
         <h1 className="text-lg font-semibold opacity-90 text-text">World Cup 2026</h1>
         <p className="text-2xl font-bold mt-1 text-text">Results</p>
          <p className="text-sm text-text-muted mt-1">{allFinishedMatches.length} matches finished</p>
       </div>

       <div className="px-4 space-y-3">
         {/* Group Standings Section */}
         {!teamsLoading && teams && teams.length > 0 && (
           <>
             <h2 className="text-lg font-semibold mb-4 text-text">Group Standings</h2>
             <div className="grid gap-6">
               {/* Groups A through L */}
               {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(group => (
                 <GroupStandings 
                   key={group} 
                   group={group} 
                   teams={teams as any[]} 
                    matches={groupStageMatches as any[]} 
                 />
               ))}
             </div>
             <hr className="my-8 border-border/50" />
           </>
         )}
         
          {/* Individual Match Results */}
           {allFinishedMatches.map(m => {
            const isEditing = editingScore === m.id
            return (
              <div key={m.id as string} className="glass rounded-2xl overflow-hidden animate-fade-in">
                <div className="w-full p-4">
                  <div className="flex items-center justify-between text-left mb-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {!!(m.home_team as Record<string, unknown> | null)?.flag_url && <img src={(m.home_team as Record<string, unknown>).flag_url as string} alt="" className="w-5 h-3.5 object-contain shrink-0" />}
                        <span className="font-semibold text-sm text-text truncate">{(m.home_team as Record<string, unknown> | null)?.name as string}</span>
                      </div>
                      {isEditing ? (
                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <input type="number" min="0" max="99"
                            className="w-10 h-9 text-center bg-surface-alt border-2 border-primary/50 rounded-lg text-base font-bold text-text outline-none"
                            value={scoreInputs[m.id as string]?.h ?? String(m.home_score as number ?? '')}
                            onChange={e => setScoreInputs(r => ({ ...r, [m.id as string]: { ...r[m.id as string], h: e.target.value } }))} />
                          <span className="text-text-muted font-bold">:</span>
                          <input type="number" min="0" max="99"
                            className="w-10 h-9 text-center bg-surface-alt border-2 border-primary/50 rounded-lg text-base font-bold text-text outline-none"
                            value={scoreInputs[m.id as string]?.a ?? String(m.away_score as number ?? '')}
                            onChange={e => setScoreInputs(r => ({ ...r, [m.id as string]: { ...r[m.id as string], a: e.target.value } }))} />
                        </div>
                      ) : (
                        <span className={`font-bold text-lg shrink-0 ${isAdmin ? 'cursor-pointer hover:text-primary-dark' : ''} text-primary`}
                          onClick={isAdmin ? (e => { e.stopPropagation(); setEditingScore(m.id as string); setScoreInputs(r => ({ ...r, [m.id as string]: { h: String(m.home_score as number ?? ''), a: String(m.away_score as number ?? '') } })) }) : undefined}>
                          {m.home_score as number ?? '?'} — {m.away_score as number ?? '?'}
                        </span>
                      )}
                      <div className="flex items-center gap-2 min-w-0">
                        {!!(m.away_team as Record<string, unknown> | null)?.flag_url && <img src={(m.away_team as Record<string, unknown>).flag_url as string} alt="" className="w-5 h-3.5 object-contain shrink-0" />}
                        <span className="font-semibold text-sm text-text truncate">{(m.away_team as Record<string, unknown> | null)?.name as string}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      {isEditing ? (
                        <>
                          <Button size="sm" variant="primary" className="rounded-lg text-[11px] px-2 h-7"
                            onClick={e => { e.stopPropagation(); enterResult.mutate({ matchId: m.id as string, homeScore: Number(scoreInputs[m.id as string]?.h), awayScore: Number(scoreInputs[m.id as string]?.a) }) }}
                            disabled={enterResult.isPending || !scoreInputs[m.id as string]?.h || !scoreInputs[m.id as string]?.a}>
                            {enterResult.isPending ? '...' : 'Save'}
                          </Button>
                          <Button size="sm" variant="ghost" className="rounded-lg text-[11px] px-2 h-7"
                            onClick={e => { e.stopPropagation(); setEditingScore(null) }}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          {m.stage && <span className="text-[10px] text-text-muted bg-surface-alt px-2 py-0.5 rounded-full">{m.stage as string}</span>}
                          <button onClick={() => toggleExpand(m.id as string)} className="p-0.5">
                            <svg className={`w-4 h-4 text-text-muted transition-transform duration-200 ${expandedMatch === m.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {expandedMatch === m.id && (
                  <div className="border-t border-border/50 px-4 py-3 space-y-1.5 glass-strong">
                    {(predictions[m.id as string] ?? []).length ? (
                      (predictions[m.id as string] as Array<{ id: string; player: { name: string }; pred_home: number; pred_away: number; pts_total: number; is_absent: boolean; badge?: { name: string } | null }>).map(p => (
                        <div key={p.id} className="flex items-center justify-between text-sm py-1.5">
                          <span className="font-medium text-text text-sm">{p.player.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-text-muted text-xs">{p.is_absent ? '—' : `${p.pred_home} - ${p.pred_away}`}</span>
                            {p.badge && <span className="text-[10px] text-text-muted bg-surface-alt px-1.5 py-0.5 rounded">{p.badge.name}</span>}
                            <span className={`font-bold text-sm ${p.pts_total > 0 ? 'text-success' : 'text-text-dim'}`}>
                              {p.pts_total > 0 ? `+${p.pts_total}` : '0'}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-text-muted py-2">No predictions for this match</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
}
