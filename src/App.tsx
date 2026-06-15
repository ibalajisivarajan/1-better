import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { TodayPage } from './pages/TodayPage'
import { JourneyPage } from './pages/JourneyPage'
import { SettingsPage } from './pages/SettingsPage'

function LoadingSpinner() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#F2ECE0' }}
    >
      <div
        className="w-8 h-8 rounded-full border-2 animate-spin"
        style={{
          borderColor: '#2A251D',
          borderTopColor: 'transparent',
        }}
      />
    </div>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? <Navigate to="/today" replace /> : <Navigate to="/login" replace />
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/today"
        element={
          user ? <TodayPage user={user} /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/journey"
        element={
          user ? <JourneyPage user={user} /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/settings"
        element={
          user ? <SettingsPage user={user} /> : <Navigate to="/login" replace />
        }
      />
      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <AppRoutes />
      </Suspense>
    </BrowserRouter>
  )
}
