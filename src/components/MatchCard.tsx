import { useAuth } from '../hooks/useAuth'
import { useSubmitPrediction } from '../hooks/usePredictions'
import { usePlayerBadges } from '../hooks/useBadges'
import { useToast } from './Toast'
import { Button } from './ui'
import { useState } from 'react'
import type { Match, Prediction } from '../types'
import { formatDateTime, isMatchUpcoming } from '../lib/utils'

export function MatchCard({ match }: { match: Match & { prediction?: Prediction | null } }) {
  const { player } = useAuth()
  const { toast } = useToast()
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
    try {
      await submitPrediction.mutateAsync({
        playerId: player.id,
        matchId: match.id,
        predHome: Number(predHome),
        predAway: Number(predAway),
        badgeIdUsed: selectedBadge || null,
      })
      toast('Prediction saved!', 'success')
    } catch {
      toast('Failed to save prediction', 'error')
    }
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
    <div className="bg-white rounded-xl shadow-sm border border-border/50 p-4 hover:shadow-md transition-shadow animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {match.stage && <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-full">{match.stage}</span>}
          {upcoming && <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Open</span>}
          {locked && !finished && <span className="text-[10px] font-medium text-amber bg-amber/10 px-2 py-0.5 rounded-full">Locked</span>}
          {finished && <span className="text-[10px] font-medium text-text-muted bg-gray-100 px-2 py-0.5 rounded-full">Finished</span>}
        </div>
        <span className="text-[11px] text-text-muted">{formatDateTime(match.kickoff_at)}</span>
      </div>

      <div className="flex items-center justify-between gap-3 my-4">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {match.home_team?.flag_url && <img src={match.home_team.flag_url} alt="" className="w-6 h-4 object-contain shrink-0" />}
          <span className="font-semibold text-sm truncate">{match.home_team?.name ?? '?'}</span>
        </div>

        {upcoming && (
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="number" min="0" max="99"
              className="w-12 h-11 text-center border-2 border-border focus:border-primary rounded-xl text-lg font-bold outline-none transition-colors"
              value={predHome}
              onChange={e => setPredHome(e.target.value)}
              disabled={submitPrediction.isPending}
            />
            <span className="text-text-muted font-bold px-0.5">:</span>
            <input
              type="number" min="0" max="99"
              className="w-12 h-11 text-center border-2 border-border focus:border-primary rounded-xl text-lg font-bold outline-none transition-colors"
              value={predAway}
              onChange={e => setPredAway(e.target.value)}
              disabled={submitPrediction.isPending}
            />
          </div>
        )}

        {locked && (
          <div className="flex items-center gap-1 text-lg font-bold shrink-0">
            <span>{match.prediction?.pred_home ?? '-'}</span>
            <span className="text-text-muted">:</span>
            <span>{match.prediction?.pred_away ?? '-'}</span>
            {finished && match.prediction && (
              <span className="text-xs text-text-muted ml-1">
                ({match.prediction.pts_total > 0 ? '+' : ''}{match.prediction.pts_total})
              </span>
            )}
          </div>
        )}

        <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
          <span className="font-semibold text-sm truncate">{match.away_team?.name ?? '?'}</span>
          {match.away_team?.flag_url && <img src={match.away_team.flag_url} alt="" className="w-6 h-4 object-contain shrink-0" />}
        </div>
      </div>

      {finished && actualH !== null && actualA !== null && (
        <div className="flex items-center justify-center gap-2 mb-3 bg-gray-50 rounded-lg py-2">
          <span className="text-xs font-medium">{match.home_team?.name}</span>
          <span className="font-bold text-sm">{actualH}</span>
          <span className="text-text-muted text-xs">-</span>
          <span className="font-bold text-sm">{actualA}</span>
          <span className="text-xs font-medium">{match.away_team?.name}</span>
        </div>
      )}

      {resultBadge && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {resultBadge === 'exact' && <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full font-semibold">Exact Score ✓</span>}
          {resultBadge === 'result' && <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full font-semibold">Correct Result ✓</span>}
          {resultBadge === 'wrong' && <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-[10px] rounded-full font-semibold">Wrong ✗</span>}
          <span className="text-sm font-bold text-text">+{match.prediction?.pts_total ?? 0} pts</span>
          {match.prediction?.badge && (
            <span className="text-[10px] text-text-muted bg-gray-100 px-2 py-0.5 rounded-full">
              {match.prediction.badge.name} ({match.prediction.badge.type === 'multiplier' ? '×' : '+'}{match.prediction.badge.factor})
            </span>
          )}
        </div>
      )}

      {upcoming && (
        <div className="space-y-2 mt-3 border-t border-border/50 pt-3">
          {badges && badges.length > 0 && (
            <select
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-white focus:border-primary outline-none transition-colors"
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
            className="w-full rounded-xl"
            onClick={handleSubmit}
            disabled={submitPrediction.isPending || predHome === '' || predAway === ''}
          >
            {submitPrediction.isPending ? 'Saving...' : match.prediction ? 'Update Prediction ✓' : 'Submit Prediction'}
          </Button>
        </div>
      )}
    </div>
  )
}
