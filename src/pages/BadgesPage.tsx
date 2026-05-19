import { useAuth } from '../hooks/useAuth'
import { usePlayerBadges } from '../hooks/useBadges'
import { BadgeCard } from '../components/BadgeCard'
import { LoadingSpinner } from '../components/ui'

export default function BadgesPage() {
  const { player } = useAuth()
  const { data: badges, isLoading } = usePlayerBadges(player?.id ?? '')

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="p-4 pb-20 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-text mb-4">My Badges</h1>

      {(!badges || badges.length === 0) ? (
        <div className="text-center py-12 text-text-muted">No badges yet</div>
      ) : (
        <div className="space-y-3">
          {badges.map(b => (
            <BadgeCard key={b.id} playerBadge={b} />
          ))}
        </div>
      )}

      <div className="mt-6 bg-white rounded-lg border border-border shadow-sm p-4 text-sm">
        <h2 className="font-semibold mb-2">How Badges Work</h2>
        <ul className="space-y-1 text-text-muted">
          <li>• <strong>Multiplier (×2, ×3)</strong>: multiplies your raw points</li>
          <li>• <strong>Addition (+2, +3)</strong>: adds bonus points (only if you score &gt; 0)</li>
          <li>• Use at most 1 badge per match</li>
          <li>• No refund if you score 0 points</li>
        </ul>
      </div>
    </div>
  )
}
