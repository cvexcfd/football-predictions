import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute, AdminRoute } from './components/RouteGuards'
import { Navbar } from './components/Navbar'
import { BottomNav } from './components/BottomNav'
import { ToastProvider } from './components/Toast'

import LoginPage from './pages/LoginPage'
import MatchesPage from './pages/MatchesPage'
import LeaderboardPage from './pages/LeaderboardPage'
import ResultsPage from './pages/ResultsPage'
import MyStatsPage from './pages/MyStatsPage'
import BadgesPage from './pages/BadgesPage'
import PlayerPage from './pages/PlayerPage'
import ComparePage from './pages/ComparePage'

import AdminDashboard from './admin/DashboardPage'
import AdminLeaguesPage from './admin/LeaguesPage'
import AdminMatchesPage from './admin/MatchesPage'
import AdminBadgesPage from './admin/BadgesPage'
import AdminPlayersPage from './admin/PlayersPage'
import AdminAuditPage from './admin/AuditPage'
import AdminHealthPage from './admin/HealthPage'
import AdminImportPage from './admin/ImportPage'
import AdminBracketPage from './admin/BracketPage'
import AdminMonitoringPage from './admin/MonitoringPage'

const queryClient = new QueryClient()

function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <BottomNav />
    </>
  )
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />

            <Route path="/matches" element={<ProtectedRoute><PlayerLayout><MatchesPage /></PlayerLayout></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><PlayerLayout><LeaderboardPage /></PlayerLayout></ProtectedRoute>} />
            <Route path="/results" element={<ProtectedRoute><PlayerLayout><ResultsPage /></PlayerLayout></ProtectedRoute>} />
            <Route path="/my-stats" element={<ProtectedRoute><PlayerLayout><MyStatsPage /></PlayerLayout></ProtectedRoute>} />
            <Route path="/badges" element={<ProtectedRoute><PlayerLayout><BadgesPage /></PlayerLayout></ProtectedRoute>} />
            <Route path="/player/:playerId" element={<ProtectedRoute><PlayerLayout><PlayerPage /></PlayerLayout></ProtectedRoute>} />
            <Route path="/compare" element={<ProtectedRoute><PlayerLayout><ComparePage /></PlayerLayout></ProtectedRoute>} />

            <Route path="/admin" element={<AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>} />
            <Route path="/admin/leagues" element={<AdminRoute><AdminLayout><AdminLeaguesPage /></AdminLayout></AdminRoute>} />
            <Route path="/admin/matches" element={<AdminRoute><AdminLayout><AdminMatchesPage /></AdminLayout></AdminRoute>} />
            <Route path="/admin/badges" element={<AdminRoute><AdminLayout><AdminBadgesPage /></AdminLayout></AdminRoute>} />
            <Route path="/admin/players" element={<AdminRoute><AdminLayout><AdminPlayersPage /></AdminLayout></AdminRoute>} />
            <Route path="/admin/import" element={<AdminRoute><AdminLayout><AdminImportPage /></AdminLayout></AdminRoute>} />
            <Route path="/admin/audit" element={<AdminRoute><AdminLayout><AdminAuditPage /></AdminLayout></AdminRoute>} />
            <Route path="/admin/bracket" element={<AdminRoute><AdminLayout><AdminBracketPage /></AdminLayout></AdminRoute>} />
            <Route path="/admin/monitoring" element={<AdminRoute><AdminLayout><AdminMonitoringPage /></AdminLayout></AdminRoute>} />
            <Route path="/admin/health" element={<AdminRoute><AdminLayout><AdminHealthPage /></AdminLayout></AdminRoute>} />
          </Routes>
        </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
