// Vercel edge function — refresh cached API responses in auto_score_logs
// Runs every 10 minutes via vercel.json cron
// Stores the full API games JSON so other functions can fall back to it

import { createClient } from '@supabase/supabase-js'

const API_URL = 'https://worldcup26.ir/get/games'
const API_TIMEOUT_MS = 20000

export default async function handler() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars')
    return new Response('Missing env vars', { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Try to fetch with retries (same pattern as auto-score)
  const maxAttempts = 3
  let lastError: string | null = null
  let httpRes: Response | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
    try {
      httpRes = await fetch(API_URL, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
      clearTimeout(timer)
      if (httpRes.status === 200) break
      lastError = `HTTP ${httpRes.status}`
      console.error(`refresh-cache attempt ${attempt + 1}: ${lastError}`)
      if (attempt < maxAttempts - 1) {
        await new Promise(res => setTimeout(res, 5000 * Math.pow(2, attempt)))
      }
    } catch (err) {
      clearTimeout(timer)
      lastError = err instanceof Error ? err.message : 'Unknown error'
      console.error(`refresh-cache attempt ${attempt + 1} failed: ${lastError}`)
      if (attempt < maxAttempts - 1) {
        await new Promise(res => setTimeout(res, 5000 * Math.pow(2, attempt)))
      }
    }
  }

  if (!httpRes || httpRes.status !== 200) {
    console.error(`refresh-cache: all attempts failed — ${lastError}`)
    return new Response(`Failed after ${maxAttempts} attempts`, { status: 200 })
  }

  // Parse JSON
  let body: { games?: unknown }
  try {
    body = await httpRes.json()
  } catch {
    return new Response('JSON parse failed', { status: 200 })
  }

  if (!body?.games || !Array.isArray(body.games)) {
    return new Response('No games array', { status: 200 })
  }

  // Store the full games array as a cached_data log entry
  const details = JSON.stringify(body.games)
  if (details.length > 500000) {
    console.error('Games payload too large to cache')
    return new Response('Payload too large', { status: 200 })
  }

  await supabase.from('auto_score_logs').insert({
    match_id: null,
    external_id: null,
    action: 'cached_data',
    details: details,
    success: true,
  })

  // Also clear any backoff in auto_score_config so the PL/pgSQL cron isn't blocked
  await supabase
    .from('auto_score_config')
    .update({
      last_run_result: 'ok',
      last_run_at: new Date().toISOString(),
    })
    .eq('id', true)

  console.log('refresh-cache: stored successfully')
  return new Response('Cached', { status: 200 })
}

export const config = {
  runtime: 'edge',
}
