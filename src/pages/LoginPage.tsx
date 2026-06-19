import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui'
import { APP_NAME } from '../lib/constants'

export default function LoginPage() {
  const { login, player } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [offsetY, setOffsetY] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setOffsetY(window.scrollY * 0.3)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
    <div ref={ref} className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background image (static — was 5-10MB video, now ~200KB image) */}
      <div className="absolute inset-0 z-0">
        <div
          className="w-full h-full bg-cover bg-center scale-110"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1920&q=80)',
            transform: `translateY(${offsetY}px) scale(1.1)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/95 via-surface/80 to-surface/95" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-surface/50" />
        {/* Pitch pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(255,255,255,0.3) 60px, rgba(255,255,255,0.3) 61px), repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(255,255,255,0.3) 60px, rgba(255,255,255,0.3) 61px)'
          }}
        />
      </div>

      {/* Content */}
      <div className="w-full max-w-sm relative z-10 animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-surface-alt glass flex items-center justify-center text-4xl shadow-lg animate-pulse-glow">
            ⚽
          </div>
          <h1 className="text-4xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              {APP_NAME}
            </span>
          </h1>
          <p className="text-text-muted text-sm mt-2 font-medium">World Cup 2026 · Prediction Game</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-strong rounded-2xl p-6 space-y-4 shadow-2xl">
          <div>
            <input
              type="text"
              placeholder="Enter access code"
              className="w-full px-4 py-3.5 text-center text-lg font-mono tracking-[0.3em] uppercase bg-surface border border-border/50 focus:border-primary rounded-xl text-text outline-none transition-all duration-200 placeholder:text-text-dim"
              value={code}
              onChange={e => setCode(e.target.value)}
              maxLength={12}
              autoFocus
            />
            <p className="text-[10px] text-text-dim text-center mt-1.5">Enter the code your admin gave you</p>
          </div>

          {error && (
            <div className="text-sm text-danger text-center bg-red-500/10 rounded-xl px-4 py-2.5 border border-red-500/20">
              {error}
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={loading || code.length < 3}
            type="submit"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Checking...
              </span>
            ) : 'Play'}
          </Button>

          <p className="text-center text-[10px] text-text-dim">
            ⚡ Predict scores · Earn points · Win badges
          </p>
        </form>
      </div>
    </div>
  )
}
