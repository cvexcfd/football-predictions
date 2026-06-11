import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Button, Input, Select, LoadingSpinner } from '../components/ui'

export default function AdminBadgesPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [type, setType] = useState<'multiplier' | 'addition'>('multiplier')
  const [factor, setFactor] = useState('2')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [showDistribute, setShowDistribute] = useState<string | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [distributeQty, setDistributeQty] = useState('1')

  const { data: badges, isLoading } = useQuery({
    queryKey: ['admin-badges'],
    queryFn: async () => {
      const { data } = await supabase.from('badges').select('*').order('created_at', { ascending: false })
      return data
    },
  })

  const { data: players } = useQuery({
    queryKey: ['admin-players'],
    queryFn: async () => {
      const { data } = await supabase.from('players').select('id, name').order('name')
      return data
    },
  })

  const createBadge = useMutation({
    mutationFn: async () => {
      const { data: player } = await supabase.from('players').select('id').eq('is_admin', true).limit(1).single()
      if (!player) throw new Error('No admin found')

      const { error } = await supabase.from('badges').insert({
        name, type, factor: Number(factor), created_by: player.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setName(''); setFactor('2')
      qc.invalidateQueries({ queryKey: ['admin-badges'] })
    },
  })

  const distributeBadge = useMutation({
    mutationFn: async ({ badgeId, playerId, quantity }: { badgeId: string; playerId: string; quantity: number }) => {
      const { error } = await supabase.rpc('give_badge_to_player', {
        p_player_id: playerId, p_badge_id: badgeId, p_quantity: quantity,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setShowDistribute(null)
      setSelectedPlayer('')
      setDistributeQty('1')
      qc.invalidateQueries({ queryKey: ['admin-badges'] })
    },
  })

  const distributeToAll = useMutation({
    mutationFn: async (badgeId: string) => {
      const { error } = await supabase.rpc('distribute_badge', { p_badge_id: badgeId })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-badges'] }),
  })

  const deleteBadge = useMutation({
    mutationFn: async (badgeId: string) => {
      await supabase.from('predictions').update({ badge_id_used: null }).eq('badge_id_used', badgeId)
      await supabase.from('player_badges').delete().eq('badge_id', badgeId)
      await supabase.from('badges').delete().eq('id', badgeId)
    },
    onSuccess: () => {
      setConfirmDelete(null)
      qc.invalidateQueries({ queryKey: ['admin-badges'] })
    },
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="pb-20 max-w-3xl mx-auto">
      <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
        <h1 className="text-lg font-semibold text-text">Admin</h1>
        <p className="text-2xl font-bold mt-1 text-text">Badges</p>
      </div>

      <div className="px-4">
        {confirmDelete && (
          <div className="bg-danger/10 border border-danger/30 rounded-2xl p-5 mb-4 animate-fade-in">
            <div className="font-semibold text-danger mb-1">Delete Badge?</div>
            <div className="text-sm text-text-muted mb-3">This will revoke this badge from all players. Cannot be undone.</div>
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={() => deleteBadge.mutate(confirmDelete)} disabled={deleteBadge.isPending}>
                {deleteBadge.isPending ? 'Deleting...' : 'Confirm Delete'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="glass rounded-2xl p-5 mb-4">
          <h2 className="font-semibold text-sm text-text mb-3">Create Badge</h2>
          <div className="space-y-3">
            <Input placeholder="Badge name (e.g. Golden Bet)" value={name} onChange={e => setName(e.target.value)} />
            <div className="flex gap-2">
              <button className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${type === 'multiplier' ? 'bg-primary text-white shadow-sm' : 'bg-surface-alt text-text-muted hover:bg-border-light'}`} onClick={() => setType('multiplier')}>Multiplier ×</button>
              <button className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${type === 'addition' ? 'bg-primary text-white shadow-sm' : 'bg-surface-alt text-text-muted hover:bg-border-light'}`} onClick={() => setType('addition')}>Addition +</button>
            </div>
            <Input type="number" min="1" step="0.5" placeholder="Factor (e.g. 2)" value={factor} onChange={e => setFactor(e.target.value)} />
            <Button variant="primary" onClick={() => createBadge.mutate()} disabled={!name || !factor || createBadge.isPending}>
              {createBadge.isPending ? 'Creating...' : 'Create Badge'}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {badges?.map(b => (
            <div key={b.id} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold text-text">{b.name}</div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {b.type === 'multiplier' ? '×' : '+'}{b.factor}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="text-xs text-primary underline hover:text-primary-dark px-2 py-1" onClick={() => setShowDistribute(showDistribute === b.id ? null : b.id)}>
                    Distribute
                  </button>
                  <button className="text-xs text-primary underline hover:text-primary-dark px-2 py-1" onClick={() => distributeToAll.mutate(b.id)} disabled={distributeToAll.isPending}>
                    {distributeToAll.isPending ? '...' : 'To All'}
                  </button>
                  <button className="text-xs text-danger hover:text-red-400 px-2 py-1" onClick={() => setConfirmDelete(b.id)}>🗑️</button>
                </div>
              </div>
              {showDistribute === b.id && (
                <div className="flex gap-2 pt-2 border-t border-border/50 animate-fade-in">
                  <Select value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)}>
                    <option value="">Select player...</option>
                    {players?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                  <Input type="number" min="1" className="w-16 shrink-0" placeholder="Qty" value={distributeQty} onChange={e => setDistributeQty(e.target.value)} />
                  <Button size="sm" variant="primary" className="shrink-0" onClick={() => distributeBadge.mutate({ badgeId: b.id, playerId: selectedPlayer, quantity: Number(distributeQty) || 1 })} disabled={!selectedPlayer || distributeBadge.isPending}>
                    Give
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
