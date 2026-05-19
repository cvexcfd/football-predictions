import { useAuth } from '../hooks/useAuth'
import { Button } from './ui'

export function Navbar() {
  const { player, isAdmin, logout } = useAuth()

  if (!player) return null

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <a href={isAdmin ? '/admin' : '/matches'} className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          ⚽ FP
        </a>
        <div className="hidden sm:flex items-center gap-1 text-sm">
          {isAdmin && (
            <>
              <a href="/admin" className="px-3 py-1.5 rounded-lg hover:bg-gray-100/80 transition-colors">Dashboard</a>
              <a href="/admin/matches" className="px-3 py-1.5 rounded-lg hover:bg-gray-100/80 transition-colors">Matches</a>
            </>
          )}
          <a href="/matches" className="px-3 py-1.5 rounded-lg hover:bg-gray-100/80 transition-colors">Matches</a>
          <a href="/leaderboard" className="px-3 py-1.5 rounded-lg hover:bg-gray-100/80 transition-colors">Leaderboard</a>
          <a href="/results" className="px-3 py-1.5 rounded-lg hover:bg-gray-100/80 transition-colors">Results</a>
          <span className="text-text-muted ml-3 text-xs">{player.name}</span>
          <Button variant="ghost" size="sm" onClick={logout}>Exit</Button>
        </div>
      </div>
    </nav>
  )
}
