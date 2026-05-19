import { useLeaderboard } from '../hooks/useLeaderboard'
import { LoadingSpinner } from '../components/ui'

export default function LeaderboardPage() {
  const { data: leaderboard, isLoading } = useLeaderboard()

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="pb-20 max-w-3xl mx-auto">
      <div className="bg-gradient-to-r from-primary to-accent p-6 mb-6 text-white shadow-lg">
        <h1 className="text-lg font-semibold opacity-90">World Cup 2026</h1>
        <p className="text-2xl font-bold mt-1">Leaderboard</p>
        <p className="text-sm opacity-80 mt-1">
          {leaderboard ? `${leaderboard.length} players` : 'Rankings'}
        </p>
      </div>

      <div className="px-4">
        {(!leaderboard || leaderboard.length === 0) ? (
          <div className="text-center py-12 text-text-muted">No players yet</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-gray-50/50">
                  <th className="px-4 py-3 text-left font-semibold text-text-muted text-xs">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-text-muted text-xs">Player</th>
                  <th className="px-4 py-3 text-right font-semibold text-text-muted text-xs">Points</th>
                  <th className="px-4 py-3 text-right font-semibold text-text-muted text-xs hidden sm:table-cell">Badges</th>
                  <th className="px-4 py-3 text-right font-semibold text-text-muted text-xs hidden sm:table-cell">Preds</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <tr key={entry.id} className="border-b border-border/50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-bold w-10">
                      {i === 0 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-yellow-100 rounded-full text-sm">🥇</span>
                      ) : i === 1 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 rounded-full text-sm">🥈</span>
                      ) : i === 2 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-amber-50 rounded-full text-sm">🥉</span>
                      ) : (
                        <span className="text-text-muted text-xs">#{i + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-semibold">{entry.name}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-primary">{entry.total_points}</td>
                    <td className="px-4 py-3.5 text-right text-text-muted text-xs hidden sm:table-cell">{entry.badge_count}</td>
                    <td className="px-4 py-3.5 text-right text-text-muted text-xs hidden sm:table-cell">{entry.predictions_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-text-muted mt-4 text-center">
          Tiebreaker: earliest first prediction wins
        </p>
      </div>
    </div>
  )
}
