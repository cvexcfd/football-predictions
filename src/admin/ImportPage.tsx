import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Button, Select, LoadingSpinner } from '../components/ui'

const TEMPLATE = `[
  {
    "league_id": "REPLACE_WITH_LEAGUE_UUID",
    "home_team_id": "REPLACE_WITH_TEAM_UUID",
    "away_team_id": "REPLACE_WITH_TEAM_UUID",
    "kickoff_at": "2026-06-11T16:00:00Z",
    "stage": "Group Stage",
    "pts_exact": 3,
    "pts_result": 1,
    "pts_win": 1
  }
]`

export default function AdminImportPage() {
  const qc = useQueryClient()
  const [leagueId, setLeagueId] = useState('')
  const [json, setJson] = useState('')
  const [result, setResult] = useState<{ ok: number; errors: string[] } | null>(null)

  const { data: leagues } = useQuery({
    queryKey: ['leagues'],
    queryFn: async () => {
      const { data } = await supabase.from('leagues').select('*').eq('is_active', true)
      return data ?? []
    },
  })

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data } = await supabase.from('teams').select('id, name, code, league_id').order('name')
      return data ?? []
    },
  })

  const importMatches = useMutation({
    mutationFn: async () => {
      const rows = JSON.parse(json)
      if (!Array.isArray(rows) || rows.length === 0) throw new Error('JSON must be a non-empty array')

      let ok = 0
      const errors: string[] = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (!row.home_team_id || !row.away_team_id || !row.kickoff_at) {
          errors.push(`Row ${i + 1}: missing required fields (home_team_id, away_team_id, kickoff_at)`)
          continue
        }
        if (row.home_team_id === row.away_team_id) {
          errors.push(`Row ${i + 1}: home and away teams must be different`)
          continue
        }
        const { error } = await supabase.from('matches').insert({
          league_id: row.league_id || leagueId,
          home_team_id: row.home_team_id,
          away_team_id: row.away_team_id,
          kickoff_at: row.kickoff_at,
          stage: row.stage || 'Group Stage',
          pts_exact: row.pts_exact ?? 3,
          pts_result: row.pts_result ?? 1,
          pts_win: row.pts_win ?? 1,
        })
        if (error) {
          errors.push(`Row ${i + 1}: ${error.message}`)
        } else {
          ok++
        }
      }

      return { ok, errors }
    },
    onSuccess: (data) => {
      setResult(data)
      if (data.ok > 0) qc.invalidateQueries({ queryKey: ['admin-matches'] })
    },
    onError: (err: Error) => {
      setResult({ ok: 0, errors: [err.message] })
    },
  })

  const teamsByLeague = new Map<string, typeof teams>()
  if (teams) {
    for (const t of teams) {
      const arr = teamsByLeague.get(t.league_id) ?? []
      arr.push(t)
      teamsByLeague.set(t.league_id, arr)
    }
  }

  return (
    <div className="pb-20 max-w-3xl mx-auto">
      <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
        <h1 className="text-lg font-semibold text-text">Admin</h1>
        <p className="text-2xl font-bold mt-1 text-text">Bulk Import</p>
        <p className="text-sm text-text-muted mt-1">Import multiple matches at once via JSON</p>
      </div>

      <div className="px-4">
        {result && (
          <div className={`rounded-2xl p-5 mb-4 animate-fade-in ${result.errors.length === 0 ? 'bg-success/10 border border-success/30' : 'bg-warning/10 border border-warning/30'}`}>
            <div className="font-semibold text-text mb-1">
              {result.ok} match{result.ok !== 1 ? 'es' : ''} imported
              {result.errors.length > 0 ? `, ${result.errors.length} error${result.errors.length !== 1 ? 's' : ''}` : ''}
            </div>
            {result.errors.length > 0 && (
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <div key={i} className="text-xs text-danger bg-danger/5 rounded-lg px-3 py-1.5">{e}</div>
                ))}
              </div>
            )}
            <button className="text-xs text-text-muted mt-2 underline" onClick={() => setResult(null)}>Dismiss</button>
          </div>
        )}

        <div className="glass rounded-2xl p-5 mb-4">
          <h2 className="font-semibold text-sm text-text mb-3">1. Select League</h2>
          <Select value={leagueId} onChange={e => setLeagueId(e.target.value)}>
            <option value="">Default league for rows without league_id</option>
            {leagues?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </div>

        {leagueId && teamsByLeague.get(leagueId) && (
          <div className="glass rounded-2xl p-5 mb-4">
            <h2 className="font-semibold text-sm text-text mb-2">Available Teams</h2>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {teamsByLeague.get(leagueId)!.map(t => (
                <span key={t.id} className="text-[10px] bg-surface-alt text-text-muted px-2 py-0.5 rounded-full font-mono">
                  {t.code || t.name}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-text-dim mt-2">Use team IDs from the table below. Copy the UUID from your database.</p>
          </div>
        )}

        <div className="glass rounded-2xl p-5 mb-4">
          <h2 className="font-semibold text-sm text-text mb-3">2. Paste JSON</h2>
          <textarea
            className="w-full h-48 bg-surface-alt border border-border/50 rounded-xl p-3 text-xs font-mono text-text outline-none resize-y focus:border-primary transition-colors placeholder:text-text-dim"
            placeholder={TEMPLATE}
            value={json}
            onChange={e => setJson(e.target.value)}
            spellCheck={false}
          />
          <div className="flex gap-2 mt-3">
            <Button variant="primary" onClick={() => importMatches.mutate()} disabled={!json.trim() || importMatches.isPending}>
              {importMatches.isPending ? 'Importing...' : 'Import Matches'}
            </Button>
            <Button variant="ghost" onClick={() => setJson('')}>Clear</Button>
          </div>
        </div>

        {leagueId && teamsByLeague.get(leagueId) && (
          <div className="glass rounded-2xl p-5 mb-4">
            <h2 className="font-semibold text-sm text-text mb-3">3. Team ID Reference</h2>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {teamsByLeague.get(leagueId)!.map(t => (
                <div key={t.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-surface-alt transition-colors">
                  <span className="font-medium text-text">{t.name}</span>
                  <span className="font-mono text-text-dim text-[10px] ml-2 truncate max-w-[200px]">{t.id}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
