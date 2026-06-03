import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Button, Input, Select, LoadingSpinner } from '../components/ui'
import { useToast } from '../components/Toast'
import { formatDateTime, groupBy } from '../lib/utils'

export default function AdminMatchesPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
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
    stage: 'Group Stage', pts_exact: 3, pts_result: 1,
  })
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [newTeam, setNewTeam] = useState({ name: '', code: '', flag_url: '' })

   const createMatch = useMutation({
     mutationFn: async () => {
       // Validation: home and away team must be different
       if (form.home_team_id === form.away_team_id) {
         throw new Error('Home and away teams must be different')
       }
       
       const { error } = await supabase.from('matches').insert({
         ...form, pts_win: 0,
         kickoff_at: new Date(form.kickoff_at).toISOString(),
       })
       if (error) throw error
     },
     onSuccess: () => {
       setShowForm(false)
       setForm({ league_id: '', home_team_id: '', away_team_id: '', kickoff_at: '', stage: 'Group Stage', pts_exact: 3, pts_result: 1 })
       // Auto-focus league select after successful creation
       const leagueSelect = document.getElementById('league-select')
       if (leagueSelect) leagueSelect.focus()
       qc.invalidateQueries({ queryKey: ['admin-matches'] })
       toast('Match created successfully', 'success')
     },
     onError: (err: Error) => {
       toast(err.message, 'error')
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
    onSuccess: () => {
      toast('Score entered, points calculated', 'success')
      qc.invalidateQueries({ queryKey: ['admin-matches'] })
    },
    onError: (err: Error) => {
      toast(err.message, 'error')
    },
  })

  const updateMatch = useMutation({
    mutationFn: async (fields: Record<string, unknown>) => {
      const { error } = await supabase.from('matches').update(fields).eq('id', fields.id)
      if (error) throw error
    },
    onSuccess: () => {
      setEditingMatch(null)
      toast('Match updated', 'success')
      qc.invalidateQueries({ queryKey: ['admin-matches'] })
    },
    onError: (err: Error) => {
      toast(err.message, 'error')
    },
  })

  const lockMatch = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase.from('matches').update({ status: 'locked' }).eq('id', matchId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-matches'] }),
    onError: (err: Error) => toast(err.message, 'error'),
  })

  const unlockMatch = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase.from('matches').update({ status: 'upcoming', home_score: null, away_score: null }).eq('id', matchId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-matches'] }),
    onError: (err: Error) => toast(err.message, 'error'),
  })

  const deleteMatch = useMutation({
    mutationFn: async (matchId: string) => {
      await supabase.from('predictions').delete().eq('match_id', matchId)
      await supabase.from('matches').delete().eq('id', matchId)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-matches'] }),
    onError: (err: Error) => toast(err.message, 'error'),
  })

  const [scoreInputs, setScoreInputs] = useState<Record<string, { h: string; a: string }>>({})
  const [editingScore, setEditingScore] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [editingMatch, setEditingMatch] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ league_id: '', home_team_id: '', away_team_id: '', kickoff_at: '', stage: '', pts_exact: 3, pts_result: 1 })

  const startEdit = (m: Record<string, unknown>) => {
    setEditingMatch(m.id as string)
    setEditForm({
      league_id: m.league_id as string,
      home_team_id: m.home_team_id as string,
      away_team_id: m.away_team_id as string,
      kickoff_at: (m.kickoff_at as string).slice(0, 16),
      stage: (m.stage as string) || 'Group Stage',
      pts_exact: m.pts_exact as number,
      pts_result: m.pts_result as number,
    })
  }

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
          <div className="grid grid-cols-3 gap-2">
            <Select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
              {['Group Stage', 'Round of 32', 'Round of 16', 'Quarter-Final', 'Semi-Final', 'Third Place', 'Final'].map(s => <option key={s}>{s}</option>)}
            </Select>
            <Input type="number" placeholder="Exact" value={form.pts_exact} onChange={e => setForm(f => ({ ...f, pts_exact: Number(e.target.value) }))} />
            <Input type="number" placeholder="Result" value={form.pts_result} onChange={e => setForm(f => ({ ...f, pts_result: Number(e.target.value) }))} />
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
        {matches?.map(m => {
          const isEditingThis = editingScore === m.id
          const editH = isEditingThis ? scoreInputs[m.id]?.h ?? String(m.home_score ?? '') : ''
          const editA = isEditingThis ? scoreInputs[m.id]?.a ?? String(m.away_score ?? '') : ''
          const isEditingDetails = editingMatch === m.id

          if (isEditingDetails) {
            const editTeams = teamsByLeague[editForm.league_id] ?? []
            return (
              <div key={m.id} className="glass rounded-2xl p-4 space-y-3 animate-fade-in">
                <h2 className="font-semibold text-text text-sm">Edit Match</h2>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={editForm.home_team_id} onChange={e => setEditForm(f => ({ ...f, home_team_id: e.target.value }))}>
                    <option value="">Home team</option>
                    {editTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </Select>
                  <Select value={editForm.away_team_id} onChange={e => setEditForm(f => ({ ...f, away_team_id: e.target.value }))}>
                    <option value="">Away team</option>
                    {editTeams.filter(t => t.id !== editForm.home_team_id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </Select>
                </div>
                <Input type="datetime-local" value={editForm.kickoff_at} onChange={e => setEditForm(f => ({ ...f, kickoff_at: e.target.value }))} />
                <div className="grid grid-cols-3 gap-2">
                  <Select value={editForm.stage} onChange={e => setEditForm(f => ({ ...f, stage: e.target.value }))}>
                    {['Group Stage', 'Round of 32', 'Round of 16', 'Quarter-Final', 'Semi-Final', 'Third Place', 'Final'].map(s => <option key={s}>{s}</option>)}
                  </Select>
                  <Input type="number" placeholder="Exact" value={editForm.pts_exact} onChange={e => setEditForm(f => ({ ...f, pts_exact: Number(e.target.value) }))} />
                  <Input type="number" placeholder="Result" value={editForm.pts_result} onChange={e => setEditForm(f => ({ ...f, pts_result: Number(e.target.value) }))} />
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" onClick={() => updateMatch.mutate({
                    id: m.id,
                    home_team_id: editForm.home_team_id,
                    away_team_id: editForm.away_team_id,
                    kickoff_at: new Date(editForm.kickoff_at).toISOString(),
                    stage: editForm.stage,
                    pts_exact: editForm.pts_exact,
                    pts_result: editForm.pts_result,
                  })} disabled={!editForm.home_team_id || !editForm.away_team_id || !editForm.kickoff_at || updateMatch.isPending}>
                    {updateMatch.isPending ? 'Saving...' : 'Save'}
                  </Button>
                  <Button variant="ghost" onClick={() => setEditingMatch(null)}>Cancel</Button>
                </div>
              </div>
            )
          }

          return (
          <div key={m.id} className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted">{m.league?.name} — {m.stage}</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                  m.status === 'upcoming' ? 'bg-primary/10 text-primary border border-primary/20' :
                  m.status === 'locked' ? 'bg-warning/10 text-warning border border-warning/20' :
                  'bg-success/10 text-success border border-success/20'
                }`}>{m.status}</span>
                {m.status === 'upcoming' && (
                  <button className="text-xs text-warning hover:text-warning/80" onClick={() => lockMatch.mutate(m.id)} disabled={lockMatch.isPending} title="Lock match">🔒</button>
                )}
                {m.status === 'locked' && (
                  <button className="text-xs text-text-muted hover:text-text" onClick={() => unlockMatch.mutate(m.id)} disabled={unlockMatch.isPending} title="Unlock match">🔓</button>
                )}
                <button className="text-xs text-primary hover:text-primary-dark" onClick={() => startEdit(m)} title="Edit match details">✏️</button>
                <button className="text-xs text-danger hover:text-red-400" onClick={() => setConfirmDelete(m.id)} title="Delete match">🗑️</button>
              </div>
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                {m.home_team?.flag_url && <img src={m.home_team.flag_url} alt="" className="w-5 h-3.5 object-contain shrink-0" />}
                <span className="font-semibold text-sm text-text truncate">{m.home_team?.name}</span>
              </div>
              {m.status === 'finished' && m.home_score !== null && m.away_score !== null && !isEditingThis ? (
                <span className="font-bold text-primary text-lg shrink-0">{m.home_score} - {m.away_score}</span>
              ) : m.status === 'locked' && !isEditingThis ? (
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
              <span className="bg-surface-alt px-2 py-0.5 rounded text-[10px]">E:{m.pts_exact} R:{m.pts_result}</span>
              {m.status === 'locked' && !isEditingThis && (
                <div className="flex items-center gap-1 ml-auto">
                  <input type="number" min="0" max="99" className="w-10 h-8 text-center bg-surface-alt border border-border/50 rounded-lg text-sm text-text outline-none focus:border-primary transition-colors" placeholder="H"
                    value={scoreInputs[m.id]?.h ?? ''} onChange={e => setScoreInputs(r => ({ ...r, [m.id]: { ...r[m.id], h: e.target.value } }))} />
                  <span className="text-text-muted">:</span>
                  <input type="number" min="0" max="99" className="w-10 h-8 text-center bg-surface-alt border border-border/50 rounded-lg text-sm text-text outline-none focus:border-primary transition-colors" placeholder="A"
                    value={scoreInputs[m.id]?.a ?? ''} onChange={e => setScoreInputs(r => ({ ...r, [m.id]: { ...r[m.id], a: e.target.value } }))} />
                  <Button size="sm" variant="primary" className="rounded-lg"
                    onClick={() => enterResult.mutate({ matchId: m.id, homeScore: Number(scoreInputs[m.id]?.h), awayScore: Number(scoreInputs[m.id]?.a) })}
                    disabled={scoreInputs[m.id]?.h === undefined || scoreInputs[m.id]?.a === undefined || scoreInputs[m.id]?.h === '' || scoreInputs[m.id]?.a === ''}>
                    Score
                  </Button>
                </div>
              )}
              {m.status === 'finished' && !isEditingThis && (
                <Button size="sm" variant="ghost" className="rounded-lg ml-auto text-[10px] px-2 h-auto" onClick={() => {
                  setEditingScore(m.id)
                  setScoreInputs(r => ({ ...r, [m.id]: { h: String(m.home_score ?? ''), a: String(m.away_score ?? '') } }))
                }}>
                  Edit score
                </Button>
              )}
              {isEditingThis && (
                <div className="flex items-center gap-1 ml-auto">
                  <input type="number" min="0" max="99" className="w-10 h-8 text-center bg-surface-alt border border-primary/50 rounded-lg text-sm text-text outline-none focus:border-primary transition-colors" placeholder="H"
                    value={editH} onChange={e => setScoreInputs(r => ({ ...r, [m.id]: { ...r[m.id], h: e.target.value } }))} />
                  <span className="text-text-muted">:</span>
                  <input type="number" min="0" max="99" className="w-10 h-8 text-center bg-surface-alt border border-primary/50 rounded-lg text-sm text-text outline-none focus:border-primary transition-colors" placeholder="A"
                    value={editA} onChange={e => setScoreInputs(r => ({ ...r, [m.id]: { ...r[m.id], a: e.target.value } }))} />
                  <Button size="sm" variant="primary" className="rounded-lg"
                    onClick={() => {
                      enterResult.mutate({ matchId: m.id, homeScore: Number(scoreInputs[m.id]?.h), awayScore: Number(scoreInputs[m.id]?.a) })
                      setEditingScore(null)
                    }}
                    disabled={!scoreInputs[m.id]?.h || !scoreInputs[m.id]?.a}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => setEditingScore(null)}>Cancel</Button>
                </div>
              )}
            </div>
          </div>
          )
        })}
      </div>
      </div>
    </div>
  )
}
