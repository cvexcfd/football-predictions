import { useMemo } from 'react'

interface Team {
  id: string
  name: string
  flag_url: string | null
  group: string
}

interface Match {
  id: string
  home_team_id: string
  away_team_id: string
  home_team: Team
  away_team: Team
  home_score: number | null
  away_score: number | null
  stage: string
}

interface TeamStanding {
  team_id: string
  name: string
  flag_url: string | null
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
}

interface GroupStandingsProps {
  group: string
  teams: Team[]
  matches: Match[]
}

export function GroupStandings({ group, teams, matches }: GroupStandingsProps) {
  const standings = useMemo<TeamStanding[]>(() => {
    // Initialize standings for each team in the group
    const groupTeams = teams.filter(t => t.group === group)
    const standingsMap = new Map<string, TeamStanding>()
    groupTeams.forEach(team => {
      standingsMap.set(team.id, {
        team_id: team.id,
        name: team.name,
        flag_url: team.flag_url,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goals_for: 0,
        goals_against: 0,
        goal_difference: 0,
        points: 0,
      })
    })

    // Process each match
    matches.forEach(match => {
      const homeTeam = standingsMap.get(match.home_team_id)
      const awayTeam = standingsMap.get(match.away_team_id)

      if (!homeTeam || !awayTeam) return

      // Update played
      homeTeam.played++
      awayTeam.played++

      // Update goals
      const homeScore = match.home_score ?? 0
      const awayScore = match.away_score ?? 0
      homeTeam.goals_for += homeScore
      homeTeam.goals_against += awayScore
      awayTeam.goals_for += awayScore
      awayTeam.goals_against += homeScore

      // Update result
      if (homeScore > awayScore) {
        homeTeam.won++
        awayTeam.lost++
        homeTeam.points += 3
      } else if (homeScore < awayScore) {
        awayTeam.won++
        homeTeam.lost++
        awayTeam.points += 3
      } else {
        homeTeam.drawn++
        awayTeam.drawn++
        homeTeam.points += 1
        awayTeam.points += 1
      }
    })

    // Convert map to array and calculate goal difference
    const standingsArray = Array.from(standingsMap.values()).map(team => ({
      ...team,
      goal_difference: team.goals_for - team.goals_against,
    }))

    // Sort by points (desc), then goal difference (desc), then goals for (desc)
    standingsArray.sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points
      if (a.goal_difference !== b.goal_difference) return b.goal_difference - a.goal_difference
      return b.goals_for - a.goals_for
    })

    return standingsArray
  }, [group, teams, matches])

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 text-text">Group {group}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border/50">
          <thead className="bg-surface-alt">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Pos
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Team
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Pld
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                W
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                D
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                L
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                GF
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                GA
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                GD
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Pts
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {standings.map((team, index) => (
              <tr key={team.team_id} className="hover:bg-surface-alt/50">
                <td className="px-4 py-3 text-sm font-medium text-text">
                  {index + 1}
                </td>
                <td className="px-4 py-3 flex items-center space-x-3">
                  {team.flag_url && (
                    <img
                      src={team.flag_url}
                      alt={team.name}
                      className="w-5 h-3.5 object-contain shrink-0"
                    />
                  )}
                  <span className="font-medium text-text">{team.name}</span>
                </td>
                <td className="px-4 py-3 text-sm text-text">{team.played}</td>
                <td className="px-4 py-3 text-sm text-text">{team.won}</td>
                <td className="px-4 py-3 text-sm text-text">{team.drawn}</td>
                <td className="px-4 py-3 text-sm text-text">{team.lost}</td>
                <td className="px-4 py-3 text-sm text-text">{team.goals_for}</td>
                <td className="px-4 py-3 text-sm text-text">{team.goals_against}</td>
                <td className="px-4 py-3 text-sm text-text">{team.goal_difference}</td>
                <td className="px-4 py-3 text-sm font-semibold text-text">{team.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}