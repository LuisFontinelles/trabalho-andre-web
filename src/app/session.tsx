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

interface SessionStore {
  session: Session | null
  isAuthenticated: boolean
  signIn: (session: Session) => void
  signOut: () => void
}

const SessionContext = createContext<SessionStore | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)

  const value = useMemo<SessionStore>(
    () => ({
      session,
      isAuthenticated: session !== null,
      signIn: setSession,
      signOut: () => setSession(null),
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
