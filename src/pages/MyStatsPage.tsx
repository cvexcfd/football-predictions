import { useAuth } from '../hooks/useAuth'
import { usePlayerStats } from '../hooks/usePlayerStats'
import { LoadingSpinner } from '../components/ui'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function MyStatsPage() {
  const { player } = useAuth()
  const { data: stats, isLoading } = usePlayerStats(player?.id ?? '')

  if (isLoading) return <LoadingSpinner />
  if (!stats) return <div className="text-center py-12 text-text-muted">No stats yet</div>

  return (
    <div className="p-4 pb-20 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-text mb-4">My Stats</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-lg border border-border shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-primary">{stats.totalPoints}</div>
          <div className="text-xs text-text-muted mt-1">Total Points</div>
        </div>
        <div className="bg-white rounded-lg border border-border shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-success">{stats.accuracy}%</div>
          <div className="text-xs text-text-muted mt-1">Accuracy</div>
        </div>
        <div className="bg-white rounded-lg border border-border shadow-sm p-4 text-center">
          <div className="text-2xl font-bold">{stats.exactScores}</div>
          <div className="text-xs text-text-muted mt-1">Exact Scores</div>
        </div>
        <div className="bg-white rounded-lg border border-border shadow-sm p-4 text-center">
          <div className="text-2xl font-bold">{stats.badgesUsed}</div>
          <div className="text-xs text-text-muted mt-1">Badges Used</div>
        </div>
      </div>

      {stats.pointsPerMatch.length > 1 && (
        <div className="bg-white rounded-lg border border-border shadow-sm p-4 mb-6">
          <h2 className="font-semibold text-sm mb-3">Points Per Match</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.pointsPerMatch}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="match" tick={false} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="points" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-lg border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="px-4 py-3 text-left font-semibold text-text-muted">Match</th>
              <th className="px-4 py-3 text-right font-semibold text-text-muted">Score</th>
              <th className="px-4 py-3 text-right font-semibold text-text-muted">Pts</th>
            </tr>
          </thead>
          <tbody>
            {stats.pointsPerMatch.slice(-20).reverse().map((ppm, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-4 py-2 text-text-muted truncate max-w-[200px]">{ppm.match}</td>
                <td className="px-4 py-2 text-right text-text-muted">{ppm.points > 0 ? `+${ppm.points}` : '0'}</td>
                <td className="px-4 py-2 text-right font-bold text-primary">+{ppm.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
