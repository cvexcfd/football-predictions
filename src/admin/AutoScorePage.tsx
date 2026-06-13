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
      toast('Auto-score completed', 'success')
    },
    onError: (err: Error) => {
      toast('Auto-score failed: ' + err.message, 'error')
    },
  })

  const resetConfigMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('auto_score_config')
        .update({ last_run_at: null, last_run_result: null })
        .eq('id', true)
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
                config?.enabled
                  ? 'bg-green-500 shadow-lg shadow-green-500/30'
                  : 'bg-red-500 shadow-lg shadow-red-500/30'
              }`}
            >
              <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all duration-300 ${
                config?.enabled ? 'left-9' : 'left-1'
              }`} />
            </button>
          </div>

          {/* Last run info */}
          {config?.last_run_at && (
            <div className="flex items-center justify-between text-xs text-text-muted bg-surface-alt rounded-xl px-3 py-2 mb-3">
              <span>Last run: {formatTime(config.last_run_at)}</span>
              {config.last_run_result && (
                <span className="font-mono max-w-[200px] truncate" title={config.last_run_result}>
                  {config.last_run_result}
                </span>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={() => runNowMutation.mutate()}
              disabled={runNowMutation.isPending}
              className="flex-1"
            >
              {runNowMutation.isPending ? 'Running...' : 'Run Auto-Score Now'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => resetConfigMutation.mutate()}
              disabled={resetConfigMutation.isPending}
            >
              Reset
            </Button>
          </div>
        </div>

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
                    <div className="text-[10px] text-text-muted mt-0.5">
                      #{log.external_id} • {formatTime(log.created_at)}
                    </div>
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
