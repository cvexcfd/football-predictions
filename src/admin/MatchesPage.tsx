import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Button, Input, LoadingSpinner } from '../components/ui'
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

  const [resultInputs, setResultInputs] = useState<Record<string, { h: string; a: string }>>({})

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-text">Matches</h1>
        <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Match'}
        </Button>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {(['upcoming', 'locked', 'finished', 'all'] as const).map(v => (
          <button
            key={v}
            className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap ${view === v ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted'}`}
            onClick={() => setView(v)}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-border shadow-sm p-4 mb-4 space-y-3">
          <h2 className="font-semibold">New Match</h2>
          <select className="w-full px-3 py-2 border border-border rounded-lg text-sm" value={form.league_id} onChange={e => setForm(f => ({ ...f, league_id: e.target.value }))}>
            <option value="">Select league</option>
            {leagues?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          {form.league_id && leagueTeams.length === 0 && (
            <div className="text-sm text-warning bg-yellow-50 rounded-lg p-3">
              No teams in this league. <button className="text-primary underline" onClick={() => setShowAddTeam(true)}>Add a team</button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <select className="px-3 py-2 border border-border rounded-lg text-sm" value={form.home_team_id} onChange={e => setForm(f => ({ ...f, home_team_id: e.target.value }))}>
              <option value="">Home team</option>
              {leagueTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select className="px-3 py-2 border border-border rounded-lg text-sm" value={form.away_team_id} onChange={e => setForm(f => ({ ...f, away_team_id: e.target.value }))}>
              <option value="">Away team</option>
              {leagueTeams.filter(t => t.id !== form.home_team_id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {leagueTeams.length > 0 && (
            <button className="text-xs text-primary underline" onClick={() => setShowAddTeam(true)}>+ Add another team</button>
          )}
          {showAddTeam && (
            <div className="border border-border rounded-lg p-3 space-y-2 bg-gray-50">
              <div className="font-medium text-sm">Quick Add Team</div>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Team name" value={newTeam.name} onChange={e => setNewTeam(t => ({ ...t, name: e.target.value }))} />
                <Input placeholder="Code (e.g. BAR)" value={newTeam.code} onChange={e => setNewTeam(t => ({ ...t, code: e.target.value.toUpperCase() }))} maxLength={3} />
                <Input placeholder="Flag URL (optional)" value={newTeam.flag_url} onChange={e => setNewTeam(t => ({ ...t, flag_url: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={() => addTeam.mutate()} disabled={!newTeam.name || !newTeam.code || addTeam.isPending}>
                  {addTeam.isPending ? 'Adding...' : 'Add Team'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddTeam(false); setNewTeam({ name: '', code: '', flag_url: '' }) }}>Cancel</Button>
              </div>
            </div>
          )}
          <Input type="datetime-local" value={form.kickoff_at} onChange={e => setForm(f => ({ ...f, kickoff_at: e.target.value }))} />
          <div className="grid grid-cols-4 gap-2">
            <select className="px-2 py-2 border border-border rounded-lg text-sm" value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
              {['Group Stage', 'Round of 32', 'Round of 16', 'Quarter-Final', 'Semi-Final', 'Third Place', 'Final'].map(s => <option key={s}>{s}</option>)}
            </select>
            <Input type="number" placeholder="Exact" value={form.pts_exact} onChange={e => setForm(f => ({ ...f, pts_exact: Number(e.target.value) }))} />
            <Input type="number" placeholder="Result" value={form.pts_result} onChange={e => setForm(f => ({ ...f, pts_result: Number(e.target.value) }))} />
            <Input type="number" placeholder="Win" value={form.pts_win} onChange={e => setForm(f => ({ ...f, pts_win: Number(e.target.value) }))} />
          </div>
          <Button variant="primary" onClick={() => createMatch.mutate()} disabled={!form.league_id || !form.home_team_id || !form.away_team_id || !form.kickoff_at || createMatch.isPending}>
            {createMatch.isPending ? 'Creating...' : 'Create Match'}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {matches?.map(m => (
          <div key={m.id} className="bg-white rounded-lg border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-text-muted">{m.league?.name} — {m.stage}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-text-muted font-medium">{m.status}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {m.home_team?.flag_url && <img src={m.home_team.flag_url} alt="" className="w-5 h-3.5 object-contain" />}
                <span className="font-medium text-sm">{m.home_team?.name}</span>
              </div>
              {m.status === 'finished' && m.home_score !== null && m.away_score !== null ? (
                <span className="font-bold text-primary text-lg">{m.home_score} - {m.away_score}</span>
              ) : m.status === 'locked' ? (
                <span className="text-text-muted text-sm">Locked</span>
              ) : (
                <span className="text-text-muted text-xs">{formatDateTime(m.kickoff_at)}</span>
              )}
              <div className="flex items-center gap-2">
                {m.away_team?.flag_url && <img src={m.away_team.flag_url} alt="" className="w-5 h-3.5 object-contain" />}
                <span className="font-medium text-sm">{m.away_team?.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <span>E:{m.pts_exact} R:{m.pts_result} W:{m.pts_win}</span>
              {m.status === 'locked' && (
                <div className="flex items-center gap-1 ml-auto">
                  <input type="number" min="0" max="99" className="w-10 h-8 text-center border border-border rounded text-sm" placeholder="H"
                    value={resultInputs[m.id]?.h ?? ''} onChange={e => setResultInputs(r => ({ ...r, [m.id]: { ...r[m.id], h: e.target.value } }))} />
                  <span>:</span>
                  <input type="number" min="0" max="99" className="w-10 h-8 text-center border border-border rounded text-sm" placeholder="A"
                    value={resultInputs[m.id]?.a ?? ''} onChange={e => setResultInputs(r => ({ ...r, [m.id]: { ...r[m.id], a: e.target.value } }))} />
                  <Button size="sm" variant="primary"
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
  )
}
