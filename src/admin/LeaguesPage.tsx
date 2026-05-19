import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Button, Input, LoadingSpinner } from '../components/ui'

export default function AdminLeaguesPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [season, setSeason] = useState('')
  const [desc, setDesc] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data: leagues, isLoading } = useQuery({
    queryKey: ['leagues'],
    queryFn: async () => {
      const { data } = await supabase.from('leagues').select('*').order('created_at', { ascending: false })
      return data
    },
  })

  const createLeague = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('leagues').insert({ name, season, description: desc })
      if (error) throw error
    },
    onSuccess: () => {
      setName(''); setSeason(''); setDesc('')
      qc.invalidateQueries({ queryKey: ['leagues'] })
    },
  })

  const deleteLeague = useMutation({
    mutationFn: async (leagueId: string) => {
      const { data: matches } = await supabase.from('matches').select('id').eq('league_id', leagueId)
      if (matches && matches.length > 0) {
        const matchIds = matches.map(m => m.id)
        await supabase.from('predictions').delete().in('match_id', matchIds)
        await supabase.from('matches').delete().in('id', matchIds)
      }
      await supabase.from('teams').delete().eq('league_id', leagueId)
      await supabase.from('leagues').delete().eq('id', leagueId)
    },
    onSuccess: () => {
      setConfirmDelete(null)
      qc.invalidateQueries({ queryKey: ['leagues'] })
    },
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="pb-20 max-w-3xl mx-auto">
      <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
        <h1 className="text-lg font-semibold text-text">Admin</h1>
        <p className="text-2xl font-bold mt-1 text-text">Leagues</p>
      </div>

      <div className="px-4">
        {confirmDelete && (
          <div className="bg-danger/10 border border-danger/30 rounded-2xl p-5 mb-4 animate-fade-in">
            <div className="font-semibold text-danger mb-1">Delete League?</div>
            <div className="text-sm text-text-muted mb-3">This will also delete all teams, matches, and predictions in this league. Cannot be undone.</div>
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={() => deleteLeague.mutate(confirmDelete)} disabled={deleteLeague.isPending}>
                {deleteLeague.isPending ? 'Deleting...' : 'Confirm Delete'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="glass rounded-2xl p-4 mb-4">
          <h2 className="font-semibold text-sm text-text mb-3">Create League</h2>
          <div className="space-y-3">
            <Input placeholder="Name (e.g. FIFA World Cup 2026)" value={name} onChange={e => setName(e.target.value)} />
            <Input placeholder="Season (e.g. 2026)" value={season} onChange={e => setSeason(e.target.value)} />
            <Input placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
            <Button variant="primary" onClick={() => createLeague.mutate()} disabled={!name || createLeague.isPending}>
              {createLeague.isPending ? 'Creating...' : 'Create League'}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {leagues?.map(l => (
            <div key={l.id} className="glass rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-text">{l.name}</div>
                <div className="text-xs text-text-muted mt-0.5">{l.season}{l.description ? ` — ${l.description}` : ''}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`text-xs px-2.5 py-1 rounded-full font-medium ${l.is_active ? 'bg-success/10 text-success border border-success/20' : 'bg-surface-alt text-text-muted border border-border/50'}`}>
                  {l.is_active ? 'Active' : 'Inactive'}
                </div>
                <button className="text-xs text-danger hover:text-red-400" onClick={() => setConfirmDelete(l.id)} title="Delete league">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
