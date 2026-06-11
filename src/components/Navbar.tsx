import { useAuth } from '../hooks/useAuth'
import { Button } from './ui'

export function Navbar() {
  const { player, isAdmin, logout } = useAuth()

  if (!player) return null

  return (
    <nav className="sticky top-0 z-50 glass-strong">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <a href={isAdmin ? '/admin' : '/matches'} className="font-extrabold text-lg tracking-tight">
          <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
            ⚽ FP
          </span>
        </a>
        <div className="hidden sm:flex items-center gap-1 text-sm">
          {isAdmin && (
            <>
              <a href="/admin" className="px-3 py-1.5 rounded-xl text-text-muted hover:text-text hover:bg-surface-alt transition-all duration-200">Dashboard</a>
              <a href="/admin/matches" className="px-3 py-1.5 rounded-xl text-text-muted hover:text-text hover:bg-surface-alt transition-all duration-200">Matches</a>
              <a href="/admin/monitoring" className="px-3 py-1.5 rounded-xl text-text-muted hover:text-text hover:bg-surface-alt transition-all duration-200">Monitoring</a>
            </>
          )}
          <a href="/matches" className="px-3 py-1.5 rounded-xl text-text-muted hover:text-text hover:bg-surface-alt transition-all duration-200">Matches</a>
          <a href="/leaderboard" className="px-3 py-1.5 rounded-xl text-text-muted hover:text-text hover:bg-surface-alt transition-all duration-200">Leaderboard</a>
          <a href="/results" className="px-3 py-1.5 rounded-xl text-text-muted hover:text-text hover:bg-surface-alt transition-all duration-200">Results</a>
          <span className="text-text-dim ml-3 text-xs font-medium">{player.name}</span>
          <Button variant="ghost" size="sm" onClick={logout}>Exit</Button>
        </div>
      </div>
    </nav>
  )
}
