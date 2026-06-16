import { useAuth } from '../hooks/useAuth'
import { useSubmitPrediction } from '../hooks/usePredictions'
import { usePlayerBadges } from '../hooks/useBadges'
import { useToast } from './Toast'
import { Button, Badge, Select } from './ui'
import { useState } from 'react'
import type { Match, Prediction } from '../types'
import { formatDateTime, isMatchUpcoming } from '../lib/utils'

interface Props {
  match: Match & { prediction?: Prediction | null }
  index?: number
}

export function MatchCard({ match, index = 0 }: Props) {
  const { player } = useAuth()
  const { toast } = useToast()
  const submitPrediction = useSubmitPrediction()
  const { data: badges } = usePlayerBadges(player?.id ?? '')
  const [predHome, setPredHome] = useState(match.prediction?.pred_home ?? '')
  const [predAway, setPredAway] = useState(match.prediction?.pred_away ?? '')
  const [selectedBadge, setSelectedBadge] = useState(match.prediction?.badge_id_used ?? '')

  const now = new Date()
  const kickoff = new Date(match.kickoff_at)
  const diffToKickoff = kickoff.getTime() - now.getTime()

  // Determine match status for UI
  let upcoming = false
  let locked = false
  let finished = match.status === 'finished'
  let isLiveMatch = false

  if (match.status === 'upcoming') {
    // More than 30 minutes until kickoff: upcoming (predictions open)
    if (diffToKickoff > 30 * 60 * 1000) {
      upcoming = true
    }
    // Within 30 minutes before kickoff: locked (predictions closed)
    else if (diffToKickoff >= 0 && diffToKickoff <= 30 * 60 * 1000) {
      locked = true
    }
    // Kickoff in the past but status still upcoming: treat as locked (shouldn't happen with cron)
    else if (diffToKickoff < 0) {
      locked = true
    }
  } else if (match.status === 'locked') {
    locked = true
    // Check if in progress (first 2 hours after kickoff)
    isLiveMatch = now.getTime() >= kickoff.getTime() && now.getTime() < kickoff.getTime() + 2 * 60 * 60 * 1000
  }

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

  const homeCode = match.home_team?.code ?? match.home_team?.name?.slice(0, 3).toUpperCase() ?? '?'
  const awayCode = match.away_team?.code ?? match.away_team?.name?.slice(0, 3).toUpperCase() ?? '?'

  return (
    <div
      className="glass rounded-2xl p-4 hover:border-border-light transition-all duration-300 animate-fade-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
       {/* Top row: stage + status + time */}
       <div className="flex items-center justify-between mb-3">
         <div className="flex items-center gap-2">
           {match.stage && (
             <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest bg-surface-alt px-2 py-0.5 rounded-full">
               {match.stage}
             </span>
           )}
           {upcoming && <Badge variant="primary">OPEN</Badge>}
           {locked && isLiveMatch && (
             <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
               <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse-dot" />
               LIVE
             </span>
           )}
           {locked && !isLiveMatch && <Badge variant="warning">LOCKED</Badge>}
           {finished && <Badge variant="default">FINISHED</Badge>}
         </div>
         <span className="text-[11px] text-text-dim font-medium">{formatDateTime(match.kickoff_at)}</span>
       </div>

      {/* Teams vs divider */}
      <div className="flex items-center justify-between my-4">
        {/* Home */}
        <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <div className="w-10 h-7 rounded-lg bg-surface-alt flex items-center justify-center overflow-hidden">
            {match.home_team?.flag_url
              ? <img src={match.home_team.flag_url} alt="" className="w-full h-full object-contain" />
              : <span className="text-lg font-bold text-text-dim">{homeCode[0]}</span>
            }
          </div>
          <span className="font-extrabold text-lg tracking-tight text-text">{homeCode}</span>
          <span className="text-[10px] text-text-muted text-center truncate w-full leading-tight">{match.home_team?.name ?? '?'}</span>
        </div>

        {/* Score / Prediction / VS */}
        <div className="flex flex-col items-center mx-3 min-w-[80px]">
          {upcoming && (
            <div className="flex items-center gap-1">
              <input
                type="number" min="0" max="99"
                className="w-11 h-11 text-center bg-surface-alt border-2 border-border/50 focus:border-primary rounded-xl text-lg font-extrabold text-text outline-none transition-all duration-200"
                value={predHome}
                onChange={e => setPredHome(e.target.value)}
                disabled={submitPrediction.isPending}
              />
              <span className="text-text-muted font-bold text-lg">:</span>
              <input
                type="number" min="0" max="99"
                className="w-11 h-11 text-center bg-surface-alt border-2 border-border/50 focus:border-primary rounded-xl text-lg font-extrabold text-text outline-none transition-all duration-200"
                value={predAway}
                onChange={e => setPredAway(e.target.value)}
                disabled={submitPrediction.isPending}
              />
            </div>
          )}
          {locked && (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5 text-xl font-extrabold">
                <span className={finished && match.prediction ? 'text-text' : 'text-text-muted'}>{match.prediction?.is_absent ? '—' : (match.prediction?.pred_home ?? '-')}</span>
                <span className="text-text-dim font-bold">:</span>
                <span className={finished && match.prediction ? 'text-text' : 'text-text-muted'}>{match.prediction?.is_absent ? '—' : (match.prediction?.pred_away ?? '-')}</span>
              </div>
              {finished && match.prediction && (
                <span className={`text-[10px] font-bold ${match.prediction.pts_total > 0 ? 'text-success' : 'text-text-dim'}`}>
                  {match.prediction.pts_total > 0 ? `+${match.prediction.pts_total}` : '0 pts'}
                </span>
              )}
            </div>
          )}
          {!upcoming && !locked && (
            <span className="text-text-dim text-xs">—</span>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] font-semibold text-text-dim bg-surface-alt px-2 py-0.5 rounded-full">VS</span>
          </div>
        </div>

        {/* Away */}
        <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <div className="w-10 h-7 rounded-lg bg-surface-alt flex items-center justify-center overflow-hidden">
            {match.away_team?.flag_url
              ? <img src={match.away_team.flag_url} alt="" className="w-full h-full object-contain" />
              : <span className="text-lg font-bold text-text-dim">{awayCode[0]}</span>
            }
          </div>
          <span className="font-extrabold text-lg tracking-tight text-text">{awayCode}</span>
          <span className="text-[10px] text-text-muted text-center truncate w-full leading-tight">{match.away_team?.name ?? '?'}</span>
        </div>
      </div>

      {/* Actual score for finished matches */}
      {finished && actualH !== null && actualA !== null && (
        <div className="flex items-center justify-center gap-3 mb-3 bg-surface-alt rounded-xl py-2 px-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded overflow-hidden">
              {match.home_team?.flag_url && <img src={match.home_team.flag_url} alt="" className="w-full h-full object-contain" />}
            </div>
            <span className="text-xs font-medium text-text-muted">{match.home_team?.name?.slice(0, 8) ?? '?'}</span>
          </div>
          <span className="font-extrabold text-lg text-text">{actualH}</span>
          <span className="text-text-dim text-xs">—</span>
          <span className="font-extrabold text-lg text-text">{actualA}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-muted">{match.away_team?.name?.slice(0, 8) ?? '?'}</span>
            <div className="w-4 h-3 rounded overflow-hidden">
              {match.away_team?.flag_url && <img src={match.away_team.flag_url} alt="" className="w-full h-full object-contain" />}
            </div>
          </div>
        </div>
      )}

      {/* Result badges */}
      {resultBadge && (
        <div className="flex items-center justify-center gap-2 mb-3">
          {resultBadge === 'exact' && (
            <span className="px-3 py-1 text-[11px] font-bold text-gold bg-gold/10 rounded-full border border-gold/30 shadow-lg shadow-gold/10">
              ⚡ Exact Score
            </span>
          )}
          {resultBadge === 'result' && (
            <span className="px-3 py-1 text-[11px] font-semibold text-primary bg-primary/10 rounded-full border border-primary/20">
              ✓ Correct Result
            </span>
          )}
          {resultBadge === 'wrong' && (
            <span className="px-3 py-1 text-[11px] font-semibold text-danger bg-red-500/10 rounded-full border border-red-500/20">
              ✗ Wrong
            </span>
          )}
          <span className="text-sm font-bold text-success">+{match.prediction?.pts_total ?? 0}</span>
          {match.prediction?.badge && (
            <span className="text-[10px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
              {match.prediction.badge.name} ({match.prediction.badge.type === 'multiplier' ? '×' : '+'}{match.prediction.badge.factor})
            </span>
          )}
        </div>
      )}

      {/* Prediction form */}
      {upcoming && (
        <div className="space-y-2 mt-3 border-t border-border/50 pt-3">
          {badges && badges.length > 0 && (
            <Select value={selectedBadge} onChange={e => setSelectedBadge(e.target.value)}>
              <option value="">No badge</option>
              {badges.map(b => (
                <option key={b.id} value={b.badge_id}>
                  {b.badge?.name} ({b.badge?.type === 'multiplier' ? '×' : '+'}{b.badge?.factor}) — {b.quantity} left
                </option>
              ))}
            </Select>
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
