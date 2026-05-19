import { useLeaderboard } from '../hooks/useLeaderboard'
import { LoadingSpinner } from '../components/ui'

export default function LeaderboardPage() {
  const { data: leaderboard, isLoading } = useLeaderboard()

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="p-4 pb-20 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-text mb-4">Leaderboard</h1>

      {(!leaderboard || leaderboard.length === 0) ? (
        <div className="text-center py-12 text-text-muted">No players yet</div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-4 py-3 text-left font-semibold text-text-muted">#</th>
                <th className="px-4 py-3 text-left font-semibold text-text-muted">Player</th>
                <th className="px-4 py-3 text-right font-semibold text-text-muted">Points</th>
                <th className="px-4 py-3 text-right font-semibold text-text-muted hidden sm:table-cell">Badges</th>
                <th className="px-4 py-3 text-right font-semibold text-text-muted hidden sm:table-cell">Predictions</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, i) => (
                <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-lg w-10">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </td>
                  <td className="px-4 py-3 font-medium">{entry.name}</td>
                  <td className="px-4 py-3 text-right font-bold text-primary">{entry.total_points}</td>
                  <td className="px-4 py-3 text-right text-text-muted hidden sm:table-cell">{entry.badge_count}</td>
                  <td className="px-4 py-3 text-right text-text-muted hidden sm:table-cell">{entry.predictions_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-text-muted mt-4 text-center">
        Tiebreaker: earliest first prediction wins
      </p>
    </div>
  )
}
