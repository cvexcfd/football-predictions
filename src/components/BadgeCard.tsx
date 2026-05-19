import type { PlayerBadge } from '../types'

export function BadgeCard({ playerBadge, index = 0 }: { playerBadge: PlayerBadge; index?: number }) {
  const badge = playerBadge.badge
  if (!badge) return null

  const isMultiplier = badge.type === 'multiplier'
  const glowColor = isMultiplier ? 'shadow-primary/20 border-primary/20' : 'shadow-accent/20 border-accent/20'
  const accent = isMultiplier ? 'text-primary bg-primary/10' : 'text-accent bg-accent/10'
  const iconBg = isMultiplier ? 'from-primary/20 to-primary/5' : 'from-accent/20 to-accent/5'

  return (
    <div
      className={`glass rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 hover:border-border-light hover:shadow-lg ${glowColor} animate-fade-in`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${iconBg} flex items-center justify-center text-2xl font-black shrink-0 ${isMultiplier ? 'text-primary' : 'text-accent'}`}>
        {isMultiplier ? '×' : '+'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-text">{badge.name}</div>
        <div className="text-xs text-text-muted mt-0.5">
          {isMultiplier ? `×${badge.factor} point multiplier` : `+${badge.factor} bonus points`}
        </div>
      </div>
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-xl ${accent} flex items-center justify-center text-lg font-black`}>
          {playerBadge.quantity}
        </div>
        <span className="text-[9px] text-text-dim mt-0.5 font-medium uppercase tracking-wider">Owned</span>
      </div>
    </div>
  )
}
