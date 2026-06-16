import { useAuth } from '../hooks/useAuth'
import { usePlayerStats } from '../hooks/usePlayerStats'
import { SkeletonCard } from '../components/ui'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function MyStatsPage() {
  const { player } = useAuth()
  const { data: stats, isLoading } = usePlayerStats(player?.id ?? '')

  if (isLoading) {
    return (
      <div className="p-4 pb-20 max-w-3xl mx-auto">
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="h-4 w-20 bg-border rounded mb-2 animate-shimmer" />
          <div className="h-10 w-32 bg-border rounded mb-1 animate-shimmer" />
          <div className="h-4 w-24 bg-border rounded animate-shimmer" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-4 pb-20 max-w-3xl mx-auto">
        <div className="glass rounded-2xl p-6 mb-6">
          <h1 className="text-lg font-semibold opacity-90 text-text">My Stats</h1>
        </div>
        <div className="text-center py-12 text-text-muted">No stats yet. Start making predictions!</div>
      </div>
    )
  }

  const badgeUsageRate = stats.totalPredictions > 0 ? Math.round((stats.badgesUsed / stats.totalPredictions) * 100) : 0
  const avgPoints = stats.finishedPredictions > 0 ? (stats.totalPoints / stats.finishedPredictions).toFixed(1) : '0'
  const streak = (() => { let s=0; for(let i=stats.pointsPerMatch.length-1;i>=0;i--) { if(stats.pointsPerMatch[i].points>0) s++; else break; } return s; })()

  return (
    <div className="p-4 pb-20 max-w-3xl mx-auto">
      <div className="glass rounded-2xl p-6 mb-6">
        <h1 className="text-lg font-semibold text-text">My Stats</h1>
        <div className="text-4xl font-bold mt-2 text-text">{stats.totalPoints}</div>
        <div className="text-sm text-text-muted mt-1">Total Points</div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="glass rounded-2xl p-4 text-center animate-fade-in">
          <div className="text-2xl font-bold text-success">{stats.accuracy}%</div>
          <div className="text-xs text-text-muted mt-1">Accuracy ({stats.correctResults}/{stats.finishedPredictions})</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center animate-fade-in">
          <div className="text-2xl font-bold text-gold">{stats.exactScores}</div>
          <div className="text-xs text-text-muted mt-1">Exact Scores</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center animate-fade-in">
          <div className="text-2xl font-bold text-text">{stats.finishedPredictions}</div>
          <div className="text-xs text-text-muted mt-1">Matches Played</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center animate-fade-in">
          <div className="text-2xl font-bold text-text">{avgPoints}</div>
          <div className="text-xs text-text-muted mt-1">Avg Points/Match</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-lg font-bold text-text">{stats.badgesUsed}</div>
          <div className="text-[10px] text-text-muted">Badges Used</div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-lg font-bold text-text">{badgeUsageRate}%</div>
          <div className="text-[10px] text-text-muted">Badge Usage Rate</div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-lg font-bold text-text">{stats.totalPredictions}</div>
          <div className="text-[10px] text-text-muted">Total Predictions</div>
        </div>
      </div>

      {stats.pointsPerMatch.length > 1 && (
        <div className="glass rounded-2xl p-4 mb-6">
          <h2 className="font-semibold text-sm text-text mb-3">Points Per Match</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.pointsPerMatch}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" />
              <XAxis dataKey="match" tick={false} stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{ background: '#1a1f2e', border: '1px solid #2a3040', borderRadius: '12px', color: '#f1f5f9' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="points" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-3 py-2.5 border-b border-border/50">
          <h2 className="font-semibold text-sm text-text">Prediction History</h2>
        </div>
        <div className="divide-y divide-border/50 max-h-[400px] overflow-y-auto">
          {stats.pointsPerMatch.slice(-30).reverse().map((ppm, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 hover:bg-surface-alt/50 transition-colors text-xs">
              <span className="text-text-muted truncate min-w-0 flex-1 pr-2">{ppm.match}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${ppm.isAbsent ? 'text-danger/70 bg-danger/10' : 'text-text-dim bg-surface-alt'}`}>{ppm.isAbsent ? '—' : ppm.predScore}</span>
                <span className={`font-bold ${ppm.points > 0 ? 'text-success' : 'text-text-dim'}`}>
                  {ppm.points > 0 ? `+${ppm.points}` : '0'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
