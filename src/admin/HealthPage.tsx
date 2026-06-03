import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Button, LoadingSpinner } from '../components/ui'
import { useToast } from '../components/Toast'

export default function AdminHealthPage() {
  const [checkResults, setCheckResults] = useState<Array<{ label: string; value: string; status: 'ok' | 'warn' | 'error' }>>([])
  const [running, setRunning] = useState(false)
  const { toast } = useToast()

  const runChecks = async () => {
    setRunning(true)
    const results: Array<{ label: string; value: string; status: 'ok' | 'warn' | 'error' }> = []

    try {
      // 1. Count players
      const { data: players, error: e1 } = await supabase.from('players').select('id', { count: 'exact' })
      if (e1) throw e1
      results.push({ label: 'Total players', value: players?.length?.toString() ?? '0', status: 'ok' })

      // 2. Count matches
      const { data: matches, error: e2 } = await supabase.from('matches').select('id', { count: 'exact' })
      if (e2) throw e2
      results.push({ label: 'Total matches', value: matches?.length?.toString() ?? '0', status: 'ok' })

      // 3. Count predictions
      const { data: preds, error: e3 } = await supabase.from('predictions').select('id', { count: 'exact' })
      if (e3) throw e3
      results.push({ label: 'Total predictions', value: preds?.length?.toString() ?? '0', status: 'ok' })

      // 4. Check that no match has same home and away team
      const { data: sameTeam, error: e7 } = await supabase
        .from('matches')
        .select('id')
        .eq('home_team_id', 'away_team_id')
      if (e7) throw e7
      if (sameTeam?.length ?? 0 > 0) {
        results.push({ label: 'Matches with same home/away team', value: `${sameTeam.length}`, status: 'error' })
      } else {
        results.push({ label: 'Home/Away team equality', value: 'OK', status: 'ok' })
      }

      // 5. Check that no upcoming match is in the past
      const { data: pastUpcoming, error: e8 } = await supabase
        .from('matches')
        .select('id')
        .eq('status', 'upcoming')
        .lt('kickoff_at', new Date().toISOString())
      if (e8) throw e8
      if ((pastUpcoming?.length ?? 0) > 0) {
        results.push({ label: 'Upcoming matches in past', value: `${pastUpcoming.length}`, status: 'error' })
      } else {
        results.push({ label: 'Upcoming match timing', value: 'OK', status: 'ok' })
      }

      // 6. Check that finished matches have scores
      const { data: nullHome, error: e10 } = await supabase
        .from('matches')
        .select('id')
        .eq('status', 'finished')
        .is('home_score', null)
      const { data: nullAway, error: e11 } = await supabase
        .from('matches')
        .select('id')
        .eq('status', 'finished')
        .is('away_score', null)
      if (e10) throw e10
      if (e11) throw e11
      const missingScore = (nullHome?.length ?? 0) + (nullAway?.length ?? 0)
      if (missingScore > 0) {
        results.push({ label: 'Finished matches missing score', value: `${missingScore}`, status: 'error' })
      } else {
        results.push({ label: 'Finished match scores', value: 'OK', status: 'ok' })
      }

      setCheckResults(results)
      toast('Health check completed', 'success')
    } catch (err: any) {
      console.error(err)
      toast('Health check failed', 'error')
      setCheckResults([{ label: 'Error', value: err.message, status: 'error' }])
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="pb-20 max-w-3xl mx-auto">
      <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
        <h1 className="text-lg font-semibold text-text">Admin</h1>
        <p className="text-2xl font-bold mt-1 text-text">Health Check</p>
      </div>

      <div className="px-4">
        <div className="mb-4">
          <Button variant="primary" onClick={runChecks} disabled={running}>
            {running ? 'Running...' : 'Run Health Check'}
          </Button>
        </div>

        {checkResults.length > 0 && (
          <div className="divide-y divide-border/50">
            {checkResults.map((r, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text">{r.label}</span>
                  <span className={`text-sm font-medium ${r.status === 'ok' ? 'text-success' : r.status === 'warn' ? 'text-warning' : 'text-danger'}`}>
                    {r.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
