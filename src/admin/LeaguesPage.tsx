import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Button, Input, LoadingSpinner } from '../components/ui'

export default function AdminLeaguesPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [season, setSeason] = useState('')
  const [desc, setDesc] = useState('')

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

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="pb-20 max-w-3xl mx-auto">
      <div className="bg-gradient-to-r from-primary to-accent p-6 mb-6 text-white shadow-lg">
        <h1 className="text-lg font-semibold opacity-90">Admin</h1>
        <p className="text-2xl font-bold mt-1">Leagues</p>
      </div>

      <div className="px-4">
        <div className="bg-white rounded-xl shadow-sm border border-border/50 p-4 mb-4">
          <h2 className="font-semibold text-sm mb-3">Create League</h2>
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
            <div key={l.id} className="bg-white rounded-xl shadow-sm border border-border/50 p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{l.name}</div>
                <div className="text-xs text-text-muted mt-0.5">{l.season}{l.description ? ` — ${l.description}` : ''}</div>
              </div>
              <div className={`text-xs px-2.5 py-1 rounded-full font-medium ${l.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-text-muted'}`}>
                {l.is_active ? 'Active' : 'Inactive'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
