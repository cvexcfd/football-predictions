import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Button, Input, Select, LoadingSpinner } from '../components/ui'
import { useToast } from '../components/Toast'

interface GroupStanding {
  team_id: string
  team_name: string
  group_name: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  points: number
}

interface KnockoutMatch {
  id: string
  stage: string
  home_team_id: string | null
  away_team_id: string | null
  home_score: number | null
  away_score: number | null
  status: string
  kickoff_at: string
  home_team: { id: string; name: string; flag_url: string | null; code: string | null } | null
  away_team: { id: string; name: string; flag_url: string | null; code: string | null } | null
}

const KNOCKOUT_STAGES = ['Round of 32', 'Round of 16', 'Quarter-Final', 'Semi-Final', 'Third Place', 'Final']

function computeGroupStandings(rows: Array<Record<string, unknown>>): GroupStanding[] {
  const teamMap = new Map<string, { name: string; group_name: string; flag_url: string | null; code: string | null }>()
  const stats = new Map<string, { played: number; won: number; drawn: number; lost: number; gf: number; ga: number; points: number }>()

  for (const r of rows) {
    const homeTeam = r.home_team as Record<string, unknown> | null
    const awayTeam = r.away_team as Record<string, unknown> | null
    const homeTeamId = r.home_team_id as string
    const awayTeamId = r.away_team_id as string
    const homeScore = r.home_score as number
    const awayScore = r.away_score as number

    for (const t of [homeTeam, awayTeam]) {
      if (t && !teamMap.has(t.id as string)) {
        teamMap.set(t.id as string, { name: t.name as string, group_name: (t.group_name as string) ?? '', flag_url: t.flag_url as string | null, code: t.code as string | null })
      }
    }
    if (!stats.has(homeTeamId)) stats.set(homeTeamId, { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 })
    if (!stats.has(awayTeamId)) stats.set(awayTeamId, { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 })

    const h = stats.get(homeTeamId)!
    const a = stats.get(awayTeamId)!
    h.played++
    a.played++
    h.gf += homeScore
    h.ga += awayScore
    a.gf += awayScore
    a.ga += homeScore

    if (homeScore > awayScore) {
      h.won++; h.points += 3
      a.lost++
    } else if (homeScore < awayScore) {
      a.won++; a.points += 3
      h.lost++
    } else {
      h.drawn++; h.points++
      a.drawn++; a.points++
    }
  }

  const standings: GroupStanding[] = []
  for (const [teamId, s] of stats) {
    const t = teamMap.get(teamId)!
    standings.push({
      team_id: teamId,
      team_name: t.name,
      group_name: t.group_name,
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      gf: s.gf,
      ga: s.ga,
      gd: s.gf - s.ga,
      points: s.points,
    })
  }

  standings.sort((a, b) => {
    if (a.group_name !== b.group_name) return a.group_name.localeCompare(b.group_name)
    if (b.points !== a.points) return b.points - a.points
    if (b.gd !== a.gd) return b.gd - a.gd
    if (b.gf !== a.gf) return b.gf - a.gf
    return a.team_name.localeCompare(b.team_name)
  })

  return standings
}

function getAdvancingTeams(standings: GroupStanding[]): { groupWinners: GroupStanding[]; groupRunnersUp: GroupStanding[] } {
  const byGroup = new Map<string, GroupStanding[]>()
  for (const s of standings) {
    const arr = byGroup.get(s.group_name) ?? []
    arr.push(s)
    byGroup.set(s.group_name, arr)
  }
  const winners: GroupStanding[] = []
  const runnersUp: GroupStanding[] = []
  for (const [, teams] of byGroup) {
    if (teams.length >= 2) {
      winners.push(teams[0])
      runnersUp.push(teams[1])
    }
  }
  return { groupWinners: winners, groupRunnersUp: runnersUp }
}

