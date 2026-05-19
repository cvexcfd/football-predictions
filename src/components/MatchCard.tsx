import { useAuth } from '../hooks/useAuth'
import { useSubmitPrediction } from '../hooks/usePredictions'
import { usePlayerBadges } from '../hooks/useBadges'
import { Button } from './ui'
import { useState } from 'react'
import type { Match, Prediction } from '../types'
import { formatDateTime, isMatchUpcoming } from '../lib/utils'

export function MatchCard({ match }: { match: Match & { prediction?: Prediction | null } }) {
  const { player } = useAuth()
  const submitPrediction = useSubmitPrediction()
  const { data: badges } = usePlayerBadges(player?.id ?? '')
  const [predHome, setPredHome] = useState(match.prediction?.pred_home ?? '')
  const [predAway, setPredAway] = useState(match.prediction?.pred_away ?? '')
  const [selectedBadge, setSelectedBadge] = useState(match.prediction?.badge_id_used ?? '')

  const upcoming = match.status === 'upcoming' && isMatchUpcoming(match.kickoff_at)
  const locked = match.status === 'locked' || match.status === 'finished'
  const finished = match.status === 'finished'

  const handleSubmit = async () => {
    if (!player || predHome === '' || predAway === '') return
    await submitPrediction.mutateAsync({
      playerId: player.id,
      matchId: match.id,
      predHome: Number(predHome),
      predAway: Number(predAway),
      badgeIdUsed: selectedBadge || null,
    })
  }

  const actualH = match.home_score
  const actualA = match.away_score
  let resultBadge: 'exact' | 'result' | 'wrong' | null = null
  if (finished && match.prediction && actualH !== null && actualA !== null) {
    if (match.prediction.pred_home === actualH && match.prediction.pred_away === actualA) {
      resultBadge = 'exact'
    } else {
      const predRes = match.prediction.pred_home > match.prediction.pred_away ? 'H' : match.prediction.pred_home < match.prediction.pred_away ? 'A' : 'D'
      const actualRes = actualH > actualA ? 'H' : actualH < actualA ? 'A' : 'D'
      resultBadge = predRes === actualRes ? 'result' : 'wrong'
    }
  }

  return (
    <div className="bg-white rounded-lg border border-border shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        {match.stage && <span className="text-xs font-medium text-text-muted uppercase tracking-wide">{match.stage}</span>}
        <span className="text-xs text-text-muted">{formatDateTime(match.kickoff_at)}</span>
      </div>

      <div className="flex items-center justify-between gap-3 my-3">
        <div className="flex-1 flex items-center gap-2">
          {match.home_team?.flag_url && <img src={match.home_team.flag_url} alt="" className="w-6 h-4 object-contain" />}
          <span className="font-medium text-sm">{match.home_team?.name ?? '?'}</span>
        </div>

        {upcoming && (
          <div className="flex items-center gap-1">
            <input
              type="number" min="0" max="99"
              className="w-12 h-10 text-center border border-border rounded-lg text-lg font-bold"
              value={predHome}
              onChange={e => setPredHome(e.target.value)}
              disabled={submitPrediction.isPending}
            />
            <span className="text-text-muted font-bold">:</span>
            <input
              type="number" min="0" max="99"
              className="w-12 h-10 text-center border border-border rounded-lg text-lg font-bold"
              value={predAway}
              onChange={e => setPredAway(e.target.value)}
              disabled={submitPrediction.isPending}
            />
          </div>
        )}

        {locked && (
          <div className="flex items-center gap-1 text-lg font-bold">
            <span>{match.prediction?.pred_home ?? '-'}</span>
            <span className="text-text-muted">:</span>
            <span>{match.prediction?.pred_away ?? '-'}</span>
          </div>
        )}

        <div className="flex-1 flex items-center justify-end gap-2">
          {match.away_team?.flag_url && <img src={match.away_team.flag_url} alt="" className="w-6 h-4 object-contain" />}
          <span className="font-medium text-sm">{match.away_team?.name ?? '?'}</span>
        </div>
      </div>

      {resultBadge && (
        <div className="flex items-center gap-2 mb-2">
          {resultBadge === 'exact' && <span className="px-2 py-0.5 bg-green-100 text-success text-xs rounded-full font-medium">✓ Exact</span>}
          {resultBadge === 'result' && <span className="px-2 py-0.5 bg-blue-100 text-primary text-xs rounded-full font-medium">✓ Result</span>}
          {resultBadge === 'wrong' && <span className="px-2 py-0.5 bg-red-100 text-danger text-xs rounded-full font-medium">✗ Wrong</span>}
          <span className="text-sm font-semibold text-text">+{match.prediction?.pts_total ?? 0} pts</span>
          {match.prediction?.badge && <span className="text-xs text-text-muted">(badge: {match.prediction.badge.name})</span>}
        </div>
      )}

      {finished && actualH !== null && actualA !== null && (
        <div className="text-xs text-text-muted mb-2">
          Actual: {match.home_team?.name} {actualH} - {actualA} {match.away_team?.name}
        </div>
      )}

      {upcoming && (
        <div className="space-y-2">
          {badges && badges.length > 0 && (
            <select
              className="w-full px-3 py-1.5 border border-border rounded-lg text-sm"
              value={selectedBadge}
              onChange={e => setSelectedBadge(e.target.value)}
            >
              <option value="">No badge</option>
              {badges.map(b => (
                <option key={b.id} value={b.badge_id}>
                  {b.badge?.name} ({b.badge?.type === 'multiplier' ? '×' : '+'}{b.badge?.factor}) — {b.quantity} left
                </option>
              ))}
            </select>
          )}
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={handleSubmit}
            disabled={submitPrediction.isPending || predHome === '' || predAway === ''}
          >
            {submitPrediction.isPending ? 'Saving...' : match.prediction ? 'Update Prediction' : 'Submit Prediction'}
          </Button>
        </div>
      )}
    </div>
  )
}
