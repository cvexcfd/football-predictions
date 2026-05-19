import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Button, Input, LoadingSpinner } from '../components/ui'
import { generateAccessCode } from '../lib/utils'

export default function AdminPlayersPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [newCode, setNewCode] = useState<string | null>(null)

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

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="pb-20 max-w-3xl mx-auto">
      <div className="bg-gradient-to-r from-primary to-accent p-6 mb-6 text-white shadow-lg">
        <h1 className="text-lg font-semibold opacity-90">Admin</h1>
        <p className="text-2xl font-bold mt-1">Players</p>
      </div>

      <div className="px-4">
        {newCode && (
          <div className="bg-success/10 border border-success/30 rounded-xl p-5 mb-4 animate-fade-in">
            <div className="font-semibold text-success mb-1">Player Created!</div>
            <div className="text-sm text-text">Access code: <span className="font-mono font-bold text-lg tracking-wider bg-white px-3 py-1 rounded-lg">{newCode}</span></div>
            <button className="text-xs text-text-muted mt-2 underline" onClick={() => setNewCode(null)}>Dismiss</button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-border/50 p-4 mb-4">
          <h2 className="font-semibold text-sm mb-3">Add Player</h2>
          <div className="flex gap-2">
            <Input placeholder="Player name" value={name} onChange={e => setName(e.target.value)} />
            <Button variant="primary" onClick={() => createPlayer.mutate()} disabled={!name || createPlayer.isPending}>
              {createPlayer.isPending ? 'Creating...' : 'Add'}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-gray-50/50">
                <th className="px-4 py-3 text-left font-semibold text-text-muted text-xs">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-text-muted text-xs">Code</th>
                <th className="px-4 py-3 text-right font-semibold text-text-muted text-xs">Points</th>
                <th className="px-4 py-3 text-right font-semibold text-text-muted text-xs">Badges</th>
                <th className="px-4 py-3 text-center font-semibold text-text-muted text-xs">Admin</th>
              </tr>
            </thead>
            <tbody>
              {players?.map(p => (
                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3.5 font-semibold">{p.name}</td>
                  <td className="px-4 py-3.5 font-mono text-text-muted text-xs">{p.access_code}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-primary">{p.total_points}</td>
                  <td className="px-4 py-3.5 text-right text-text-muted">{badgeCounts?.get(p.id) ?? 0}</td>
                  <td className="px-4 py-3.5 text-center">{p.is_admin ? '👑' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
