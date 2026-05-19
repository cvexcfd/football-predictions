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
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚽</div>
          <h1 className="text-2xl font-bold text-text">{APP_NAME}</h1>
          <p className="text-text-muted text-sm mt-1">Enter your access code to play</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-4">
          <div>
            <input
              type="text"
              placeholder="Access code (e.g. ZIKO42)"
              className="w-full px-4 py-3 text-center text-lg font-mono tracking-widest uppercase border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              value={code}
              onChange={e => setCode(e.target.value)}
              maxLength={10}
              autoFocus
            />
          </div>

          {error && (
            <div className="text-sm text-danger text-center bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full"
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
