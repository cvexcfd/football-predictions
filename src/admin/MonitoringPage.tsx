import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { LoadingSpinner } from '../components/ui'
import { formatTime } from '../lib/utils'

export default function AdminMonitoringPage() {
  const now = new Date()
  const todayStr = now.toLocaleDateString('en-US', { timeZone: 'Africa/Casablanca', weekday: 'long', month: 'long', day: 'numeric' })
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowStr = tomorrow.toLocaleDateString('en-US', { timeZone: 'Africa/Casablanca', weekday: 'long', month: 'long', day: 'numeric' })

  const { data: players } = useQuery({
    queryKey: ['monitoring-players'],
    queryFn: async () => {
      const { data } = await supabase.from('players').select('id, name, is_admin').order('name')
      return data ?? []
    },
  })

  const { data: rawMatches, isLoading } = useQuery({
    queryKey: ['monitoring-matches'],
    queryFn: async () => {
      const { data } = await supabase
        .from('matches')
        .select(`
          id, kickoff_at, stage, status,
          home_team:home_team_id(code, name, flag_url),
          away_team:away_team_id(code, name, flag_url)
        `)
        .eq('status', 'upcoming')
        .gte('kickoff_at', now.toISOString())
        .lte('kickoff_at', new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString())
        .order('kickoff_at', { ascending: true })

      return data ?? []
    },
  })

  const matchIds = rawMatches?.map(m => m.id) ?? []

  const { data: predictions } = useQuery({
    queryKey: ['monitoring-predictions', matchIds],
    queryFn: async () => {
      if (matchIds.length === 0) return {}
      const { data } = await supabase
        .from('predictions')
        .select('match_id, player_id, pred_home, pred_away')
        .in('match_id', matchIds)

      const map: Record<string, Record<string, { pred_home: number; pred_away: number }>> = {}
      for (const p of data ?? []) {
        if (!map[p.match_id]) map[p.match_id] = {}
        map[p.match_id][p.player_id] = { pred_home: p.pred_home, pred_away: p.pred_away }
      }
      return map
    },
    enabled: matchIds.length > 0,
  })

  if (isLoading) return <LoadingSpinner />

  const totalSlots = (rawMatches?.length ?? 0) * (players?.length ?? 0)
  const filledSlots = Object.values(predictions ?? {}).reduce((sum, pm) => sum + Object.keys(pm).length, 0)
  const pct = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0

  const todayMatches = rawMatches?.filter(m => {
    const d = new Date(m.kickoff_at).toLocaleDateString('en-US', { timeZone: 'Africa/Casablanca' })
    const td = now.toLocaleDateString('en-US', { timeZone: 'Africa/Casablanca' })
    return d === td
  }) ?? []

  const tomorrowMatches = rawMatches?.filter(m => {
    const d = new Date(m.kickoff_at).toLocaleDateString('en-US', { timeZone: 'Africa/Casablanca' })
    const td = tomorrow.toLocaleDateString('en-US', { timeZone: 'Africa/Casablanca' })
    return d === td
  }) ?? []

  const nonAdminPlayers = players?.filter(p => !p.is_admin) ?? []
  const playersWithMissing: string[] = []
  if (todayMatches.length > 0 && predictions) {
    for (const p of nonAdminPlayers) {
      const hasAll = todayMatches.every(m => predictions[m.id]?.[p.id])
      if (!hasAll) playersWithMissing.push(p.name)
    }
  }

  function renderMatrix(matches: typeof rawMatches) {
    if (!matches || matches.length === 0) return null
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-2 py-2 text-left font-semibold text-text-muted text-[10px] uppercase tracking-wider whitespace-nowrap">Match</th>
              <th className="px-2 py-2 text-left font-semibold text-text-muted text-[10px] uppercase tracking-wider whitespace-nowrap">Time</th>
              {nonAdminPlayers.map(p => (
                <th key={p.id} className="px-2 py-2 text-center font-semibold text-text-muted text-[10px] uppercase tracking-wider whitespace-nowrap">{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matches.map(m => {
              const matchPreds = predictions?.[m.id] ?? {}
              return (
                <tr key={m.id} className="border-b border-border/30 last:border-0 hover:bg-surface-alt/40 transition-colors">
                  <td className="px-2 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {(m.home_team as any)?.flag_url && <img src={(m.home_team as any).flag_url} alt="" className="w-4 h-3 object-contain shrink-0" />}
                      <span className="font-medium text-text text-xs">{(m.home_team as any)?.code}</span>
                      <span className="text-text-muted text-[10px]">vs</span>
                      <span className="font-medium text-text text-xs">{(m.away_team as any)?.code}</span>
                      {(m.away_team as any)?.flag_url && <img src={(m.away_team as any).flag_url} alt="" className="w-4 h-3 object-contain shrink-0" />}
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-xs text-text-muted whitespace-nowrap">{formatTime(m.kickoff_at)}</td>
                  {nonAdminPlayers.map(p => {
                    const pred = matchPreds[p.id]
                    return (
                      <td key={p.id} className="px-2 py-2.5 text-center">
                        {pred ? (
                          <span className="inline-flex items-center gap-0.5 text-xs font-bold text-success">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            {pred.pred_home}-{pred.pred_away}
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-danger/10 text-danger">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="pb-20 max-w-4xl mx-auto">
      <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
        <h1 className="text-lg font-semibold text-text">Admin</h1>
        <p className="text-2xl font-bold mt-1 text-text">Match Prediction Status</p>
      </div>

      <div className="px-4">
        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="glass rounded-2xl p-3 text-center">
            <div className="text-xl font-bold text-primary">{todayMatches.length}</div>
            <div className="text-[10px] text-text-muted mt-0.5">Today's Matches</div>
          </div>
          <div className="glass rounded-2xl p-3 text-center">
            <div className="text-xl font-bold text-accent">{tomorrowMatches.length}</div>
            <div className="text-[10px] text-text-muted mt-0.5">Tomorrow's Matches</div>
          </div>
          <div className="glass rounded-2xl p-3 text-center">
            <div className="text-xl font-bold text-success">{pct}%</div>
            <div className="text-[10px] text-text-muted mt-0.5">Predictions Filled</div>
          </div>
          <div className="glass rounded-2xl p-3 text-center">
            <div className="text-xl font-bold text-warning">{playersWithMissing.length}</div>
            <div className="text-[10px] text-text-muted mt-0.5">Players Missing</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="glass rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text">{filledSlots} / {totalSlots} predictions submitted</span>
            <span className="text-xs text-text-muted">{pct}%</span>
          </div>
          <div className="w-full h-2 bg-surface-alt rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Missing players alert */}
        {playersWithMissing.length > 0 && (
          <div className="bg-warning/10 border border-warning/20 rounded-2xl p-4 mb-4">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-warning shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <span className="text-xs font-semibold text-warning">Players who haven't predicted today's matches:</span>
                <span className="text-xs text-warning ml-1">{playersWithMissing.join(', ')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Today's matches */}
        {todayMatches.length > 0 && (
          <div className="glass rounded-2xl p-4 mb-4">
            <h2 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Today — {todayStr}
            </h2>
            {renderMatrix(todayMatches)}
          </div>
        )}

        {/* Tomorrow's matches */}
        {tomorrowMatches.length > 0 && (
          <div className="glass rounded-2xl p-4 mb-4">
            <h2 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Tomorrow — {tomorrowStr}
            </h2>
            {renderMatrix(tomorrowMatches)}
          </div>
        )}

        {rawMatches?.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="text-text-muted text-sm">No upcoming matches in the next 48 hours</div>
          </div>
        )}
      </div>
    </div>
  )
}
