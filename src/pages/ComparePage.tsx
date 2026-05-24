import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Select, LoadingSpinner } from '../components/ui'

interface MatchInfo {
  kickoff_at: string
  stage: string | null
  status: string
  home_score: number | null
  away_score: number | null
  home_team: { name: string; code: string | null; flag_url: string | null } | null
  away_team: { name: string; code: string | null; flag_url: string | null } | null
}

interface PredInfo {
  predHome: number
  predAway: number
  pts: number
  badge: string | null
}

interface CommonMatch {
  matchId: string
  match: MatchInfo | null
  p1: PredInfo
  p2: PredInfo
}

export default function ComparePage() {
  const [p1Id, setP1Id] = useState('')
  const [p2Id, setP2Id] = useState('')

  const { data: players } = useQuery({
    queryKey: ['players-list'],
    queryFn: async () => {
      const { data } = await supabase.from('players').select('id, name, total_points').order('name')
      return data ?? []
    },
  })

  return (
    <div className="pb-20 max-w-3xl mx-auto animate-fade-in">
      <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
        <Link to="/leaderboard" className="text-xs text-primary mb-2 inline-block">&larr; Leaderboard</Link>
        <h1 className="text-xl font-bold text-text">Head-to-Head</h1>
        <p className="text-sm text-text-muted mt-0.5">Compare two players</p>
      </div>

      <div className="px-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div>
            <label className="text-xs text-text-muted font-medium mb-1 block">Player 1</label>
            <Select value={p1Id} onChange={e => setP1Id(e.target.value)}>
              <option value="">Select...</option>
              {players?.filter(p => p.id !== p2Id).map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.total_points} pts)</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-xs text-text-muted font-medium mb-1 block">Player 2</label>
            <Select value={p2Id} onChange={e => setP2Id(e.target.value)}>
              <option value="">Select...</option>
              {players?.filter(p => p.id !== p1Id).map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.total_points} pts)</option>
              ))}
            </Select>
          </div>
        </div>

        {p1Id && p2Id && <Comparison p1Id={p1Id} p2Id={p2Id} />}
      </div>
    </div>
  )
}

