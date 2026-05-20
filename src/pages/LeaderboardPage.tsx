import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { supabase } from '../lib/supabase'
import { LoadingSpinner } from '../components/ui'
import { formatDateTime } from '../lib/utils'
import type { MatchHistoryEntry } from '../types'

interface LiveMatch {
  id: string
  kickoff_at: string
  stage: string | null
  home_team: { name: string; flag_url: string | null; code: string | null } | null
  away_team: { name: string; flag_url: string | null; code: string | null } | null
  predictions: Array<{
    player_id: string
    pred_home: number
    pred_away: number
    player: { name: string } | null
    badge: { name: string; type: string; factor: number } | null
  }>
}

export default function LeaderboardPage() {
  const { data: leaderboard, isLoading } = useLeaderboard()

  const { data: liveMatches } = useQuery({
    queryKey: ['live-matches'],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 130 * 60 * 1000).toISOString()

      const { data: rawMatches } = await supabase
        .from('matches')
        .select(`
          id, kickoff_at, stage,
          home_team:home_team_id(name, flag_url, code),
          away_team:away_team_id(name, flag_url, code)
        `)
        .eq('status', 'locked')
        .gte('kickoff_at', cutoff)
        .order('kickoff_at', { ascending: true })

      if (!rawMatches || rawMatches.length === 0) return []

      const matches = rawMatches.map((m: Record<string, unknown>) => ({
        id: m.id as string,
        kickoff_at: m.kickoff_at as string,
        stage: m.stage as string | null,
        home_team: Array.isArray(m.home_team) ? (m.home_team as Array<Record<string, unknown>>)[0] ?? null : m.home_team as Record<string, unknown> | null,
        away_team: Array.isArray(m.away_team) ? (m.away_team as Array<Record<string, unknown>>)[0] ?? null : m.away_team as Record<string, unknown> | null,
      }))

      const matchIds = matches.map(m => m.id)

      const { data: rawPreds } = await supabase
        .from('predictions')
        .select(`
          match_id, player_id, pred_home, pred_away, badge_id_used,
          player:player_id(name),
          badge:badge_id_used(name, type, factor)
        `)
        .in('match_id', matchIds)

      const predByMatch = new Map<string, Array<{
        player_id: string
        pred_home: number
        pred_away: number
        player: { name: string } | null
        badge: { name: string; type: string; factor: number } | null
      }>>()
      for (const p of rawPreds ?? []) {
        const pp = p as unknown as {
          match_id: string
          player_id: string
          pred_home: number
          pred_away: number
          player: Array<{ name: string }> | { name: string } | null
          badge: Array<{ name: string; type: string; factor: number }> | { name: string; type: string; factor: number } | null
        }
        const entry = {
          player_id: pp.player_id,
          pred_home: pp.pred_home,
          pred_away: pp.pred_away,
          player: Array.isArray(pp.player) ? pp.player[0] ?? null : (pp.player as { name: string } | null),
          badge: Array.isArray(pp.badge) ? pp.badge[0] ?? null : (pp.badge as { name: string; type: string; factor: number } | null),
        }
        const arr = predByMatch.get(pp.match_id) ?? []
        arr.push(entry)
        predByMatch.set(pp.match_id, arr)
      }

      return (matches ?? []).map(m => ({
        ...m,
        predictions: predByMatch.get(m.id) ?? [],
      })) as LiveMatch[]
    },
    refetchInterval: 30_000,
  })

  const { data: matchHistory } = useQuery({
    queryKey: ['match-history'],
    queryFn: async () => {
      const { data: rawMatches } = await supabase
        .from('matches')
        .select(`
          id, kickoff_at, stage, home_score, away_score,
          home_team:home_team_id(name, code, flag_url),
          away_team:away_team_id(name, code, flag_url)
        `)
        .eq('status', 'finished')
        .order('kickoff_at', { ascending: false })
        .limit(5)

      if (!rawMatches || rawMatches.length === 0) return []

      const matches = rawMatches.map((m: Record<string, unknown>) => ({
        id: m.id as string,
        kickoff_at: m.kickoff_at as string,
        stage: m.stage as string | null,
        home_score: m.home_score as number | null,
        away_score: m.away_score as number | null,
        home_team: Array.isArray(m.home_team) ? (m.home_team as Array<Record<string, unknown>>)[0] ?? null : m.home_team as Record<string, unknown> | null,
        away_team: Array.isArray(m.away_team) ? (m.away_team as Array<Record<string, unknown>>)[0] ?? null : m.away_team as Record<string, unknown> | null,
      }))

      const matchIds = matches.map(m => m.id)

      const { data: rawPreds } = await supabase
        .from('predictions')
        .select(`
          match_id, player_id, pred_home, pred_away, pts_total,
          player:player_id(name)
        `)
        .in('match_id', matchIds)

      const predByMatch = new Map<string, Array<{
        player_id: string
        player_name: string
        pred_home: number
        pred_away: number
        pts_total: number
      }>>()
      for (const p of rawPreds ?? []) {
        const pp = p as unknown as {
          match_id: string
          player_id: string
          pred_home: number
          pred_away: number
          pts_total: number
          player: Array<{ name: string }> | { name: string } | null
        }
        const entry = {
          player_id: pp.player_id,
          player_name: Array.isArray(pp.player) ? pp.player[0]?.name ?? '?' : (pp.player as { name: string } | null)?.name ?? '?',
          pred_home: pp.pred_home,
          pred_away: pp.pred_away,
          pts_total: pp.pts_total,
        }
        const arr = predByMatch.get(pp.match_id) ?? []
        arr.push(entry)
        predByMatch.set(pp.match_id, arr)
      }

      return matches.map(m => ({
        ...m,
        predictions: predByMatch.get(m.id) ?? [],
      })) as MatchHistoryEntry[]
    },
    refetchInterval: 30_000,
  })

  if (isLoading) return <LoadingSpinner />

  const hasLive = liveMatches && liveMatches.length > 0
  const hasHistory = matchHistory && matchHistory.length > 0

  return (
    <div className="pb-20 max-w-3xl mx-auto">
      <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
        <h1 className="text-lg font-semibold text-text">World Cup 2026</h1>
        <p className="text-2xl font-bold mt-1 text-text">Leaderboard</p>
        <p className="text-sm text-text-muted mt-1">
          {leaderboard ? `${leaderboard.length} players` : 'Rankings'}
        </p>
      </div>

      <div className="px-4">
        {hasLive && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse-dot" />
              Live Matches
            </h2>
            <div className="space-y-3">
              {liveMatches!.map(m => (
                <div key={m.id} className="glass rounded-2xl overflow-hidden animate-fade-in">
                  <div className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-red-500/10 to-orange-500/10 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      {m.stage && <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest bg-surface px-2 py-0.5 rounded-full">{m.stage}</span>}
                      <span className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse-dot" />
                        LIVE
                      </span>
                    </div>
                    <span className="text-[10px] text-text-muted">
                      {new Date(m.kickoff_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {m.home_team?.flag_url && <img src={m.home_team.flag_url} alt="" className="w-5 h-3.5 object-contain shrink-0" />}
                        <span className="font-semibold text-sm text-text truncate">{m.home_team?.name}</span>
                      </div>
                      <span className="font-bold text-sm text-text-muted shrink-0 mx-2">vs</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-sm text-text truncate">{m.away_team?.name}</span>
                        {m.away_team?.flag_url && <img src={m.away_team.flag_url} alt="" className="w-5 h-3.5 object-contain shrink-0" />}
                      </div>
                    </div>

                    <div className="space-y-1">
                      {m.predictions.length === 0 ? (
                        <div className="text-xs text-text-muted text-center py-2">No predictions yet</div>
                      ) : (
                        m.predictions.map(p => (
                          <div key={p.player_id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-surface-alt transition-colors">
                            <span className="font-medium text-text">{p.player?.name ?? '?'}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-primary">{p.pred_home}-{p.pred_away}</span>
                              {p.badge && (
                                <span className="text-[10px] text-text-muted bg-surface-alt px-1.5 py-0.5 rounded-full">
                                  {p.badge.name} ({p.badge.type === 'multiplier' ? '×' : '+'}{p.badge.factor})
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!leaderboard || leaderboard.length === 0) ? (
          <div className="text-center py-12 text-text-muted">No players yet</div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="border-b border-border/50">
                  <th className="px-2 sm:px-4 py-3 text-left font-semibold text-text-muted text-xs w-14 sm:w-auto">#</th>
                  <th className="px-2 sm:px-4 py-3 text-left font-semibold text-text-muted text-xs">Player</th>
                  <th className="px-2 sm:px-4 py-3 text-right font-semibold text-text-muted text-xs w-16 sm:w-auto">Pts</th>
                  <th className="px-2 sm:px-4 py-3 text-right font-semibold text-text-muted text-xs w-16 hidden sm:table-cell">Badges</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <tr key={entry.id} className="border-b border-border/50 last:border-0 hover:bg-surface-alt/50 transition-colors animate-rank-enter" style={{ animationDelay: `${i * 40}ms` }}>
                    <td className="px-2 sm:px-4 py-3 sm:py-3.5 font-bold">
                      {i === 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 bg-gold/20 rounded-full text-xs sm:text-sm shrink-0">🥇</span>
                      ) : i === 1 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 bg-surface-alt rounded-full text-xs sm:text-sm shrink-0">🥈</span>
                      ) : i === 2 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 bg-gold/10 rounded-full text-xs sm:text-sm shrink-0">🥉</span>
                      ) : (
                        <span className="text-text-muted text-xs">#{i + 1}</span>
                      )}
                      <span className="ml-0.5">
                        {entry.rankDelta !== undefined && entry.rankDelta > 0 && (
                          <span className="text-success text-[9px] sm:text-[10px] leading-none" title={`+${entry.rankDelta}`}>▲</span>
                        )}
                        {entry.rankDelta !== undefined && entry.rankDelta < 0 && (
                          <span className="text-danger text-[9px] sm:text-[10px] leading-none" title={`${entry.rankDelta}`}>▼</span>
                        )}
                        {entry.rankDelta !== undefined && entry.rankDelta === 0 && (
                          <span className="text-text-dim text-[9px] sm:text-[10px] leading-none">—</span>
                        )}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-3 sm:py-3.5 font-semibold text-text truncate">
                      <Link to={`/player/${entry.id}`} className="hover:text-primary transition-colors">
                        {entry.name}
                      </Link>
                      {entry.streak !== undefined && entry.streak >= 2 && (
                        <span className="ml-1 text-warning text-xs" title={`${entry.streak} correct in a row`}>🔥</span>
                      )}
                    </td>
                    <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-right font-bold text-primary">{entry.total_points}</td>
                    <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-right text-text-muted text-xs hidden sm:table-cell">{entry.badge_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-text-muted mt-4 text-center">
          Tiebreaker: earliest first prediction wins
        </p>

        {hasHistory && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              Recent Results
            </h2>
            <div className="space-y-3">
              {matchHistory!.map(m => (
                <div key={m.id} className="glass rounded-2xl overflow-hidden animate-fade-in">
                  <div className="px-4 py-2.5 flex items-center justify-between bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      {m.stage && <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest bg-surface px-2 py-0.5 rounded-full">{m.stage}</span>}
                    </div>
                    <span className="text-[10px] text-text-muted">{formatDateTime(m.kickoff_at)}</span>
                  </div>

                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                        <span className="font-semibold text-sm text-text truncate">{m.home_team?.name ?? '?'}</span>
                        {m.home_team?.flag_url && <img src={m.home_team.flag_url} alt="" className="w-5 h-3.5 object-contain shrink-0" />}
                      </div>
                      <span className="font-bold text-lg text-text mx-3 shrink-0">
                        {m.home_score}-{m.away_score}
                      </span>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {m.away_team?.flag_url && <img src={m.away_team.flag_url} alt="" className="w-5 h-3.5 object-contain shrink-0" />}
                        <span className="font-semibold text-sm text-text truncate">{m.away_team?.name ?? '?'}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {m.predictions.length === 0 ? (
                        <div className="text-xs text-text-muted text-center py-2">No predictions</div>
                      ) : (
                        m.predictions.map(p => (
                          <div key={p.player_id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-surface-alt transition-colors">
                            <span className="font-medium text-text">{p.player_name}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-text-dim">{p.pred_home}-{p.pred_away}</span>
                              {p.pts_total > 0 ? (
                                <span className="text-success font-bold text-[11px]">+{p.pts_total}</span>
                              ) : (
                                <span className="text-text-dim text-[11px]">0</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
