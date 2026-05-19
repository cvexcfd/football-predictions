import { useAuth } from '../hooks/useAuth'
import { useMatches } from '../hooks/useMatches'
import { MatchCard } from '../components/MatchCard'
import { LoadingSpinner } from '../components/ui'
import { groupBy } from '../lib/utils'

export default function MatchesPage() {
  const { player } = useAuth()
  const { data: matches, isLoading } = useMatches('upcoming', player?.id)

  if (isLoading) return <LoadingSpinner />

  const grouped = groupBy(matches ?? [], m => {
    const d = new Date(m.kickoff_at)
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  })

  return (
    <div className="pb-20 max-w-3xl mx-auto">
      <div className="bg-gradient-to-r from-primary to-accent p-6 mb-6 text-white shadow-lg">
        <h1 className="text-lg font-semibold opacity-90">World Cup 2026</h1>
        <p className="text-2xl font-bold mt-1">Upcoming Matches</p>
        <p className="text-sm opacity-80 mt-1">{Object.keys(grouped).length} match days</p>
      </div>
      <div className="px-4">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-12 text-text-muted">No upcoming matches</div>
        ) : (
          Object.entries(grouped).map(([date, dayMatches]) => (
            <div key={date} className="mb-6">
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">{date}</h2>
              <div className="space-y-3">
                {dayMatches.map(m => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
