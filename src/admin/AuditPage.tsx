import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { LoadingSpinner } from '../components/ui'
import { formatDateTime } from '../lib/utils'

export default function AdminAuditPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-log'],
    queryFn: async () => {
      const { data } = await supabase
        .from('prediction_audit_log')
        .select('*, player:player_id(name), match:match_id(home_team_id, away_team_id)')
        .order('changed_at', { ascending: false })
        .limit(200)

      if (!data) return []

      // Fetch team names
      const teamIds = new Set<string>()
      data.forEach(l => {
        if (l.match?.home_team_id) teamIds.add(l.match.home_team_id)
        if (l.match?.away_team_id) teamIds.add(l.match.away_team_id)
      })
      const { data: teams } = await supabase.from('teams').select('id, name').in('id', [...teamIds])
      const teamMap = new Map(teams?.map(t => [t.id, t.name]) ?? [])

      return data.map(l => ({
        ...l,
        matchLabel: `${teamMap.get(l.match?.home_team_id) ?? '?'} vs ${teamMap.get(l.match?.away_team_id) ?? '?'}`,
      }))
    },
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-text mb-4">Audit Log</h1>

      <div className="bg-white rounded-lg border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="px-3 py-2 text-left font-semibold text-text-muted">Player</th>
              <th className="px-3 py-2 text-left font-semibold text-text-muted">Action</th>
              <th className="px-3 py-2 text-left font-semibold text-text-muted hidden sm:table-cell">Match</th>
              <th className="px-3 py-2 text-left font-semibold text-text-muted hidden sm:table-cell">Old</th>
              <th className="px-3 py-2 text-left font-semibold text-text-muted hidden sm:table-cell">New</th>
              <th className="px-3 py-2 text-left font-semibold text-text-muted">When</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map(l => (
              <tr key={l.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{l.player?.name ?? '?'}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${l.action === 'create' ? 'bg-green-100 text-success' : 'bg-blue-100 text-primary'}`}>
                    {l.action}
                  </span>
                </td>
                <td className="px-3 py-2 text-text-muted text-xs hidden sm:table-cell max-w-[150px] truncate">{l.matchLabel}</td>
                <td className="px-3 py-2 text-text-muted hidden sm:table-cell">{l.old_pred_home}-{l.old_pred_away}</td>
                <td className="px-3 py-2 text-text-muted hidden sm:table-cell">{l.new_pred_home}-{l.new_pred_away}</td>
                <td className="px-3 py-2 text-text-muted text-xs whitespace-nowrap">{formatDateTime(l.changed_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
