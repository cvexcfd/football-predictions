import { useAuth } from '../hooks/useAuth'
import { Navigate } from 'react-router-dom'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { player, isLoading } = useAuth()
  if (isLoading) return null
  if (!player) return <Navigate to="/" replace />
  return <>{children}</>
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { player, isAdmin, isLoading } = useAuth()
  if (isLoading) return null
  if (!player) return <Navigate to="/" replace />
  if (!isAdmin) return <Navigate to="/matches" replace />
  return <>{children}</>
}
