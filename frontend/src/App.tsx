import { Routes, Route, Navigate } from 'react-router'
import { getToken } from '@/lib/api'
import Login from '@/pages/Login'
import Reader from '@/pages/Reader'
import type { ReactNode } from 'react'

function RequireAuth({ children }: { children: ReactNode }) {
  if (!getToken()) return <Navigate to="/auth/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth/login" element={<Login />} />
      <Route
        path="*"
        element={
          <RequireAuth>
            <Reader />
          </RequireAuth>
        }
      />
    </Routes>
  )
}
