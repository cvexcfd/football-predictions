import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { LoadingSpinner } from '../components/ui'

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
    <div className="pb-20 max-w-3xl mx-auto">
      <div className="bg-gradient-to-r from-primary to-accent p-6 mb-6 text-white shadow-lg">
        <h1 className="text-lg font-semibold opacity-90">Admin</h1>
        <p className="text-2xl font-bold mt-1">Dashboard</p>
      </div>

      <div className="px-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-border/50">
            <div className="text-2xl font-bold text-primary">{counts.totalMatches}</div>
            <div className="text-xs text-text-muted mt-1">Total Matches</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-border/50">
            <div className="text-2xl font-bold text-success">{counts.finishedMatches}</div>
            <div className="text-xs text-text-muted mt-1">Finished</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-border/50">
            <div className="text-2xl font-bold">{counts.playerCount}</div>
            <div className="text-xs text-text-muted mt-1">Players</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-border/50">
            <div className="text-2xl font-bold">{counts.leagueCount}</div>
            <div className="text-xs text-text-muted mt-1">Leagues</div>
          </div>
        </div>

        <div className="space-y-2">
          <a href="/admin/leagues" className="block p-4 bg-white rounded-xl shadow-sm border border-border/50 hover:shadow-md transition-shadow font-medium text-sm">
            <div className="flex items-center justify-between">
              <span>Manage Leagues</span>
              <span className="text-primary">→</span>
            </div>
          </a>
          <a href="/admin/matches" className="block p-4 bg-white rounded-xl shadow-sm border border-border/50 hover:shadow-md transition-shadow font-medium text-sm">
            <div className="flex items-center justify-between">
              <span>Manage Matches</span>
              <span className="text-primary">→</span>
            </div>
          </a>
          <a href="/admin/badges" className="block p-4 bg-white rounded-xl shadow-sm border border-border/50 hover:shadow-md transition-shadow font-medium text-sm">
            <div className="flex items-center justify-between">
              <span>Manage Badges</span>
              <span className="text-primary">→</span>
            </div>
          </a>
          <a href="/admin/players" className="block p-4 bg-white rounded-xl shadow-sm border border-border/50 hover:shadow-md transition-shadow font-medium text-sm">
            <div className="flex items-center justify-between">
              <span>Manage Players</span>
              <span className="text-primary">→</span>
            </div>
          </a>
          <a href="/admin/audit" className="block p-4 bg-white rounded-xl shadow-sm border border-border/50 hover:shadow-md transition-shadow font-medium text-sm">
            <div className="flex items-center justify-between">
              <span>Audit Log</span>
              <span className="text-primary">→</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
