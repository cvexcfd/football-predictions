import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Button, Input, LoadingSpinner } from '../components/ui'
import { generateAccessCode } from '../lib/utils'

export default function AdminPlayersPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [newCode, setNewCode] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data: players, isLoading } = useQuery({
    queryKey: ['admin-players'],
    queryFn: async () => {
      const { data } = await supabase.from('players').select('*').order('created_at', { ascending: false })
      return data
    },
  })

  const { data: badgeCounts } = useQuery({
    queryKey: ['admin-badge-counts'],
    queryFn: async () => {
      const { data } = await supabase.from('player_badges').select('player_id, quantity')
      const map = new Map<string, number>()
      data?.forEach(b => map.set(b.player_id, (map.get(b.player_id) ?? 0) + b.quantity))
      return map
    },
  })

  const createPlayer = useMutation({
    mutationFn: async () => {
      const code = generateAccessCode()
      const { error } = await supabase.from('players').insert({ name, access_code: code })
      if (error) throw error
      return code
    },
    onSuccess: (code) => {
      setNewCode(code)
      setName('')
      qc.invalidateQueries({ queryKey: ['admin-players'] })
    },
  })

  const deletePlayer = useMutation({
    mutationFn: async (playerId: string) => {
      await supabase.from('predictions').delete().eq('player_id', playerId)
      await supabase.from('player_badges').delete().eq('player_id', playerId)
      await supabase.from('players').delete().eq('id', playerId)
    },
    onSuccess: () => {
      setConfirmDelete(null)
      qc.invalidateQueries({ queryKey: ['admin-players'] })
      qc.invalidateQueries({ queryKey: ['admin-badge-counts'] })
    },
  })

  const resetCode = useMutation({
    mutationFn: async (playerId: string) => {
      const code = generateAccessCode()
      const { error } = await supabase.from('players').update({ access_code: code }).eq('id', playerId)
      if (error) throw error
      return code
    },
    onSuccess: (code, playerId) => {
      setNewCode(`${players?.find(p => p.id === playerId)?.name}: ${code}`)
      qc.invalidateQueries({ queryKey: ['admin-players'] })
    },
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="pb-20 max-w-3xl mx-auto">
      <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
        <h1 className="text-lg font-semibold text-text">Admin</h1>
        <p className="text-2xl font-bold mt-1 text-text">Players</p>
      </div>

      <div className="px-4">
        {newCode && (
          <div className="bg-success/10 border border-success/30 rounded-2xl p-5 mb-4 animate-fade-in">
            <div className="font-semibold text-success mb-1">Access Code</div>
            <div className="text-sm text-text font-mono">{newCode}</div>
            <button className="text-xs text-text-muted mt-2 underline" onClick={() => setNewCode(null)}>Dismiss</button>
          </div>
        )}

        {confirmDelete && (
          <div className="bg-danger/10 border border-danger/30 rounded-2xl p-5 mb-4 animate-fade-in">
            <div className="font-semibold text-danger mb-1">Delete Player?</div>
            <div className="text-sm text-text-muted mb-3">This will also remove all predictions and badges for this player. This cannot be undone.</div>
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={() => deletePlayer.mutate(confirmDelete)} disabled={deletePlayer.isPending}>
                {deletePlayer.isPending ? 'Deleting...' : 'Confirm Delete'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="glass rounded-2xl p-4 mb-4">
          <h2 className="font-semibold text-sm text-text mb-3">Add Player</h2>
          <div className="flex gap-2">
            <Input placeholder="Player name" value={name} onChange={e => setName(e.target.value)} />
            <Button variant="primary" onClick={() => createPlayer.mutate()} disabled={!name || createPlayer.isPending}>
              {createPlayer.isPending ? 'Creating...' : 'Add'}
            </Button>
          </div>
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-4 py-3 text-left font-semibold text-text-muted text-xs">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-text-muted text-xs">Code</th>
                <th className="px-4 py-3 text-right font-semibold text-text-muted text-xs">Points</th>
                <th className="px-4 py-3 text-right font-semibold text-text-muted text-xs">Badges</th>
                <th className="px-4 py-3 text-center font-semibold text-text-muted text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {players?.map(p => (
                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-surface-alt/50 transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-text">{p.name}{p.is_admin ? <span className="ml-1 text-xs" title="Admin">👑</span> : ''}</td>
                  <td className="px-4 py-3.5 font-mono text-text-muted text-xs">{p.access_code}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-primary">{p.total_points}</td>
                  <td className="px-4 py-3.5 text-right text-text-muted">{badgeCounts?.get(p.id) ?? 0}</td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="text-xs text-primary underline hover:text-primary-dark" onClick={() => resetCode.mutate(p.id)} disabled={resetCode.isPending} title="Reset code">🔑</button>
                      {!p.is_admin && (
                        <button className="text-xs text-danger hover:text-red-400 disabled:opacity-50" onClick={() => setConfirmDelete(p.id)} title="Delete player">🗑️</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
