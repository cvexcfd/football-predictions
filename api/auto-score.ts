// Vercel serverless function — auto-lock + auto-score matches
// Called via vercel.json cron every 30 minutes
// Handles API timeouts/errors gracefully (unlike pg_http which blocks the DB)

import { createClient } from '@supabase/supabase-js'

const LOCK_BEFORE_MS = 30 * 60 * 1000
const SCORE_AFTER_MS = 2 * 60 * 60 * 1000
const API_TIMEOUT_MS = 20000
const BACKOFF_AFTER_ERROR_MS = 15 * 60 * 1000
const BACKOFF_AFTER_429_MS = 60 * 60 * 1000

interface MatchRow {
  id: string
  external_id: number
  home_team: { code: string } | { code: string }[]
  away_team: { code: string } | { code: string }[]
}

interface GameJson {
  id: string | number
  finished: string | boolean
  home_score: string | number
  away_score: string | number
}

function pick<T>(v: T | T[]): T {
  return Array.isArray(v) ? v[0] : v
}

export default async function handler() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars')
    return new Response('Missing env vars', { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // ── 1. Lock matches ──
  const { error: lockErr } = await supabase.rpc('auto_lock_matches')
  if (lockErr) {
    console.error('Lock error:', lockErr.message)
  }

  // ── 2. Fetch API with retries — fallback to cached_data on failure ──
  let games: GameJson[] | null = null
  let usingCache = false

  async function fetchFromApi(): Promise<GameJson[] | null> {
    const maxRetries = 3
    const retryDelays = [5000, 10000, 20000, 40000]
    let httpRes: Response | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
      try {
        httpRes = await fetch('https://worldcup26.ir/get/games', {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })
        clearTimeout(timer)
        if (httpRes.status !== 200) {
          console.error(`Fetch attempt ${attempt + 1} bad status:`, httpRes.status)
          if (attempt < maxRetries - 1) {
            await new Promise(res => setTimeout(res, retryDelays[attempt]))
            continue
          }
          return null
        }
        const body: { games?: GameJson[] } = await httpRes.json()
        if (!body?.games || !Array.isArray(body.games)) {
          console.error('API response missing games array')
          return null
        }
        // On success, store as cached_data for future use
        const details = JSON.stringify(body.games)
        supabase.from('auto_score_logs').insert({
          action: 'cached_data',
          details,
          success: true,
        }).then().catch(() => {})
        return body.games
      } catch (err) {
        clearTimeout(timer)
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error(`Fetch attempt ${attempt + 1} failed:`, msg)
        if (attempt < maxRetries - 1) {
          await new Promise(res => setTimeout(res, retryDelays[attempt]))
          continue
        }
        return null
      }
    }
    return null
  }

  async function fetchFromCache(): Promise<GameJson[] | null> {
    const { data: logs } = await supabase
      .from('auto_score_logs')
      .select('details')
      .eq('action', 'cached_data')
      .eq('success', true)
      .order('created_at', { ascending: false })
      .limit(1)
    if (!logs || logs.length === 0) return null
    try {
      const parsed = JSON.parse(logs[0].details)
      if (!Array.isArray(parsed)) return null
      return parsed as GameJson[]
    } catch {
      return null
    }
  }

  games = await fetchFromApi()
  if (!games) {
    games = await fetchFromCache()
    if (games) {
      usingCache = true
      console.log('Using cached games data')
      await supabase.from('auto_score_logs').insert({
        action: 'info',
        details: 'Using cached games data (API unavailable)',
        success: true,
      })
    } else {
      await supabase.from('auto_score_logs').insert({
        action: 'error',
        details: 'API unavailable and no cached data available',
        success: false,
      })
      return new Response('API unavailable and no cache', { status: 200 })
    }
  }

  // ── 6. Find locked matches past scoring deadline ──
  const cutoff = new Date(Date.now() - SCORE_AFTER_MS).toISOString()

  const { data: matches } = await supabase
    .from('matches')
    .select('id, external_id, home_team:home_team_id(code), away_team:away_team_id(code)')
    .eq('status', 'locked')
    .not('external_id', 'is', null)
    .lt('kickoff_at', cutoff)

  if (!matches || matches.length === 0) {
    await supabase.from('auto_score_logs').insert({
      action: 'check',
      details: 'No locked matches past deadline',
      success: true,
    })
    await supabase.from('auto_score_config').update({
      last_run_at: new Date().toISOString(),
      last_run_result: 'ok_no_matches',
    }).eq('id', true)
    return new Response('No matches to score', { status: 200 })
  }

  // ── 7. Score each match ──
  let scored = 0
  let checked = 0
  let errors = 0

  for (const raw of matches as unknown as MatchRow[]) {
    const m = { ...raw, home_team: pick(raw.home_team), away_team: pick(raw.away_team) }
    const game = games.find(g => String(g.id) === String(m.external_id))

    if (!game) {
      await supabase.from('auto_score_logs').insert({
        match_id: m.id,
        external_id: m.external_id,
        action: 'error',
        details: `Game ID ${m.external_id} not found in API response`,
        success: false,
      })
      errors++
      continue
    }

    const finished = String(game.finished).toUpperCase() === 'TRUE'

    if (!finished) {
      await supabase.from('auto_score_logs').insert({
        match_id: m.id,
        external_id: m.external_id,
        action: 'check',
        details: `Not yet finished (finished=${game.finished})`,
        success: true,
      })
      checked++
      continue
    }

    const homeScore = Number(game.home_score)
    const awayScore = Number(game.away_score)

    const { error: scoreErr } = await supabase.rpc('calculate_match_points', {
      p_match_id: m.id,
      p_home_score: homeScore,
      p_away_score: awayScore,
    })

    if (scoreErr) {
      await supabase.from('auto_score_logs').insert({
        match_id: m.id,
        external_id: m.external_id,
        action: 'error',
        details: `Score failed: ${scoreErr.message}`,
        success: false,
      })
      errors++
    } else {
      const hc = m.home_team?.code ?? '?'
      const ac = m.away_team?.code ?? '?'
      await supabase.from('auto_score_logs').insert({
        match_id: m.id,
        external_id: m.external_id,
        action: 'auto_score',
        details: `${hc} ${homeScore}-${awayScore} ${ac}`,
        success: true,
      })
      scored++
    }
  }

  // ── 8. Update config ──
  await supabase.from('auto_score_config').update({
    last_run_at: new Date().toISOString(),
    last_run_result: `scored=${scored} checked=${checked} errors=${errors}`,
  }).eq('id', true)

  console.log(`Auto-score: ${scored} scored, ${checked} checked, ${errors} errors`)
  return new Response(`Scored: ${scored}, Errors: ${errors}`, { status: 200 })
}

export const config = {
  runtime: 'edge',
}
