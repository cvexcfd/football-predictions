import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Button, Input, LoadingSpinner } from '../components/ui'

export default function AdminBadgesPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [type, setType] = useState<'multiplier' | 'addition'>('multiplier')
  const [factor, setFactor] = useState('2')

  const { data: badges, isLoading } = useQuery({
    queryKey: ['admin-badges'],
    queryFn: async () => {
      const { data } = await supabase.from('badges').select('*').order('created_at', { ascending: false })
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
    mutationFn: async (badgeId: string) => {
      const { error } = await supabase.rpc('distribute_badge', { p_badge_id: badgeId })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-badges'] }),
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="pb-20 max-w-3xl mx-auto">
      <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
        <h1 className="text-lg font-semibold text-text">Admin</h1>
        <p className="text-2xl font-bold mt-1 text-text">Badges</p>
      </div>

      <div className="px-4">
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
            <div key={b.id} className="glass rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-text">{b.name}</div>
                <div className="text-xs text-text-muted mt-0.5">
                  {b.type === 'multiplier' ? '×' : '+'}{b.factor}
                </div>
              </div>
              <Button size="sm" variant="primary" className="rounded-xl" onClick={() => distributeBadge.mutate(b.id)} disabled={distributeBadge.isPending}>
                Distribute to All
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
