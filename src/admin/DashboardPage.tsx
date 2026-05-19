import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Card, CardContent, LoadingSpinner } from '../components/ui'

export default function AdminDashboard() {
  const { data: counts } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const [matches, players, leagues] = await Promise.all([
        supabase.from('matches').select('id, status'),
        supabase.from('players').select('id', { count: 'exact' }),
        supabase.from('leagues').select('id', { count: 'exact' }),
      ])
      return {
        totalMatches: matches.data?.length ?? 0,
        finishedMatches: matches.data?.filter(m => m.status === 'finished').length ?? 0,
        playerCount: players.count ?? 0,
        leagueCount: leagues.count ?? 0,
      }
    },
  })

  if (!counts) return <LoadingSpinner />

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-text mb-4">Admin Dashboard</h1>
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{counts.totalMatches}</div>
            <div className="text-xs text-text-muted mt-1">Total Matches</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-2xl font-bold text-success">{counts.finishedMatches}</div>
            <div className="text-xs text-text-muted mt-1">Finished</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-2xl font-bold">{counts.playerCount}</div>
            <div className="text-xs text-text-muted mt-1">Players</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-2xl font-bold">{counts.leagueCount}</div>
            <div className="text-xs text-text-muted mt-1">Leagues</div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 space-y-2">
        <a href="/admin/leagues" className="block p-3 bg-white rounded-lg border border-border shadow-sm hover:bg-gray-50 font-medium text-sm">Manage Leagues →</a>
        <a href="/admin/matches" className="block p-3 bg-white rounded-lg border border-border shadow-sm hover:bg-gray-50 font-medium text-sm">Manage Matches →</a>
        <a href="/admin/badges" className="block p-3 bg-white rounded-lg border border-border shadow-sm hover:bg-gray-50 font-medium text-sm">Manage Badges →</a>
        <a href="/admin/players" className="block p-3 bg-white rounded-lg border border-border shadow-sm hover:bg-gray-50 font-medium text-sm">Manage Players →</a>
        <a href="/admin/audit" className="block p-3 bg-white rounded-lg border border-border shadow-sm hover:bg-gray-50 font-medium text-sm">Audit Log →</a>
      </div>
    </div>
  )
}
