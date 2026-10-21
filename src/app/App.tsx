import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/app/AppShell'
import { useSession } from '@/app/session'
import { ApplicationsPage } from '@/presentation/Applications/ApplicationsPage'
import { DashboardPage } from '@/presentation/Dashboard/DashboardPage'
import { LoginPage } from '@/presentation/Login/LoginPage'
import { OpportunitiesPage } from '@/presentation/Opportunities/OpportunitiesPage'
import { SignUpPage } from '@/presentation/SignUp/SignUpPage'
import { VerificationPage } from '@/presentation/Verification/VerificationPage'
import type { ReactNode } from 'react'
import '@/app/layout.css'

function RequireSession({ children }: { children: ReactNode }) {
  const session = useSession()
  if (!session.isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/cadastro" element={<SignUpPage />} />
      <Route path="/verificacao" element={<VerificationPage />} />
      <Route
        element={
          <RequireSession>
            <AppShell />
          </RequireSession>
        }
      >
        <Route path="/painel" element={<DashboardPage />} />
        <Route path="/oportunidades" element={<OpportunitiesPage />} />
        <Route path="/candidaturas" element={<ApplicationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
