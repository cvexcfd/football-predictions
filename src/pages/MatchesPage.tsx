import { useState, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useMatches } from '../hooks/useMatches'
import { MatchCard } from '../components/MatchCard'
import { EmptyState, SkeletonCard } from '../components/ui'
import { formatDate } from '../lib/utils'
import type { MatchWithPrediction } from '../types'

type Tab = 'today' | 'tomorrow' | 'week' | 'all'

function getMoroccoDate(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Africa/Casablanca' })
}

export default function MatchesPage() {
  const { player } = useAuth()
  const { data: matches, isLoading } = useMatches('upcoming', player?.id)
  const [tab, setTab] = useState<Tab>('today')
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set())

  const now = new Date()
  const todayStr = getMoroccoDate(now)
  const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowStr = getMoroccoDate(tomorrowDate)

  const { filteredMatches, totalCount, predictedCount, dayMatches } = useMemo((): { filteredMatches: MatchWithPrediction[]; totalCount: number; predictedCount: number; dayMatches: Record<string, MatchWithPrediction[]> } => {
    const ms = matches ?? []

    let filtered: MatchWithPrediction[] = []
    switch (tab) {
      case 'today':
        filtered = ms.filter(m => getMoroccoDate(new Date(m.kickoff_at)) === todayStr)
        break
      case 'tomorrow':
        filtered = ms.filter(m => getMoroccoDate(new Date(m.kickoff_at)) === tomorrowStr)
        break
      case 'week': {
        const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        const weekEndStr = getMoroccoDate(weekEnd)
        filtered = ms.filter(m => {
          const d = getMoroccoDate(new Date(m.kickoff_at))
          return d >= todayStr && d <= weekEndStr
        })
        break
      }
      default:
        filtered = ms
    }

    const predicted = filtered.filter(m => m.prediction).length
    const total = filtered.length

    const grouped: Record<string, MatchWithPrediction[]> = {}
    for (const m of filtered) {
      const d = getMoroccoDate(new Date(m.kickoff_at))
      if (!grouped[d]) grouped[d] = []
      grouped[d].push(m)
    }

    return { filteredMatches: filtered, totalCount: total, predictedCount: predicted, dayMatches: grouped }
  }, [matches, tab, todayStr, tomorrowStr, now])

  const toggleDay = (day: string) => {
    setCollapsedDays(prev => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="pb-20 max-w-3xl mx-auto">
        <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
          <div className="h-4 w-24 bg-border rounded mb-2 animate-shimmer" />
          <div className="h-8 w-48 bg-border rounded mb-1 animate-shimmer" />
          <div className="h-4 w-20 bg-border rounded animate-shimmer" />
        </div>
        <div className="px-4 space-y-3">
          {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'tomorrow', label: 'Tomorrow' },
    { key: 'week', label: 'This Week' },
    { key: 'all', label: 'All Upcoming' },
  ]

  const sortedDays = Object.keys(dayMatches).sort()

  if (totalCount === 0) {
    return (
      <div className="pb-20 max-w-3xl mx-auto">
        <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
          <h1 className="text-lg font-semibold opacity-90 text-text">World Cup 2026</h1>
          <p className="text-2xl font-bold mt-1 text-text">Upcoming Matches</p>
        </div>
        <div className="px-4">
          <div className="flex gap-1 mb-4 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 text-sm rounded-xl whitespace-nowrap transition-colors ${tab === t.key ? 'bg-primary text-white shadow-sm' : 'glass text-text-muted hover:border-border-light'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <EmptyState
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          title="No matches in this timeframe"
          description="Try a different filter or check back later"
        />
      </div>
    )
  }

  return (
    <div className="pb-20 max-w-3xl mx-auto">
      <div className="glass-strong rounded-2xl mx-4 mt-4 p-6 mb-6">
        <h1 className="text-lg font-semibold opacity-90 text-text">World Cup 2026</h1>
        <p className="text-2xl font-bold mt-1 text-text">Upcoming Matches</p>
        {totalCount > 0 && (
          <p className="text-sm text-text-muted mt-1">{sortedDays.length} match days</p>
        )}
      </div>

      <div className="px-4">
        {/* Tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-sm rounded-xl whitespace-nowrap transition-colors shrink-0 ${tab === t.key ? 'bg-primary text-white shadow-sm' : 'glass text-text-muted hover:border-border-light'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="glass rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-text">
                {predictedCount === totalCount
                  ? 'All predicted!'
                  : `${predictedCount} of ${totalCount} predicted`
                }
              </span>
              <span className="text-xs text-text-muted">
                {Math.round((predictedCount / totalCount) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-surface-alt rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                style={{ width: `${(predictedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Day sections */}
        {sortedDays.map(day => {
          const dayMs = dayMatches[day]
          const dayPredicted = dayMs.filter(m => m.prediction).length
          const isCollapsed = collapsedDays.has(day)

          return (
            <div key={day} className="mb-4">
              <button
                onClick={() => toggleDay(day)}
                className="w-full flex items-center justify-between px-1 py-2 group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text">{formatDate(dayMs[0].kickoff_at)}</span>
                  <span className="text-[10px] text-text-muted bg-surface-alt px-1.5 py-0.5 rounded-full">
                    {dayPredicted}/{dayMs.length}
                  </span>
                  {day === todayStr && (
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Today</span>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 text-text-muted transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {!isCollapsed && (
                <div className="space-y-3 mt-2">
                  {dayMs.map((m, i) => (
                    <MatchCard key={m.id} match={m} index={i} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
