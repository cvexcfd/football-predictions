import { useAuth } from '../hooks/useAuth'
import { useMatches } from '../hooks/useMatches'
import { MatchCard } from '../components/MatchCard'
import { EmptyState, SkeletonCard } from '../components/ui'
import { groupBy, formatDateTime } from '../lib/utils'

export default function MatchesPage() {
  const { player } = useAuth()
  const { data: matches, isLoading } = useMatches('upcoming', player?.id)

  const nowMorocco = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Casablanca' })
  const todayMatches = (matches ?? []).filter(m => {
    const d = new Date(m.kickoff_at).toLocaleDateString('en-CA', { timeZone: 'Africa/Casablanca' })
    return d === nowMorocco
  })

  if (isLoading) {
    return (
      <div className="pb-20 max-w-3xl mx-auto">
        <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
          <div className="h-4 w-24 bg-border rounded mb-2 animate-shimmer" />
          <div className="h-8 w-48 bg-border rounded mb-1 animate-shimmer" />
          <div className="h-4 w-20 bg-border rounded animate-shimmer" />
        </div>
        <div className="px-4 space-y-3">
          {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  const grouped = groupBy(matches ?? [], m => {
    const d = new Date(m.kickoff_at)
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  })

  const todayIds = new Set(todayMatches.map(m => m.id))

  const matchCount = Object.values(grouped).filter(ms => ms.some(m => !todayIds.has(m.id))).length

  if (matchCount === 0 && todayMatches.length === 0) {
    return (
      <div className="pb-20 max-w-3xl mx-auto">
        <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
          <h1 className="text-lg font-semibold opacity-90 text-text">World Cup 2026</h1>
          <p className="text-2xl font-bold mt-1 text-text">Upcoming Matches</p>
        </div>
        <EmptyState
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          title="No upcoming matches"
          description="Check back later for the next match schedule"
        />
      </div>
    )
  }

  return (
    <div className="pb-20 max-w-3xl mx-auto">
      <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
        <h1 className="text-lg font-semibold opacity-90 text-text">World Cup 2026</h1>
        <p className="text-2xl font-bold mt-1 text-text">Upcoming Matches</p>
        <p className="text-sm text-text-muted mt-1">{matchCount} match days</p>
      </div>
      <div className="px-4">
        {todayMatches.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Today's Matches
            </h2>
            <div className="space-y-3">
              {todayMatches.map((m, i) => (
                <MatchCard key={m.id} match={m} index={i} />
              ))}
            </div>
          </div>
        )}
        {Object.entries(grouped).map(([date, dayMatches]) => {
          const filteredMatches = dayMatches.filter(m => !todayIds.has(m.id))
          if (filteredMatches.length === 0) return null
          return (
            <div key={date} className="mb-6">
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">{date}</h2>
              <div className="space-y-3">
                {filteredMatches.map((m, i) => (
                  <MatchCard key={m.id} match={m} index={i} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
