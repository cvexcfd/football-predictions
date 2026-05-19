import { useAuth } from '../hooks/useAuth'
import { usePlayerBadges } from '../hooks/useBadges'
import { BadgeCard } from '../components/BadgeCard'
import { EmptyState, SkeletonCard } from '../components/ui'

export default function BadgesPage() {
  const { player } = useAuth()
  const { data: badges, isLoading } = usePlayerBadges(player?.id ?? '')

  if (isLoading) {
    return (
      <div className="pb-20 max-w-3xl mx-auto">
        <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
          <div className="h-4 w-24 bg-border rounded mb-2 animate-shimmer" />
          <div className="h-8 w-36 bg-border rounded mb-1 animate-shimmer" />
          <div className="h-4 w-24 bg-border rounded animate-shimmer" />
        </div>
        <div className="px-4 space-y-3">
          {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  if (!badges || badges.length === 0) {
    return (
      <div className="pb-20 max-w-3xl mx-auto">
        <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
          <h1 className="text-lg font-semibold opacity-90 text-text">World Cup 2026</h1>
          <p className="text-2xl font-bold mt-1 text-text">My Badges</p>
        </div>
        <EmptyState
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          }
          title="No badges yet"
          description="Badges will appear here once you earn or receive them"
        />
        <div className="px-4 mt-6">
          <HowBadgesWork />
        </div>
      </div>
    )
  }

  return (
    <div className="pb-20 max-w-3xl mx-auto">
      <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
        <h1 className="text-lg font-semibold opacity-90 text-text">World Cup 2026</h1>
        <p className="text-2xl font-bold mt-1 text-text">My Badges</p>
        <p className="text-sm text-text-muted mt-1">{badges.length} badges owned</p>
      </div>

      <div className="px-4 space-y-3">
        {badges.map((b, i) => (
          <BadgeCard key={b.id} playerBadge={b} index={i} />
        ))}
      </div>

      <div className="px-4 mt-6">
        <HowBadgesWork />
      </div>
    </div>
  )
}

function HowBadgesWork() {
  return (
    <div className="glass rounded-2xl p-5 text-sm">
      <h2 className="font-semibold text-text mb-3">How Badges Work</h2>
      <ul className="space-y-2 text-text-muted">
        <li className="flex items-start gap-2">
          <span className="text-primary font-bold mt-0.5">×</span>
          <span><strong className="text-text">Multiplier (×2, ×3)</strong>: multiplies your raw points</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-success font-bold mt-0.5">+</span>
          <span><strong className="text-text">Addition (+2, +3)</strong>: adds bonus points (only if you score &gt; 0)</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-gold font-bold mt-0.5">1</span>
          <span>Use at most 1 badge per match</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-danger font-bold mt-0.5">!</span>
          <span>No refund if you score 0 points</span>
        </li>
      </ul>
    </div>
  )
}
