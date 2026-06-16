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

  // ── 2. Check backoff from auto_score_config ──
  const { data: config } = await supabase
    .from('auto_score_config')
    .select('last_run_result')
    .eq('id', true)
    .single()

  if (config?.last_run_result?.startsWith('backoff_')) {
    const ts = config.last_run_result.slice(8)
    const until = new Date(ts).getTime()
    if (until > Date.now()) {
      await supabase.from('auto_score_logs').insert({
        action: 'info',
        details: `Skipped — in backoff until ${ts}`,
        success: true,
      })
      return new Response(`Backoff until ${ts}`, { status: 200 })
    }
  }

  // ── 3. Fetch games from API ──
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  let httpRes: Response
  try {
    httpRes = await fetch('https://worldcup26.ir/get/games', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
  } catch (err) {
    clearTimeout(timer)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Fetch error:', msg)

    const until = new Date(Date.now() + BACKOFF_AFTER_ERROR_MS).toISOString()
    await Promise.all([
      supabase.from('auto_score_logs').insert({
        action: 'error',
        details: `HTTP request failed: ${msg}`,
        success: false,
      }),
      supabase.from('auto_score_config').update({
        last_run_at: new Date().toISOString(),
        last_run_result: `backoff_${until}`,
      }).eq('id', true),
    ])

    return new Response(`API error: ${msg}`, { status: 200 })
  }
  clearTimeout(timer)

  // ── 4. Handle HTTP errors ──
  if (httpRes.status !== 200) {
    const is429 = httpRes.status === 429
    const backoffMs = is429 ? BACKOFF_AFTER_429_MS : BACKOFF_AFTER_ERROR_MS
    const until = new Date(Date.now() + backoffMs).toISOString()

    await Promise.all([
      supabase.from('auto_score_logs').insert({
        action: 'error',
        details: `HTTP ${httpRes.status} from worldcup26.ir`,
        success: false,
      }),
      supabase.from('auto_score_config').update({
        last_run_at: new Date().toISOString(),
        last_run_result: `backoff_${until}`,
      }).eq('id', true),
    ])

    console.error(`HTTP ${httpRes.status} — backoff until ${until}`)
    return new Response(`HTTP ${httpRes.status}`, { status: 200 })
  }

  // ── 5. Parse JSON ──
  let body: { games?: GameJson[] }
  try {
    body = await httpRes.json()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await supabase.from('auto_score_logs').insert({
      action: 'error',
      details: `JSON parse failed: ${msg}`,
      success: false,
    })
    return new Response(`JSON error: ${msg}`, { status: 200 })
  }

  if (!body?.games || !Array.isArray(body.games)) {
    await supabase.from('auto_score_logs').insert({
      action: 'error',
      details: 'API response missing "games" array',
      success: false,
    })
    return new Response('No games in response', { status: 200 })
  }

  const games = body.games

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
