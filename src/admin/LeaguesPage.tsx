import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Card, CardTitle, Button, Input, LoadingSpinner } from '../components/ui'

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
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-text mb-4">Leagues</h1>

      <Card className="mb-4">
        <CardTitle className="mb-3">Create League</CardTitle>
        <div className="space-y-3">
          <Input placeholder="Name (e.g. FIFA World Cup 2026)" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Season (e.g. 2026)" value={season} onChange={e => setSeason(e.target.value)} />
          <Input placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
          <Button variant="primary" onClick={() => createLeague.mutate()} disabled={!name || createLeague.isPending}>
            {createLeague.isPending ? 'Creating...' : 'Create League'}
          </Button>
        </div>
      </Card>

      <div className="space-y-2">
        {leagues?.map(l => (
          <div key={l.id} className="bg-white rounded-lg border border-border shadow-sm p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">{l.name}</div>
              <div className="text-xs text-text-muted">{l.season}{l.description ? ` — ${l.description}` : ''}</div>
            </div>
            <div className={`text-xs px-2 py-0.5 rounded-full ${l.is_active ? 'bg-green-100 text-success' : 'bg-gray-100 text-text-muted'}`}>
              {l.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
