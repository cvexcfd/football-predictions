import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { LoadingSpinner, Badge as UIBadge } from '../components/ui'
import { formatDateTime } from '../lib/utils'

export default function PlayerPage() {
  const { playerId } = useParams<{ playerId: string }>()

  const { data: player, isLoading } = useQuery({
    queryKey: ['player-profile', playerId],
    queryFn: async () => {
      const { data: p } = await supabase.from('players').select('*').eq('id', playerId).single()
      if (!p) throw new Error('Player not found')
      return p
    },
    enabled: !!playerId,
  })

  const { data: players } = useQuery({
    queryKey: ['all-players-ranks'],
    queryFn: async () => {
      const { data } = await supabase.from('players').select('id, total_points').order('total_points', { ascending: false })
      return data ?? []
    },
    enabled: !!playerId,
  })

  const { data: predictions } = useQuery({
    queryKey: ['player-predictions', playerId],
    queryFn: async () => {
      const { data: raw } = await supabase
        .from('predictions')
        .select(`
          *,
          badge:badge_id_used(name, type, factor),
          match:match_id(*,
            home_team:home_team_id(name, code, flag_url),
            away_team:away_team_id(name, code, flag_url)
          )
        `)
        .eq('player_id', playerId!)
        .order('submitted_at', { ascending: false })

      if (!raw) return []

      return raw.map((r: Record<string, unknown>) => {
        const match = (Array.isArray(r.match) ? (r.match as Array<Record<string, unknown>>)[0] : r.match) as Record<string, unknown> | undefined
        const homeTeam = match ? (Array.isArray(match.home_team) ? (match.home_team as Array<Record<string, unknown>>)[0] : match.home_team) : null
        const awayTeam = match ? (Array.isArray(match.away_team) ? (match.away_team as Array<Record<string, unknown>>)[0] : match.away_team) : null
        const badge = Array.isArray(r.badge) ? (r.badge as Array<Record<string, unknown>>)[0] ?? null : (r.badge as Record<string, unknown> | null)
        return {
          id: r.id as string,
          match_id: r.match_id as string,
          pred_home: r.pred_home as number,
          pred_away: r.pred_away as number,
          pred_result: r.pred_result as string,
          pts_total: r.pts_total as number,
          submitted_at: r.submitted_at as string,
          badge,
          match: match ? {
            id: match.id as string,
            status: match.status as string,
            kickoff_at: match.kickoff_at as string,
            stage: match.stage as string | null,
            home_score: match.home_score as number | null,
            away_score: match.away_score as number | null,
            home_team: homeTeam as { name: string; code: string; flag_url: string | null } | null,
            away_team: awayTeam as { name: string; code: string; flag_url: string | null } | null,
          } : null,
        }
      })
    },
    enabled: !!playerId,
  })

  const { data: badges } = useQuery({
    queryKey: ['player-badges', playerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('player_badges')
        .select('*, badge:badge_id(name, type, factor)')
        .eq('player_id', playerId!)
      return data ?? []
    },
    enabled: !!playerId,
  })

  if (isLoading) return <LoadingSpinner />
  if (!player) return <div className="text-center py-12 text-text-muted">Player not found</div>

  const rank = (players ?? []).findIndex(p => p.id === playerId) + 1
  const totalPreds = predictions?.length ?? 0
  const finishedPreds = predictions?.filter(p => p.match?.status === 'finished') ?? []
  const correctResults = finishedPreds.filter(p => p.pts_total > 0)
  const exactScores = finishedPreds.filter(p => {
    const m = p.match
    if (!m || m.home_score === null || m.away_score === null) return false
    return p.pred_home === m.home_score && p.pred_away === m.away_score
  })

  let streak = 0
  const sortedFinished = [...finishedPreds]
    .sort((a, b) => {
      const ka = a.match?.kickoff_at ?? ''
      const kb = b.match?.kickoff_at ?? ''
      return new Date(kb).getTime() - new Date(ka).getTime()
    })
  for (const p of sortedFinished) {
    if (p.pts_total > 0) streak++
    else break
  }

  const accuracy = finishedPreds.length > 0 ? Math.round((correctResults.length / finishedPreds.length) * 100) : 0

  return (
    <div className="pb-20 max-w-3xl mx-auto animate-fade-in">
      <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
        <Link to="/leaderboard" className="text-xs text-primary mb-2 inline-block">&larr; Leaderboard</Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text">{player.name}</h1>
            <p className="text-sm text-text-muted mt-0.5">
              #{rank} &middot; {player.total_points} pts
              {streak >= 2 && <span className="ml-2 text-warning" title={`${streak} correct in a row`}>🔥{streak}</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="glass rounded-2xl p-3 text-center">
            <div className="text-lg font-bold text-primary">{totalPreds}</div>
            <div className="text-[10px] text-text-muted">Predictions</div>
          </div>
          <div className="glass rounded-2xl p-3 text-center">
            <div className="text-lg font-bold text-success">{correctResults.length}</div>
            <div className="text-[10px] text-text-muted">Correct</div>
          </div>
          <div className="glass rounded-2xl p-3 text-center">
            <div className="text-lg font-bold text-gold">{accuracy}%</div>
            <div className="text-[10px] text-text-muted">Accuracy</div>
          </div>
          <div className="glass rounded-2xl p-3 text-center">
            <div className="text-lg font-bold text-accent">{exactScores.length}</div>
            <div className="text-[10px] text-text-muted">Exact</div>
          </div>
        </div>

        {badges && badges.length > 0 && (
          <div className="glass rounded-2xl p-4 mb-4">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Badges</h2>
            <div className="flex flex-wrap gap-2">
              {badges.map((pb: Record<string, unknown>) => {
                const b = (Array.isArray(pb.badge) ? (pb.badge as Array<Record<string, unknown>>)[0] : pb.badge) as { name: string; type: string; factor: number } | null
                if (!b) return null
                return (
                  <span key={pb.id as string} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${b.type === 'multiplier' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-accent/10 text-accent border border-accent/20'}`}>
                    {b.name} ({b.type === 'multiplier' ? '×' : '+'}{b.factor})
                  </span>
                )
              })}
            </div>
          </div>
        )}

        <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-primary rounded-full" />
          Prediction History
        </h2>

        {(() => {
          const visiblePreds = (predictions ?? []).filter(p => p.match?.status === 'locked' || p.match?.status === 'finished')
          return (
        <div className="space-y-2">
          {visiblePreds.length === 0 && (
            <div className="text-center py-8 text-text-muted text-sm">No predictions yet</div>
          )}
          {visiblePreds.map(p => {
            const match = p.match
            const isFinished = match?.status === 'finished'
            const isCorrect = isFinished && p.pts_total > 0
            const isExact = isFinished && match?.home_score !== null && match?.away_score !== null &&
              p.pred_home === match.home_score && p.pred_away === match.away_score

            return (
              <div key={p.id} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest bg-surface px-2 py-0.5 rounded-full">{match?.stage ?? '?'}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      isExact ? 'bg-success/10 text-success border border-success/20' :
                      isCorrect ? 'bg-warning/10 text-warning border border-warning/20' :
                      isFinished ? 'bg-danger/10 text-danger border border-danger/20' :
                      'bg-surface-alt text-text-muted'
                    }`}>
                      {isExact ? 'Exact!' : isCorrect ? 'Correct' : isFinished ? 'Wrong' : match?.status === 'locked' ? 'Locked' : 'Open'}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-muted">{formatDateTime(p.submitted_at)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                    <span className="font-semibold text-sm text-text truncate">{match?.home_team?.name ?? '?'}</span>
                    {match?.home_team?.flag_url && <img src={match.home_team.flag_url} alt="" className="w-5 h-3.5 object-contain shrink-0" />}
                  </div>

                  <div className="mx-3 text-center shrink-0">
                    {isFinished && match?.home_score !== null && match?.away_score !== null ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-text-dim">Pred:</span>
                        <span className={`font-bold text-sm ${isExact ? 'text-success' : isCorrect ? 'text-warning' : 'text-text-dim'}`}>
                          {p.pred_home}-{p.pred_away}
                        </span>
                        <span className="text-text-dim text-xs mx-1">|</span>
                        <span className="text-xs text-text-dim">Actual:</span>
                        <span className="font-bold text-sm text-text">{match.home_score}-{match.away_score}</span>
                      </div>
                    ) : (
                      <span className="font-bold text-sm text-primary">{p.pred_home}-{p.pred_away}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {match?.away_team?.flag_url && <img src={match.away_team.flag_url} alt="" className="w-5 h-3.5 object-contain shrink-0" />}
                    <span className="font-semibold text-sm text-text truncate">{match?.away_team?.name ?? '?'}</span>
                  </div>
                </div>

                {p.badge && (
                  <div className="mt-2 text-[10px] text-text-muted bg-surface-alt rounded-lg px-2 py-1 inline-flex items-center gap-1">
                    Used: {(p.badge as { name: string; type: string; factor: number }).name} ({(p.badge as { name: string; type: string; factor: number }).type === 'multiplier' ? '×' : '+'}{(p.badge as { name: string; type: string; factor: number }).factor})
                  </div>
                )}

                {isFinished && (
                  <div className="mt-2 text-right">
                    <span className={`text-xs font-bold ${p.pts_total > 0 ? 'text-success' : 'text-text-dim'}`}>
                      {p.pts_total > 0 ? `+${p.pts_total} pts` : '0 pts'}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        )})()}
      </div>
    </div>
  )
}
