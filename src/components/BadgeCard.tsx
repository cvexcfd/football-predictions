import type { PlayerBadge } from '../types'

export function BadgeCard({ playerBadge }: { playerBadge: PlayerBadge }) {
  const badge = playerBadge.badge
  if (!badge) return null

  return (
    <div className="bg-white rounded-lg border border-border shadow-sm p-4 flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
        {badge.type === 'multiplier' ? '×' : '+'}
      </div>
      <div className="flex-1">
        <div className="font-semibold text-sm">{badge.name}</div>
        <div className="text-xs text-text-muted">
          {badge.type === 'multiplier' ? `×${badge.factor} multiplier` : `+${badge.factor} bonus`}
        </div>
      </div>
      <div className="text-2xl font-bold text-primary">{playerBadge.quantity}</div>
    </div>
  )
}
