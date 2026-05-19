// Vercel serverless function — lock matches that have kicked off
// Called every minute via vercel.json cron

import { createClient } from '@supabase/supabase-js'

export default async function handler() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return new Response('Missing env vars', { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase.rpc('auto_lock_matches')

  if (error) {
    console.error('Auto-lock error:', error)
    return new Response(`Error: ${error.message}`, { status: 500 })
  }

  return new Response(`Locked ${data ?? 0} matches`, { status: 200 })
}

export const config = {
  runtime: 'edge',
}
