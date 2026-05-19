import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Player } from '../types'

interface AuthContextValue {
  player: Player | null
  isAdmin: boolean
  isLoading: boolean
  login: (code: string) => Promise<{ error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = sessionStorage.getItem('player')
    if (stored) {
      try {
        setPlayer(JSON.parse(stored))
      } catch { /* ignore */ }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (code: string) => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('access_code', code)
      .single()

    if (error || !data) {
      return { error: 'Invalid access code' }
    }

    setPlayer(data as Player)
    sessionStorage.setItem('player', JSON.stringify(data))
    return {}
  }, [])

  const logout = useCallback(async () => {
    setPlayer(null)
    sessionStorage.removeItem('player')
  }, [])

  return (
    <AuthContext.Provider value={{ player, isAdmin: player?.is_admin ?? false, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
