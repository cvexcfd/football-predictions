import { useAuth } from '../hooks/useAuth'
import { usePlayerBadges } from '../hooks/useBadges'
import { BadgeCard } from '../components/BadgeCard'
import { LoadingSpinner } from '../components/ui'

export default function BadgesPage() {
  const { player } = useAuth()
  const { data: badges, isLoading } = usePlayerBadges(player?.id ?? '')

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="pb-20 max-w-3xl mx-auto">
      <div className="bg-gradient-to-r from-primary to-accent p-6 mb-6 text-white shadow-lg">
        <h1 className="text-lg font-semibold opacity-90">World Cup 2026</h1>
        <p className="text-2xl font-bold mt-1">My Badges</p>
        <p className="text-sm opacity-80 mt-1">{badges ? `${badges.length} badges owned` : ''}</p>
      </div>

      <div className="px-4">
        {(!badges || badges.length === 0) ? (
          <div className="text-center py-12 text-text-muted">No badges yet</div>
        ) : (
          <div className="space-y-3">
            {badges.map(b => (
              <BadgeCard key={b.id} playerBadge={b} />
            ))}
          </div>
        )}

        <div className="mt-6 bg-white rounded-xl shadow-sm border border-border/50 p-5 text-sm">
          <h2 className="font-semibold mb-3">How Badges Work</h2>
          <ul className="space-y-2 text-text-muted">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">×</span>
              <span><strong>Multiplier (×2, ×3)</strong>: multiplies your raw points</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success font-bold mt-0.5">+</span>
              <span><strong>Addition (+2, +3)</strong>: adds bonus points (only if you score &gt; 0)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber font-bold mt-0.5">1</span>
              <span>Use at most 1 badge per match</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-danger font-bold mt-0.5">!</span>
              <span>No refund if you score 0 points</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
