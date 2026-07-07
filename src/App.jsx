import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { syncAllFromCloud } from './lib/db'
import { isSupabaseReady } from './lib/supabase'

const AUTH_KEY = 'ibrahim_ai_os_auth'
const PW_KEY = 'ibrahim_ai_os_pw'

export function useAuth() {
  const [authed, setAuthed] = useState(() => {
    const session = sessionStorage.getItem(AUTH_KEY)
    return session === 'true'
  })

  const login = (pw) => {
    const stored = localStorage.getItem(PW_KEY)
    if (!stored) {
      // First time — set the password
      localStorage.setItem(PW_KEY, pw)
      sessionStorage.setItem(AUTH_KEY, 'true')
      setAuthed(true)
      return { ok: true, firstTime: true }
    }
    if (pw === stored) {
      sessionStorage.setItem(AUTH_KEY, 'true')
      setAuthed(true)
      return { ok: true }
    }
    return { ok: false }
  }

  const logout = () => {
    sessionStorage.removeItem(AUTH_KEY)
    setAuthed(false)
  }

  const isFirstTime = !localStorage.getItem(PW_KEY)

  return { authed, login, logout, isFirstTime }
}

export default function App() {
  const { authed, login, logout, isFirstTime } = useAuth()

  // On login, pull all cloud data into localStorage if Supabase is configured
  useEffect(() => {
    if (authed && isSupabaseReady()) {
      syncAllFromCloud().catch(() => {})
    }
  }, [authed])

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            authed
              ? <Navigate to="/" replace />
              : <Login onLogin={login} isFirstTime={isFirstTime} />
          }
        />
        <Route
          path="/*"
          element={
            authed
              ? <Dashboard onLogout={logout} />
              : <Navigate to="/login" replace />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
