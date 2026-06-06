import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Button, Input, LoadingSpinner } from '../components/ui'
import { useToast } from '../components/Toast'
import { formatDateTime } from '../lib/utils'

export default function AdminAuditPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [deleteDays, setDeleteDays] = useState(7)

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-log'],
    queryFn: async () => {
      const { data } = await supabase
        .from('prediction_audit_log')
        .select('*, player:player_id(name), match:match_id(home_team_id, away_team_id)')
        .order('changed_at', { ascending: false })
        .limit(200)

      if (!data) return []

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

  const deleteOldLogs = useMutation({
    mutationFn: async (days: number) => {
      const { data, error } = await supabase.rpc('delete_old_audit_logs', { p_days: days })
      if (error) throw error
      return data
    },
    onSuccess: (count) => {
      toast(`Deleted ${count} old log entries`, 'success')
      qc.invalidateQueries({ queryKey: ['audit-log'] })
    },
    onError: (err: Error) => {
      toast(err.message, 'error')
    },
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="pb-20 max-w-3xl mx-auto">
      <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
        <h1 className="text-lg font-semibold text-text">Admin</h1>
        <p className="text-2xl font-bold mt-1 text-text">Audit Log</p>
      </div>

      <div className="px-4">
        <div className="glass rounded-2xl p-4 mb-4 flex items-center gap-3">
          <span className="text-sm text-text font-medium shrink-0">Delete old logs</span>
          <Input
            type="number" min="1" max="365"
            className="w-20"
            value={deleteDays}
            onChange={e => setDeleteDays(Number(e.target.value))}
          />
          <span className="text-xs text-text-muted">days</span>
          <Button
            variant="danger" size="sm"
            onClick={() => deleteOldLogs.mutate(deleteDays)}
            disabled={deleteOldLogs.isPending || deleteDays < 1}
          >
            {deleteOldLogs.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>

        <div className="glass rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border/50 bg-surface-alt">
                <th className="px-3 py-2.5 text-left font-semibold text-text-muted text-xs">Player</th>
                <th className="px-3 py-2.5 text-left font-semibold text-text-muted text-xs">Action</th>
                <th className="px-3 py-2.5 text-left font-semibold text-text-muted text-xs hidden sm:table-cell">Match</th>
                <th className="px-3 py-2.5 text-left font-semibold text-text-muted text-xs hidden sm:table-cell">Old</th>
                <th className="px-3 py-2.5 text-left font-semibold text-text-muted text-xs hidden sm:table-cell">New</th>
                <th className="px-3 py-2.5 text-left font-semibold text-text-muted text-xs">When</th>
              </tr>
            </thead>
            <tbody>
              {logs?.map(l => (
                <tr key={l.id} className="border-b border-border/50 last:border-0 hover:bg-surface-alt/50 transition-colors">
                  <td className="px-3 py-2.5 font-medium text-sm text-text">{l.player?.name ?? '?'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${l.action === 'create' ? 'bg-success/10 text-success border border-success/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                      {l.action}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-text-muted text-xs hidden sm:table-cell max-w-[150px] truncate">{l.matchLabel}</td>
                  <td className="px-3 py-2.5 text-text-muted text-xs hidden sm:table-cell">{l.old_pred_home}-{l.old_pred_away}</td>
                  <td className="px-3 py-2.5 text-text-muted text-xs hidden sm:table-cell font-medium">{l.new_pred_home}-{l.new_pred_away}</td>
                  <td className="px-3 py-2.5 text-text-muted text-xs whitespace-nowrap">{formatDateTime(l.changed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
