import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Button, Input, Select, LoadingSpinner } from '../components/ui'
import { formatDateTime, groupBy } from '../lib/utils'

export default function AdminMatchesPage() {
  const qc = useQueryClient()
  const [view, setView] = useState<'upcoming' | 'locked' | 'finished' | 'all'>('upcoming')

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
      const { data } = await supabase.from('teams').select('*').order('name')
      return data ?? []
    },
  })

  const { data: matches, isLoading } = useQuery({
    queryKey: ['admin-matches', view],
    queryFn: async () => {
      let query = supabase
        .from('matches')
        .select(`
          *,
          home_team:home_team_id(*),
          away_team:away_team_id(*),
          league:league_id(*)
        `)
        .order('kickoff_at', { ascending: false })

      if (view !== 'all') query = query.eq('status', view)

      const { data } = await query
      return data ?? []
    },
  })

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    league_id: '', home_team_id: '', away_team_id: '', kickoff_at: '',
    stage: 'Group Stage', pts_exact: 3, pts_result: 1, pts_win: 1,
  })
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [newTeam, setNewTeam] = useState({ name: '', code: '', flag_url: '' })

  const createMatch = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('matches').insert({
        ...form,
        kickoff_at: new Date(form.kickoff_at).toISOString(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      setShowForm(false)
      setForm({ league_id: '', home_team_id: '', away_team_id: '', kickoff_at: '', stage: 'Group Stage', pts_exact: 3, pts_result: 1, pts_win: 1 })
      qc.invalidateQueries({ queryKey: ['admin-matches'] })
    },
  })

  const addTeam = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('teams').insert({
        league_id: form.league_id,
        name: newTeam.name,
        code: newTeam.code.toUpperCase(),
        flag_url: newTeam.flag_url || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setNewTeam({ name: '', code: '', flag_url: '' })
      setShowAddTeam(false)
      qc.invalidateQueries({ queryKey: ['teams'] })
    },
  })

  const teamsByLeague = groupBy(teams ?? [], 'league_id')

  const leagueTeams = teamsByLeague[form.league_id] ?? []

  const enterResult = useMutation({
    mutationFn: async ({ matchId, homeScore, awayScore }: { matchId: string; homeScore: number; awayScore: number }) => {
      const { error } = await supabase.rpc('calculate_match_points', {
        p_match_id: matchId,
        p_home_score: homeScore,
        p_away_score: awayScore,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-matches'] }),
  })

  const deleteMatch = useMutation({
    mutationFn: async (matchId: string) => {
      await supabase.from('predictions').delete().eq('match_id', matchId)
      await supabase.from('matches').delete().eq('id', matchId)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-matches'] }),
  })

  const [resultInputs, setResultInputs] = useState<Record<string, { h: string; a: string }>>({})
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="pb-20 max-w-3xl mx-auto">
      <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-text">Admin</h1>
            <p className="text-2xl font-bold mt-1 text-text">Matches</p>
          </div>
          <Button variant="ghost" size="sm" className="text-text border border-border/50 hover:bg-surface-alt" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Match'}
          </Button>
        </div>
      </div>

      <div className="px-4">
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {(['upcoming', 'locked', 'finished', 'all'] as const).map(v => (
          <button
            key={v}
            className={`px-3 py-1.5 text-sm rounded-xl whitespace-nowrap transition-colors ${view === v ? 'bg-primary text-white shadow-sm' : 'glass text-text-muted hover:border-border-light'}`}
            onClick={() => setView(v)}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="glass rounded-2xl p-5 mb-4 space-y-3 animate-fade-in">
          <h2 className="font-semibold text-text">New Match</h2>
          <Select value={form.league_id} onChange={e => setForm(f => ({ ...f, league_id: e.target.value }))}>
            <option value="">Select league</option>
            {leagues?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
          {form.league_id && leagueTeams.length === 0 && (
            <div className="text-sm text-warning bg-warning/10 rounded-xl p-3 border border-warning/20">
              No teams in this league. <button className="text-primary underline font-medium" onClick={() => setShowAddTeam(true)}>Add a team</button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Select value={form.home_team_id} onChange={e => setForm(f => ({ ...f, home_team_id: e.target.value }))}>
              <option value="">Home team</option>
              {leagueTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            <Select value={form.away_team_id} onChange={e => setForm(f => ({ ...f, away_team_id: e.target.value }))}>
              <option value="">Away team</option>
              {leagueTeams.filter(t => t.id !== form.home_team_id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
          {leagueTeams.length > 0 && (
            <button className="text-xs text-primary underline font-medium" onClick={() => setShowAddTeam(true)}>+ Add another team</button>
          )}
          {showAddTeam && (
            <div className="border border-border/50 rounded-xl p-4 space-y-3 glass-strong animate-fade-in">
              <div className="font-medium text-sm text-text">Quick Add Team</div>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Team name" value={newTeam.name} onChange={e => setNewTeam(t => ({ ...t, name: e.target.value }))} />
                <Input placeholder="Code" value={newTeam.code} onChange={e => setNewTeam(t => ({ ...t, code: e.target.value.toUpperCase() }))} maxLength={3} />
                <Input placeholder="Flag URL" value={newTeam.flag_url} onChange={e => setNewTeam(t => ({ ...t, flag_url: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={() => addTeam.mutate()} disabled={!newTeam.name || !newTeam.code || addTeam.isPending}>
                  {addTeam.isPending ? 'Adding...' : 'Add Team'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddTeam(false); setNewTeam({ name: '', code: '', flag_url: '' }) }}>Cancel</Button>
              </div>
            </div>
          )}
          <Input type="datetime-local" placeholder="Kickoff date/time" value={form.kickoff_at} onChange={e => setForm(f => ({ ...f, kickoff_at: e.target.value }))} />
          <div className="grid grid-cols-4 gap-2">
            <Select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
              {['Group Stage', 'Round of 32', 'Round of 16', 'Quarter-Final', 'Semi-Final', 'Third Place', 'Final'].map(s => <option key={s}>{s}</option>)}
            </Select>
            <Input type="number" placeholder="Exact" value={form.pts_exact} onChange={e => setForm(f => ({ ...f, pts_exact: Number(e.target.value) }))} />
            <Input type="number" placeholder="Result" value={form.pts_result} onChange={e => setForm(f => ({ ...f, pts_result: Number(e.target.value) }))} />
            <Input type="number" placeholder="Win" value={form.pts_win} onChange={e => setForm(f => ({ ...f, pts_win: Number(e.target.value) }))} />
          </div>
          <Button variant="primary" onClick={() => createMatch.mutate()} disabled={!form.league_id || !form.home_team_id || !form.away_team_id || !form.kickoff_at || createMatch.isPending}>
            {createMatch.isPending ? 'Creating...' : 'Create Match'}
          </Button>
        </div>
      )}

      {confirmDelete && (
        <div className="bg-danger/10 border border-danger/30 rounded-2xl p-5 mb-4 animate-fade-in">
          <div className="font-semibold text-danger mb-1">Delete Match?</div>
          <div className="text-sm text-text-muted mb-3">This will also delete all predictions for this match. Cannot be undone.</div>
          <div className="flex gap-2">
            <Button variant="danger" size="sm" onClick={() => { deleteMatch.mutate(confirmDelete); setConfirmDelete(null) }} disabled={deleteMatch.isPending}>
              {deleteMatch.isPending ? 'Deleting...' : 'Confirm Delete'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {matches?.map(m => (
          <div key={m.id} className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted">{m.league?.name} — {m.stage}</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                  m.status === 'upcoming' ? 'bg-primary/10 text-primary border border-primary/20' :
                  m.status === 'locked' ? 'bg-warning/10 text-warning border border-warning/20' :
                  'bg-success/10 text-success border border-success/20'
                }`}>{m.status}</span>
                <button className="text-xs text-danger hover:text-red-400" onClick={() => setConfirmDelete(m.id)} title="Delete match">🗑️</button>
              </div>
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                {m.home_team?.flag_url && <img src={m.home_team.flag_url} alt="" className="w-5 h-3.5 object-contain shrink-0" />}
                <span className="font-semibold text-sm text-text truncate">{m.home_team?.name}</span>
              </div>
              {m.status === 'finished' && m.home_score !== null && m.away_score !== null ? (
                <span className="font-bold text-primary text-lg shrink-0">{m.home_score} - {m.away_score}</span>
              ) : m.status === 'locked' ? (
                <span className="text-text-muted text-sm shrink-0">— : —</span>
              ) : (
                <span className="text-text-muted text-xs shrink-0">{formatDateTime(m.kickoff_at)}</span>
              )}
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sm text-text truncate">{m.away_team?.name}</span>
                {m.away_team?.flag_url && <img src={m.away_team.flag_url} alt="" className="w-5 h-3.5 object-contain shrink-0" />}
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <span className="bg-surface-alt px-2 py-0.5 rounded text-[10px]">E:{m.pts_exact} R:{m.pts_result} W:{m.pts_win}</span>
              {m.status === 'locked' && (
                <div className="flex items-center gap-1 ml-auto">
                  <input type="number" min="0" max="99" className="w-10 h-8 text-center bg-surface-alt border border-border/50 rounded-lg text-sm text-text outline-none focus:border-primary transition-colors" placeholder="H"
                    value={resultInputs[m.id]?.h ?? ''} onChange={e => setResultInputs(r => ({ ...r, [m.id]: { ...r[m.id], h: e.target.value } }))} />
                  <span className="text-text-muted">:</span>
                  <input type="number" min="0" max="99" className="w-10 h-8 text-center bg-surface-alt border border-border/50 rounded-lg text-sm text-text outline-none focus:border-primary transition-colors" placeholder="A"
                    value={resultInputs[m.id]?.a ?? ''} onChange={e => setResultInputs(r => ({ ...r, [m.id]: { ...r[m.id], a: e.target.value } }))} />
                  <Button size="sm" variant="primary" className="rounded-lg"
                    onClick={() => enterResult.mutate({ matchId: m.id, homeScore: Number(resultInputs[m.id]?.h), awayScore: Number(resultInputs[m.id]?.a) })}
                    disabled={!resultInputs[m.id]?.h || !resultInputs[m.id]?.a}>
                    Score
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  )
}
