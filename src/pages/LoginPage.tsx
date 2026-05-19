import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui'
import { APP_NAME } from '../lib/constants'

export default function LoginPage() {
  const { login, player } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (player) {
    window.location.href = '/matches'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(code.toUpperCase().trim())
    setLoading(false)
    if (result.error) {
      setError(result.error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-surface to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 drop-shadow-lg">⚽</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {APP_NAME}
          </h1>
          <p className="text-text-muted text-sm mt-2">World Cup 2026 Predictions</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-border/50 p-6 space-y-4">
          <div>
            <input
              type="text"
              placeholder="Access code"
              className="w-full px-4 py-3.5 text-center text-lg font-mono tracking-[0.3em] uppercase border-2 border-border/50 focus:border-primary rounded-xl outline-none transition-colors"
              value={code}
              onChange={e => setCode(e.target.value)}
              maxLength={10}
              autoFocus
            />
            <p className="text-[10px] text-text-muted text-center mt-1.5">Enter the code your admin gave you</p>
          </div>

          {error && (
            <div className="text-sm text-danger text-center bg-red-50/80 rounded-xl px-4 py-2.5 border border-red-100">{error}</div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full rounded-xl shadow-lg shadow-primary/20"
            disabled={loading || code.length < 3}
            type="submit"
          >
            {loading ? 'Checking...' : 'Play'}
          </Button>
        </form>
      </div>
    </div>
  )
}
