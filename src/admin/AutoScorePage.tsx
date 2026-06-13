import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Button, LoadingSpinner, Badge } from '../components/ui'
import { useToast } from '../components/Toast'
import { formatTime } from '../lib/utils'

interface AutoScoreConfig {
  enabled: boolean
  last_run_at: string | null
  last_run_result: string | null
}

interface LogEntry {
  id: string
  match_id: string
  external_id: number
  action: string
  details: string | null
  success: boolean
  created_at: string
}

interface FailedMatch {
  external_id: number
  match_id: string
  error_count: number
  last_error: string
  last_error_at: string
}

export default function AutoScorePage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [logLimit] = useState(50)

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['auto-score-config'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('auto_score_get_config')
      if (error) throw error
      return data?.[0] as AutoScoreConfig
    },
    refetchInterval: 10000,
  })

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['auto-score-logs', logLimit],
    queryFn: async () => {
      const { data } = await supabase
        .from('auto_score_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(logLimit)
      return (data ?? []) as LogEntry[]
    },
    refetchInterval: 10000,
  })

  const { data: failedMatches, isLoading: failedLoading } = useQuery({
    queryKey: ['auto-score-failed-matches'],
    queryFn: async () => {
      const { data } = await supabase
        .from('auto_score_logs')
        .select('match_id, external_id, action, details, success, created_at')
        .eq('success', false)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
      if (!data) return []
      const byMatch = new Map<number, { match_id: string; error_count: number; last_error: string; last_error_at: string }>()
      for (const log of data as LogEntry[]) {
        const eid = log.external_id
        if (!byMatch.has(eid)) {
          byMatch.set(eid, { match_id: log.match_id ?? '', error_count: 0, last_error: '', last_error_at: log.created_at })
        }
        const m = byMatch.get(eid)!
        m.error_count++
        if (log.details) m.last_error = log.details
        m.last_error_at = log.created_at
      }
      return Array.from(byMatch.entries()).map(([external_id, m]) => ({ external_id, ...m })).sort((a, b) => b.error_count - a.error_count).slice(0, 10)
    },
    refetchInterval: 30000,
  })

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase.rpc('auto_score_set_enabled', { p_enabled: enabled })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auto-score-config'] })
      toast('Auto-score ' + (config?.enabled ? 'disabled' : 'enabled'), 'success')
    },
    onError: (err: Error) => toast(err.message, 'error'),
  })

  const runNowMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('auto_score_matches_now')
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auto-score-config'] })
      qc.invalidateQueries({ queryKey: ['auto-score-logs'] })
      qc.invalidateQueries({ queryKey: ['auto-score-failed-matches'] })
      toast('Auto-score completed', 'success')
    },
    onError: (err: Error) => toast('Auto-score failed: ' + err.message, 'error'),
  })

  const resetConfigMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('auto_score_config').update({ last_run_at: null, last_run_result: null }).eq('id', true)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auto-score-config'] })
      toast('Config reset', 'success')
    },
    onError: (err: Error) => toast(err.message, 'error'),
  })

  if (configLoading) return <LoadingSpinner />

  return (
    <div className="pb-20 max-w-3xl mx-auto">
      <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
        <h1 className="text-lg font-semibold text-text">Admin</h1>
        <p className="text-2xl font-bold mt-1 text-text">Auto Score</p>
      </div>

      <div className="px-4 space-y-4">
        {/* Status + Toggle */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold text-text">Auto-Scoring</div>
              <div className="text-xs text-text-muted mt-0.5">
                {config?.enabled ? 'Runs every 10 minutes via pg_cron' : 'Disabled — scores must be entered manually'}
              </div>
            </div>
            <button
              onClick={() => toggleMutation.mutate(!config?.enabled)}
              disabled={toggleMutation.isPending}
              className={`relative w-16 h-8 rounded-full transition-all duration-300 ${
                config?.enabled ? 'bg-green-500 shadow-lg shadow-green-500/30' : 'bg-red-500 shadow-lg shadow-red-500/30'
              }`}
            >
              <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all duration-300 ${
                config?.enabled ? 'left-9' : 'left-1'
              }`} />
            </button>
          </div>

          {config?.last_run_at && (
            <div className="flex items-center justify-between text-xs text-text-muted bg-surface-alt rounded-xl px-3 py-2 mb-3">
              <span>Last run: {formatTime(config.last_run_at)}</span>
              {config.last_run_result && (
                <span className="font-mono max-w-[200px] truncate" title={config.last_run_result}>{config.last_run_result}</span>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="primary" onClick={() => runNowMutation.mutate()} disabled={runNowMutation.isPending} className="flex-1">
              {runNowMutation.isPending ? 'Running...' : 'Run Auto-Score Now'}
            </Button>
            <Button variant="ghost" onClick={() => resetConfigMutation.mutate()} disabled={resetConfigMutation.isPending}>Reset</Button>
          </div>
        </div>

        {/* Failure Alerts */}
        {!failedLoading && failedMatches && failedMatches.length > 0 && (
          <div className="glass rounded-2xl p-5 border border-danger/30">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-danger shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h2 className="text-sm font-semibold text-danger">Auto-Score Failures (last 24h)</h2>
            </div>
            <div className="divide-y divide-border/30">
              {failedMatches.map((m, i) => (
                <div key={i} className="py-2 flex items-start gap-3">
                  <Badge variant="danger">#{m.external_id}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-text truncate">{m.last_error || 'Unknown error'}</div>
                    <div className="text-[10px] text-text-muted mt-0.5">{m.error_count} error{m.error_count > 1 ? 's' : ''} • last: {formatTime(m.last_error_at)}</div>
                  </div>
                  <a href="/admin/matches" className="text-[10px] text-primary underline shrink-0">Set score manually →</a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logs */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text">Logs</h2>
            <span className="text-[10px] text-text-muted">Last {logLimit}</span>
          </div>

          {logsLoading ? (
            <LoadingSpinner />
          ) : !logs || logs.length === 0 ? (
            <div className="text-sm text-text-muted text-center py-6">No logs yet</div>
          ) : (
            <div className="divide-y divide-border/30 max-h-[500px] overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-start gap-3">
                  <Badge variant={log.success ? (log.action === 'auto_score' ? 'success' : 'default') : 'danger'}>
                    {log.action}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-text truncate">{log.details ?? `${log.action} for match ${log.external_id}`}</div>
                    <div className="text-[10px] text-text-muted mt-0.5">#{log.external_id} • {formatTime(log.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
