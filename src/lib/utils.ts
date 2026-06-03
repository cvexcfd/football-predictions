export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function getResultIcon(predResult: string | undefined, predHome: number, actualHome: number | null, actualAway: number | null): 'exact' | 'result' | 'wrong' | null {
  if (actualHome === null || actualAway === null) return null
  if (predHome === actualHome && predResult === 'H' && actualHome > actualAway) return 'exact'
  if (predHome === actualHome && predResult === 'A' && actualHome < actualAway) return 'exact'
  if (predHome === actualHome && predResult === 'D' && actualHome === actualAway) return 'exact'
  const actualResult = actualHome > actualAway ? 'H' : actualHome < actualAway ? 'A' : 'D'
  if (predResult === actualResult) return 'result'
  return 'wrong'
}

export function formatDateTime(utc: string): string {
  return new Date(utc).toLocaleDateString('en-US', { timeZone: 'Africa/Casablanca', weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatDate(utc: string): string {
  return new Date(utc).toLocaleDateString('en-US', { timeZone: 'Africa/Casablanca', weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatTime(utc: string): string {
  return new Date(utc).toLocaleTimeString('en-US', { timeZone: 'Africa/Casablanca', hour: '2-digit', minute: '2-digit' })
}

export function isMatchUpcoming(kickoffAt: string): boolean {
  return new Date(kickoffAt).getTime() > Date.now()
}

export function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function groupBy<T>(items: T[], key: keyof T | ((item: T) => string)): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const k = typeof key === 'function' ? key(item) : String(item[key])
    ;(acc[k] ??= []).push(item)
    return acc
  }, {} as Record<string, T[]>)
}
