import { useAuth } from '../hooks/useAuth'
import { usePlayerStats } from '../hooks/usePlayerStats'
import { LoadingSpinner } from '../components/ui'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function MyStatsPage() {
  const { player } = useAuth()
  const { data: stats, isLoading } = usePlayerStats(player?.id ?? '')

  if (isLoading) return <LoadingSpinner />
  if (!stats) return <div className="text-center py-12 text-text-muted">No stats yet</div>

  const badgeUsageRate = stats.totalPredictions > 0 ? Math.round((stats.badgesUsed / stats.totalPredictions) * 100) : 0
  const avgPoints = stats.finishedPredictions > 0 ? (stats.totalPoints / stats.finishedPredictions).toFixed(1) : '0'
  const streak = (() => { let s=0; for(let i=stats.pointsPerMatch.length-1;i>=0;i--) { if(stats.pointsPerMatch[i].points>0) s++; else break; } return s; })()

  return (
    <div className="p-4 pb-20 max-w-3xl mx-auto">
      <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-6 mb-6 text-white shadow-lg">
        <h1 className="text-lg font-semibold opacity-90">My Stats</h1>
        <div className="text-4xl font-bold mt-2">{stats.totalPoints}</div>
        <div className="text-sm opacity-80 mt-1">Total Points</div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-border/50 animate-fade-in">
          <div className="text-2xl font-bold text-success">{stats.accuracy}%</div>
          <div className="text-xs text-text-muted mt-1">Accuracy ({stats.correctResults}/{stats.finishedPredictions})</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-border/50 animate-fade-in">
          <div className="text-2xl font-bold text-amber">{stats.exactScores}</div>
          <div className="text-xs text-text-muted mt-1">Exact Scores</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-border/50 animate-fade-in">
          <div className="text-2xl font-bold">{stats.finishedPredictions}</div>
          <div className="text-xs text-text-muted mt-1">Matches Played</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-border/50 animate-fade-in">
          <div className="text-2xl font-bold">{avgPoints}</div>
          <div className="text-xs text-text-muted mt-1">Avg Points/Match</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-3 text-center border border-border/50">
          <div className="text-lg font-bold">{stats.badgesUsed}</div>
          <div className="text-[10px] text-text-muted">Badges Used</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 text-center border border-border/50">
          <div className="text-lg font-bold">{badgeUsageRate}%</div>
          <div className="text-[10px] text-text-muted">Badge Usage Rate</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 text-center border border-border/50">
          <div className="text-lg font-bold">{stats.totalPredictions}</div>
          <div className="text-[10px] text-text-muted">Total Predictions</div>
        </div>
      </div>

      {stats.pointsPerMatch.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-border/50">
          <h2 className="font-semibold text-sm mb-3">Points Per Match</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.pointsPerMatch}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="match" tick={false} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="points" fill="#2563eb" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-gray-50/50">
          <h2 className="font-semibold text-sm">Prediction History</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2.5 text-left font-semibold text-text-muted text-xs">Match</th>
              <th className="px-4 py-2.5 text-right font-semibold text-text-muted text-xs">Pts</th>
              <th className="px-4 py-2.5 text-right font-semibold text-text-muted text-xs hidden sm:table-cell">Badge</th>
            </tr>
          </thead>
          <tbody>
            {stats.pointsPerMatch.slice(-30).reverse().map((ppm, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-2.5 text-text-muted truncate max-w-[200px] text-xs">{ppm.match}</td>
                <td className={`px-4 py-2.5 text-right font-bold ${ppm.points > 0 ? 'text-success' : 'text-text-muted'}`}>
                  {ppm.points > 0 ? `+${ppm.points}` : '0'}
                </td>
                <td className="px-4 py-2.5 text-right text-text-muted text-xs hidden sm:table-cell">{ppm.badgeUsed || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