export default function AdminBracketPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [editTeamMatchId, setEditTeamMatchId] = useState<string | null>(null)
  const [editHomeTeam, setEditHomeTeam] = useState('')
  const [editAwayTeam, setEditAwayTeam] = useState('')

  const { data: teams } = useQuery({
    queryKey: ['teams-all'],
    queryFn: async () => {
      const { data } = await supabase.from('teams').select('*').order('name')
      return data ?? []
    },
  })

  const { data: groupMatches } = useQuery({
    queryKey: ['group-matches-finished'],
    queryFn: async () => {
      const { data } = await supabase
        .from('matches')
        .select(`
          id, home_team_id, away_team_id, home_score, away_score,
          home_team:home_team_id(id, name, group_name, flag_url, code),
          away_team:away_team_id(id, name, group_name, flag_url, code)
        `)
        .eq('stage', 'Group Stage')
        .eq('status', 'finished')
      return ((data ?? []) as unknown[]).map(m => {
        const r = m as Record<string, unknown>
        return {
          ...r,
          home_team: Array.isArray(r.home_team) ? (r.home_team as Array<Record<string, unknown>>)[0] ?? null : r.home_team ?? null,
          away_team: Array.isArray(r.away_team) ? (r.away_team as Array<Record<string, unknown>>)[0] ?? null : r.away_team ?? null,
        }
      })
    },
  })

  const { data: knockoutMatches, isLoading } = useQuery({
    queryKey: ['knockout-matches'],
    queryFn: async () => {
      const { data } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:home_team_id(id, name, flag_url, code),
          away_team:away_team_id(id, name, flag_url, code)
        `)
        .in('stage', KNOCKOUT_STAGES)
        .order('kickoff_at', { ascending: true })
      return ((data ?? []) as unknown[]).map(m => {
        const r = m as Record<string, unknown>
        return {
          ...r,
          home_team: Array.isArray(r.home_team) ? (r.home_team as Array<Record<string, unknown>>)[0] ?? null : r.home_team ?? null,
          away_team: Array.isArray(r.away_team) ? (r.away_team as Array<Record<string, unknown>>)[0] ?? null : r.away_team ?? null,
        } as KnockoutMatch
      })
    },
  })

  const standings = groupMatches ? computeGroupStandings(groupMatches as Array<Record<string, unknown>>) : []

  const { groupWinners, groupRunnersUp } = getAdvancingTeams(standings)

  const winnerMap = new Map<string, string>()
  for (const w of groupWinners) winnerMap.set(w.group_name, w.team_id)
  const runnerMap = new Map<string, string>()
  for (const r of groupRunnersUp) runnerMap.set(r.group_name, r.team_id)

  const updateKnockoutTeam = useMutation({
    mutationFn: async ({ matchId, homeTeamId, awayTeamId }: { matchId: string; homeTeamId: string; awayTeamId: string }) => {
      const { error } = await supabase.from('matches').update({ home_team_id: homeTeamId, away_team_id: awayTeamId }).eq('id', matchId)
      if (error) throw error
    },
    onSuccess: () => {
      toast('Match teams updated', 'success')
      qc.invalidateQueries({ queryKey: ['knockout-matches'] })
      setEditTeamMatchId(null)
    },
    onError: (err: Error) => toast(err.message, 'error'),
  })

  const groupedByStage = KNOCKOUT_STAGES.map(stage => ({
    stage,
    matches: (knockoutMatches ?? []).filter(m => m.stage === stage),
  }))

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="pb-20 max-w-3xl mx-auto">
      <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
        <h1 className="text-lg font-semibold text-text">Admin</h1>
        <p className="text-2xl font-bold mt-1 text-text">Knockout Bracket</p>
      </div>

      <div className="px-4">
        <div className="glass rounded-2xl p-4 mb-4">
          <h2 className="text-sm font-semibold text-text mb-2">Group Standings</h2>
          {standings.length === 0 ? (
            <p className="text-xs text-text-muted">No finished group matches yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border/50 bg-surface-alt">
                    <th className="px-2 py-1.5 text-left font-semibold text-text-muted">Group</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-text-muted">Team</th>
                    <th className="px-2 py-1.5 text-center font-semibold text-text-muted">P</th>
                    <th className="px-2 py-1.5 text-center font-semibold text-text-muted">W</th>
                    <th className="px-2 py-1.5 text-center font-semibold text-text-muted">D</th>
                    <th className="px-2 py-1.5 text-center font-semibold text-text-muted">L</th>
                    <th className="px-2 py-1.5 text-center font-semibold text-text-muted">GD</th>
                    <th className="px-2 py-1.5 text-center font-semibold text-text-muted">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map(s => (
                    <tr key={s.team_id} className="border-b border-border/50 last:border-0">
                      <td className="px-2 py-1.5 font-medium text-text-muted">{s.group_name}</td>
                      <td className="px-2 py-1.5 font-medium text-text">{s.team_name}</td>
                      <td className="px-2 py-1.5 text-center text-text">{s.played}</td>
                      <td className="px-2 py-1.5 text-center text-text">{s.won}</td>
                      <td className="px-2 py-1.5 text-center text-text">{s.drawn}</td>
                      <td className="px-2 py-1.5 text-center text-text">{s.lost}</td>
                      <td className="px-2 py-1.5 text-center text-text">{s.gd > 0 ? '+' : ''}{s.gd}</td>
                      <td className="px-2 py-1.5 text-center font-bold text-primary">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {groupedByStage.map(({ stage, matches }) => (
          <div key={stage} className="glass rounded-2xl p-4 mb-4">
            <h2 className="text-sm font-semibold text-text mb-3">{stage}</h2>
            {matches.length === 0 ? (
              <p className="text-xs text-text-muted">No matches in this stage</p>
            ) : (
              <div className="space-y-3">
                {matches.map(m => {
                  const autoHome = m.home_team_id
                  const autoAway = m.away_team_id

                  const isEditing = editTeamMatchId === m.id

                  return (
                    <div key={m.id} className="border border-border/50 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                          {isEditing ? (
                            <Select value={editHomeTeam} onChange={e => setEditHomeTeam(e.target.value)} className="w-32">
                              <option value="">Select team</option>
                              {teams?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </Select>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {m.home_team?.flag_url && <img src={m.home_team.flag_url} alt="" className="w-4 h-3 object-contain" />}
                              <span className="font-semibold text-sm text-text truncate">{m.home_team?.name ?? 'TBD'}</span>
                            </div>
                          )}
                        </div>
                        <div className="mx-3 flex items-center gap-1">
                          {m.status === 'finished' && m.home_score !== null && m.away_score !== null ? (
                            <span className="font-bold text-lg text-text">{m.home_score}-{m.away_score}</span>
                          ) : (
                            <span className="text-text-muted text-sm">vs</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {isEditing ? (
                            <Select value={editAwayTeam} onChange={e => setEditAwayTeam(e.target.value)} className="w-32">
                              <option value="">Select team</option>
                              {teams?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </Select>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-sm text-text truncate">{m.away_team?.name ?? 'TBD'}</span>
                              {m.away_team?.flag_url && <img src={m.away_team.flag_url} alt="" className="w-4 h-3 object-contain" />}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        {!m.home_team_id && groupWinners.length > 0 && (
                          <div className="text-[10px] text-text-muted">
                            Suggested: {groupWinners.map(w => `${w.team_name} (${w.group_name} winner)`).join(', ')}
                          </div>
                        )}
                        {m.status !== 'finished' && (
                          <Button size="sm" variant="ghost" className="text-[10px] px-2 h-auto ml-auto"
                            onClick={() => {
                              if (isEditing) {
                                updateKnockoutTeam.mutate({ matchId: m.id, homeTeamId: editHomeTeam, awayTeamId: editAwayTeam })
                              } else {
                                setEditTeamMatchId(m.id)
                                setEditHomeTeam(m.home_team_id ?? '')
                                setEditAwayTeam(m.away_team_id ?? '')
                              }
                            }}>
                            {isEditing ? 'Save teams' : 'Set teams'}
                          </Button>
                        )}
                        {isEditing && (
                          <Button size="sm" variant="ghost" className="text-[10px] px-2 h-auto ml-1" onClick={() => setEditTeamMatchId(null)}>Cancel</Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
