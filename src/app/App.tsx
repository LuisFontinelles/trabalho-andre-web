import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/app/AppShell'
import { useSession } from '@/app/session'
import { LoginPage } from '@/presentation/Login/LoginPage'
import { MyOpportunitiesPage } from '@/presentation/MyOpportunities/MyOpportunitiesPage'
import { NewOpportunityPage } from '@/presentation/NewOpportunity/NewOpportunityPage'
import { RequestDetailPage } from '@/presentation/Requests/RequestDetailPage'
import { RequestsPage } from '@/presentation/Requests/RequestsPage'
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
        <Route path="/oportunidades" element={<MyOpportunitiesPage />} />
        <Route path="/oportunidades/nova" element={<NewOpportunityPage />} />
        <Route path="/solicitacoes" element={<RequestsPage />} />
        <Route path="/solicitacoes/:id" element={<RequestDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
