import { useAuth } from '../hooks/useAuth'
import { Button } from './ui'

export function Navbar() {
  const { player, isAdmin, logout } = useAuth()

  if (!player) return null

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-border">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <a href={isAdmin ? '/admin' : '/matches'} className="font-bold text-primary text-lg">
          ⚽ FP
        </a>
        <div className="flex items-center gap-2 text-sm">
          {isAdmin && (
            <>
              <a href="/admin" className="px-3 py-1.5 rounded-lg hover:bg-gray-100">Dashboard</a>
              <a href="/admin/matches" className="px-3 py-1.5 rounded-lg hover:bg-gray-100">Matches</a>
            </>
          )}
          <a href="/matches" className="px-3 py-1.5 rounded-lg hover:bg-gray-100">Matches</a>
          <a href="/leaderboard" className="px-3 py-1.5 rounded-lg hover:bg-gray-100">Leaderboard</a>
          <a href="/results" className="px-3 py-1.5 rounded-lg hover:bg-gray-100">Results</a>
          <span className="text-text-muted ml-2">{player.name}</span>
          <Button variant="ghost" size="sm" onClick={logout}>Exit</Button>
        </div>
      </div>
    </nav>
  )
}
