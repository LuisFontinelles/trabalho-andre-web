import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@/domain/entities'
import { createDependencies, type Dependencies } from '@/app/dependencies'

const DependenciesContext = createContext<Dependencies | null>(null)

export function DependenciesProvider({
  value,
  children,
}: {
  value?: Dependencies
  children: ReactNode
}) {
  const dependencies = useMemo(() => value ?? createDependencies(), [value])
  return (
    <DependenciesContext.Provider value={dependencies}>{children}</DependenciesContext.Provider>
  )
}

export function useDependencies(): Dependencies {
  const value = useContext(DependenciesContext)
  if (value === null) throw new Error('useDependencies precisa de um DependenciesProvider')
  return value
}

const SESSION_KEY = 'carebridge.session'

/**
 * A sessao sobrevive ao recarregar a pagina. Sem isso, apertar F5 ou abrir
 * uma rota direta joga a pessoa de volta no login, o que atrapalha quem esta
 * avaliando o sistema. Fica em sessionStorage: some ao fechar a aba e nao
 * vaza para outra. Leitura e escrita vao em try/catch porque o acesso falha
 * em janela anonima ou com dados de site bloqueados.
 */
function readStoredSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw === null ? null : (JSON.parse(raw) as Session)
  } catch {
    return null
  }
}

function writeStoredSession(session: Session | null): void {
  try {
    if (session === null) sessionStorage.removeItem(SESSION_KEY)
    else sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Sem armazenamento a sessao vale so para esta navegacao, e tudo bem.
  }
}

interface SessionStore {
  session: Session | null
  isAuthenticated: boolean
  signIn: (session: Session) => void
  signOut: () => void
}

const SessionContext = createContext<SessionStore | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readStoredSession)

  const value = useMemo<SessionStore>(
    () => ({
      session,
      isAuthenticated: session !== null,
      signIn: (next: Session) => {
        writeStoredSession(next)
        setSession(next)
      },
      signOut: () => {
        writeStoredSession(null)
        setSession(null)
      },
    }),
    [session],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionStore {
  const value = useContext(SessionContext)
  if (value === null) throw new Error('useSession precisa de um SessionProvider')
  return value
}
