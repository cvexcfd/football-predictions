import { createClient } from '@supabase/supabase-js'

const NAME_MAP: Record<string, string> = {
  'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  'Czech Republic': 'Czechia',
  'Democratic Republic of the Congo': 'DR Congo',
  'Turkey': 'Türkiye',
  'United States': 'USA',
}

interface ApiMatch {
  home_team_name_en?: string
  away_team_name_en?: string
  home_score: string
  away_score: string
  finished: string
  type: string
}

interface DbMatch {
  id: string
  home_team_id: string
  away_team_id: string
  status: string
  home_score: number | null
  away_score: number | null
  home_team_name?: string
  away_team_name?: string
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed — use POST', { status: 405 })
  }

  const apiKey = process.env.WC2026_API_KEY
  if (!apiKey) {
    return new Response('Missing WC2026_API_KEY env var', { status: 500 })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return new Response('Missing Supabase env vars', { status: 500 })
  }
  const supabase = createClient(supabaseUrl, supabaseKey)

  // 1. Fetch matches from worldcup26.ir
  const apiRes = await fetch('https://worldcup26.ir/get/games', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!apiRes.ok) {
    return new Response(`worldcup26.ir returned ${apiRes.status}`, { status: 502 })
  }
  const apiData: { games: ApiMatch[] } = await apiRes.json()
  const apiMatches = apiData.games ?? []

  // 2. Fetch our DB teams to build name→id mapping
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')

  if (!teams) {
    return new Response('Failed to fetch teams', { status: 500 })
  }

  const teamByName: Record<string, string> = {}
  for (const t of teams) {
    const normalized = t.name.trim().toLowerCase()
    teamByName[normalized] = t.id
    teamByName[t.name.trim()] = t.id
  }

  // 3. Fetch our DB matches that are locked or finished (already scored)
  const { data: dbMatches } = await supabase
    .from('matches')
    .select('id, home_team_id, away_team_id, status, home_score, away_score')
    .in('status', ['locked', 'finished'])

  if (!dbMatches) {
    return new Response('Failed to fetch matches', { status: 500 })
  }

  // Build lookup: set of "homeTeamId-awayTeamId" for group-stage locked matches
  const dbMatchByTeams = new Map<string, DbMatch>()
  for (const m of dbMatches) {
    dbMatchByTeams.set(`${m.home_team_id}-${m.away_team_id}`, m)
    dbMatchByTeams.set(`${m.away_team_id}-${m.home_team_id}`, m)
  }

  // 4. Match and score
  const scored: string[] = []
  const errors: string[] = []
  const skipped: string[] = []

  for (const apiM of apiMatches) {
    if (apiM.type !== 'group') continue
    if (apiM.finished !== 'TRUE') continue

    const homeName = apiM.home_team_name_en
    const awayName = apiM.away_team_name_en
    if (!homeName || !awayName) continue

    const hs = parseInt(apiM.home_score, 10)
    const as_ = parseInt(apiM.away_score, 10)
    if (isNaN(hs) || isNaN(as_)) continue

    const mappedHome = NAME_MAP[homeName] ?? homeName
    const mappedAway = NAME_MAP[awayName] ?? awayName

    const homeId = teamByName[mappedHome] || teamByName[mappedHome.toLowerCase()]
    const awayId = teamByName[mappedAway] || teamByName[mappedAway.toLowerCase()]
    if (!homeId || !awayId) {
      errors.push(`Teams not found: ${homeName} (→${mappedHome}) vs ${awayName} (→${mappedAway})`)
      continue
    }

    const dbMatch = dbMatchByTeams.get(`${homeId}-${awayId}`)
    if (!dbMatch) {
      skipped.push(`No locked/finished match in DB: ${homeName} vs ${awayName}`)
      continue
    }

    // Don't re-score if already has same score
    if (dbMatch.status === 'finished' && dbMatch.home_score === hs && dbMatch.away_score === as_) {
      skipped.push(`Already scored: ${homeName} ${hs}-${as_} ${awayName}`)
      continue
    }

    // If finished with different score or locked (not yet scored) — update
    const { error } = await supabase.rpc('calculate_match_points', {
      p_match_id: dbMatch.id,
      p_home_score: hs,
      p_away_score: as_,
    })
    if (error) {
      errors.push(`Score error for ${homeName} vs ${awayName}: ${error.message}`)
    } else {
      scored.push(`${homeName} ${hs}-${as_} ${awayName}`)
    }
  }

  return new Response(JSON.stringify({
    scored: scored.length,
    skipped: skipped.length,
    errors: errors.length,
    details: { scored, skipped, errors },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = {
  runtime: 'edge',
}
