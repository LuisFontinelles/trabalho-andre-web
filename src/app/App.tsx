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

/** Quem ja entrou nao volta para login e cadastro: vai direto para o painel. */
function GuestOnly({ children }: { children: ReactNode }) {
  const session = useSession()
  if (session.isAuthenticated) return <Navigate to="/oportunidades" replace />
  return <>{children}</>
}

export function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route
        path="/cadastro"
        element={
          <GuestOnly>
            <SignUpPage />
          </GuestOnly>
        }
      />
      <Route
        path="/verificacao"
        element={
          <GuestOnly>
            <VerificationPage />
          </GuestOnly>
        }
      />
      <Route
        element={
          <RequireSession>
            <AppShell />
          </RequireSession>
        }
      >
        <Route path="/oportunidades" element={<MyOpportunitiesPage />} />
        <Route path="/oportunidades/nova" element={<NewOpportunityPage />} />
        <Route path="/oportunidades/:id/editar" element={<NewOpportunityPage />} />
        <Route path="/solicitacoes" element={<RequestsPage />} />
        <Route path="/solicitacoes/:id" element={<RequestDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