function Comparison({ p1Id, p2Id }: { p1Id: string; p2Id: string }) {
  const { data: p1, isLoading: l1 } = useQuery({
    queryKey: ['compare-player', p1Id],
    queryFn: async () => {
      const { data } = await supabase.from('players').select('name, total_points').eq('id', p1Id).single()
      return data as { name: string; total_points: number } | null
    },
  })

  const { data: p2, isLoading: l2 } = useQuery({
    queryKey: ['compare-player', p2Id],
    queryFn: async () => {
      const { data } = await supabase.from('players').select('name, total_points').eq('id', p2Id).single()
      return data as { name: string; total_points: number } | null
    },
  })

  const { data: common } = useQuery({
    queryKey: ['compare-common', p1Id, p2Id],
    queryFn: async () => {
      const [r1, r2] = await Promise.all([
        supabase
          .from('predictions')
          .select('match_id, pred_home, pred_away, pts_total, badge_id_used, match:match_id(kickoff_at, stage, status, home_score, away_score, home_team:home_team_id(name, code, flag_url), away_team:away_team_id(name, code, flag_url))')
          .eq('player_id', p1Id),
        supabase
          .from('predictions')
          .select('match_id, pred_home, pred_away, pts_total, badge_id_used, match:match_id(kickoff_at, stage, status, home_score, away_score, home_team:home_team_id(name, code, flag_url), away_team:away_team_id(name, code, flag_url))')
          .eq('player_id', p2Id),
      ])

      if (!r1.data || !r2.data) return []

      const map1 = new Map(r1.data.map(normalizePred))
      const map2 = new Map(r2.data.map(normalizePred))

      const commonIds = [...map1.keys()].filter(id => map2.has(id))

      return commonIds.map(id => {
        const a = map1.get(id)!
        const b = map2.get(id)!
        return {
          matchId: id,
          match: a.match,
          p1: { predHome: a.predHome, predAway: a.predAway, pts: a.pts, badge: a.badge },
          p2: { predHome: b.predHome, predAway: b.predAway, pts: b.pts, badge: b.badge },
        } as CommonMatch
      }).filter(c => c.match?.status === 'locked' || c.match?.status === 'finished')
      .sort((a, b) => {
        const da = a.match?.kickoff_at ?? ''
        const db = b.match?.kickoff_at ?? ''
        return db.localeCompare(da)
      })
    },
  })

  const { data: badges1 } = useQuery({
    queryKey: ['compare-badges', p1Id],
    queryFn: async () => {
      const { data } = await supabase.from('player_badges').select('*, badge:badge_id(name, type, factor)').eq('player_id', p1Id)
      return data ?? []
    },
  })

  const { data: badges2 } = useQuery({
    queryKey: ['compare-badges', p2Id],
    queryFn: async () => {
      const { data } = await supabase.from('player_badges').select('*, badge:badge_id(name, type, factor)').eq('player_id', p2Id)
      return data ?? []
    },
  })

  if (l1 || l2) return <LoadingSpinner />

  const allPreds1 = common?.map(c => c.p1) ?? []
  const allPreds2 = common?.map(c => c.p2) ?? []
  const totalPts1 = allPreds1.reduce((s, p) => s + p.pts, 0)
  const totalPts2 = allPreds2.reduce((s, p) => s + p.pts, 0)
  const correct1 = allPreds1.filter(p => p.pts > 0).length
  const correct2 = allPreds2.filter(p => p.pts > 0).length
  const total = common?.length ?? 0
  const wins1 = common?.filter(c => c.p1.pts > c.p2.pts).length ?? 0
  const wins2 = common?.filter(c => c.p2.pts > c.p1.pts).length ?? 0
  const draws = common?.filter(c => c.p1.pts === c.p2.pts).length ?? 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <StatBox label="Total Points" v1={totalPts1} v2={totalPts2} highlight />
        <StatBox label="Correct" v1={correct1} v2={correct2} highlight />
        <StatBox label="Accuracy" v1={total > 0 ? Math.round(correct1 / total * 100) : 0} v2={total > 0 ? Math.round(correct2 / total * 100) : 0} suffix="%" highlight />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatBox label="Head-to-Head" v1={wins1} v2={wins2} suffix=" wins" center />
        <div className="glass rounded-2xl p-3 text-center flex flex-col items-center justify-center">
          <div className="text-xs text-text-muted">Draws</div>
          <div className="text-lg font-bold text-text">{draws}</div>
        </div>
      </div>

      {badges1 && badges1.length > 0 && badges2 && badges2.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <BadgeList badges={badges1} />
          <BadgeList badges={badges2} />
        </div>
      )}

      <h3 className="text-sm font-semibold text-primary uppercase tracking-wide pt-2">Common Matches</h3>

      {(!common || common.length === 0) ? (
        <div className="text-center py-8 text-text-muted text-sm">No common matches</div>
      ) : (
        <div className="space-y-2">
          {common.map(c => {
            const m = c.match
            const isFinished = m?.status === 'finished'
            const isLive = m?.status === 'locked'

            return (
              <div key={c.matchId} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest bg-surface px-2 py-0.5 rounded-full">{m?.stage ?? '?'}</span>
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${isFinished ? 'bg-success/10 text-success border border-success/20' : isLive ? 'bg-warning/10 text-warning border border-warning/20' : 'bg-surface-alt text-text-muted'}`}>
                    {m?.status ?? '?'}
                  </span>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
                    <span className="font-semibold text-xs text-text truncate">{m?.home_team?.name ?? '?'}</span>
                  </div>
                  <span className="font-bold text-sm text-text mx-2 shrink-0">
                    {isFinished ? `${m?.home_score}-${m?.away_score}` : 'vs'}
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="font-semibold text-xs text-text truncate">{m?.away_team?.name ?? '?'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <PredCell name={p1?.name ?? '?'} pred={c.p1} side="left" />
                  <PredCell name={p2?.name ?? '?'} pred={c.p2} side="right" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function normalizePred(raw: Record<string, unknown>): [string, { predHome: number; predAway: number; pts: number; badge: string | null; match: MatchInfo | null }] {
  const mRaw = raw.match as Record<string, unknown> | Array<Record<string, unknown>> | null
  const m = mRaw ? (Array.isArray(mRaw) ? mRaw[0] : mRaw) : null

  let match: MatchInfo | null = null
  if (m) {
    const homeTeamRaw = m.home_team as Record<string, unknown> | Array<Record<string, unknown>> | null
    const awayTeamRaw = m.away_team as Record<string, unknown> | Array<Record<string, unknown>> | null
    const ht = homeTeamRaw ? (Array.isArray(homeTeamRaw) ? homeTeamRaw[0] : homeTeamRaw) as { name: string; code: string | null; flag_url: string | null } | null : null
    const at = awayTeamRaw ? (Array.isArray(awayTeamRaw) ? awayTeamRaw[0] : awayTeamRaw) as { name: string; code: string | null; flag_url: string | null } | null : null

    match = {
      kickoff_at: m.kickoff_at as string ?? '',
      stage: m.stage as string | null,
      status: m.status as string ?? 'scheduled',
      home_score: m.home_score as number | null,
      away_score: m.away_score as number | null,
      home_team: ht,
      away_team: at,
    }
  }

  return [
    raw.match_id as string,
    {
      predHome: raw.pred_home as number,
      predAway: raw.pred_away as number,
      pts: raw.pts_total as number,
      badge: raw.badge_id_used as string | null,
      match,
    },
  ]
}

function PredCell({ name, pred, side }: { name: string; pred: PredInfo; side: 'left' | 'right' }) {
  return (
    <div className={`bg-surface-alt rounded-xl px-3 py-2 ${side === 'right' ? 'text-right' : ''}`}>
      <div className={`text-[10px] font-medium text-text-muted ${side === 'right' ? 'text-right' : ''}`}>{name}</div>
      <div className="flex items-center gap-1.5 mt-0.5 justify-between">
        <span className={`font-bold text-sm ${pred.pts > 0 ? 'text-success' : 'text-text-dim'}`}>
          {pred.predHome}-{pred.predAway}
        </span>
        <span className={`text-xs font-bold ${pred.pts > 0 ? 'text-success' : 'text-text-dim'}`}>
          {pred.pts > 0 ? `+${pred.pts}` : '0'}
        </span>
      </div>
      {pred.badge && <div className="text-[9px] text-text-dim mt-0.5">Badge used</div>}
    </div>
  )
}

function StatBox({ label, v1, v2, suffix = '', highlight = false, center = false }: { label: string; v1: number; v2: number; suffix?: string; highlight?: boolean; center?: boolean }) {
  const better1 = v1 > v2
  const better2 = v2 > v1
  return (
    <div className="glass rounded-2xl p-3">
      <div className={`text-[10px] text-text-muted font-medium mb-1.5 ${center ? 'text-center' : ''}`}>{label}</div>
      <div className={`grid grid-cols-2 gap-1 ${center ? 'text-center' : ''}`}>
        <div className={`${center ? 'text-center' : 'text-left'} ${highlight && better1 ? 'text-success' : 'text-text'}`}>
          <span className="text-lg font-bold">{v1}</span>
          <span className="text-[9px] text-text-dim ml-0.5">{suffix}</span>
          {highlight && better1 && <span className="text-success text-xs ml-1">▲</span>}
        </div>
        <div className={`${center ? 'text-center' : 'text-right'} ${highlight && better2 ? 'text-success' : 'text-text'}`}>
          <span className="text-lg font-bold">{v2}</span>
          <span className="text-[9px] text-text-dim ml-0.5">{suffix}</span>
          {highlight && better2 && <span className="text-success text-xs ml-1">▲</span>}
        </div>
      </div>
    </div>
  )
}

function BadgeList({ badges }: { badges: Array<Record<string, unknown>> }) {
  return (
    <div className="glass rounded-2xl p-3">
      <div className="text-[10px] text-text-muted font-medium mb-1.5">Badges</div>
      <div className="flex flex-wrap gap-1">
        {badges.map((pb: Record<string, unknown>) => {
          const bRaw = pb.badge as Record<string, unknown> | Array<Record<string, unknown>> | null
          const b = bRaw ? (Array.isArray(bRaw) ? bRaw[0] : bRaw) as { name: string; type: string; factor: number } | null : null
          if (!b) return null
          return (
            <span key={pb.id as string} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${b.type === 'multiplier' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-accent/10 text-accent border border-accent/20'}`}>
              {b.name} ({b.type === 'multiplier' ? '×' : '+'}{b.factor})
            </span>
          )
        })}
        {badges.length === 0 && <span className="text-[10px] text-text-dim">None</span>}
      </div>
    </div>
  )
}
