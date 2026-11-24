import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authProfileFrom, type Session } from '@/domain/entities'
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
 * O que o painel mostra do registro profissional. Vem do GET /user/me; quando
 * a API ainda nao traz o registro, vale o que foi digitado no cadastro neste
 * navegador.
 */
export interface ProfessionalProfile {
  /** "CRM/DF 123456". Vazio quando nao se sabe. */
  registration: string
  isVerified: boolean
}

/** Perfil padrao quando nada foi informado: verificado, sem registro conhecido. */
const VERIFIED_PROFILE: ProfessionalProfile = {
  registration: '',
  isVerified: true,
}

const REGISTRATIONS_KEY = 'carebridge.registrations'

/**
 * O login da API real nao devolve o registro profissional. Guardamos o que a
 * pessoa digitou no cadastro, por e-mail, para o painel poder mostra-lo nas
 * proximas entradas neste navegador.
 */
export function rememberRegistration(email: string, registration: string): void {
  try {
    const all = JSON.parse(localStorage.getItem(REGISTRATIONS_KEY) ?? '{}') as Record<string, string>
    all[email] = registration
    localStorage.setItem(REGISTRATIONS_KEY, JSON.stringify(all))
  } catch {
    // Sem armazenamento o painel so nao mostra o numero do registro.
  }
}

export function rememberedRegistration(email: string): string {
  try {
    const all = JSON.parse(localStorage.getItem(REGISTRATIONS_KEY) ?? '{}') as Record<string, string>
    return all[email] ?? ''
  } catch {
    return ''
  }
}

interface StoredSession {
  session: Session
  profile: ProfessionalProfile
}

/**
 * A sessao sobrevive ao recarregar a pagina. Sem isso, apertar F5 ou abrir
 * uma rota direta joga a pessoa de volta no login, o que atrapalha quem esta
 * avaliando o sistema. Fica em sessionStorage: some ao fechar a aba e nao
 * vaza para outra. Leitura e escrita vao em try/catch porque o acesso falha
 * em janela anonima ou com dados de site bloqueados.
 */
function readStoredSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as StoredSession | Session
    // Formato antigo: so a sessao, sem o perfil profissional.
    if ('token' in parsed) {
      return {
        session: {
          ...parsed,
          authProfile: authProfileFrom(
            parsed.authProfile ?? (parsed.user.profile === 'PROFISSIONAL' ? 'PROFISSIONAL_SAUDE' : parsed.user.profile),
          ),
        },
        profile: VERIFIED_PROFILE,
      }
    }
    return {
      ...parsed,
      session: {
        ...parsed.session,
        authProfile: authProfileFrom(
          parsed.session.authProfile ??
            (parsed.session.user.profile === 'PROFISSIONAL'
              ? 'PROFISSIONAL_SAUDE'
              : parsed.session.user.profile),
        ),
      },
    }
  } catch {
    return null
  }
}

function writeStoredSession(stored: StoredSession | null): void {
  try {
    if (stored === null) {
      sessionStorage.removeItem(SESSION_KEY)
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('tipoPerfil')
      sessionStorage.removeItem('validadoInstitucionalmente')
    } else {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(stored))
      sessionStorage.setItem('token', stored.session.token)
      sessionStorage.setItem('tipoPerfil', stored.session.authProfile)
      sessionStorage.setItem('validadoInstitucionalmente', String(stored.session.isVerified))
    }
  } catch {
    // Sem armazenamento a sessao vale so para esta navegacao, e tudo bem.
  }
}

interface SessionStore {
  session: Session | null
  profile: ProfessionalProfile
  isAuthenticated: boolean
  canAccessOpportunities: boolean
  canAccessAdmin: boolean
  signIn: (session: Session, profile?: ProfessionalProfile) => void
  signOut: () => void
}

const SessionContext = createContext<SessionStore | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const { tokens } = useDependencies()
  const [stored, setStored] = useState<StoredSession | null>(() => {
    const restored = readStoredSession()
    // O token vai no cabecalho das rotas autenticadas desde a primeira tela.
    tokens.set(restored?.session.token ?? null)
    return restored
  })

  // 401 numa rota autenticada: a sessao venceu e a pessoa entra de novo.
  useEffect(
    () =>
      tokens.onExpired(() => {
        writeStoredSession(null)
        setStored(null)
      }),
    [tokens],
  )

  const value = useMemo<SessionStore>(
    () => ({
      session: stored?.session ?? null,
      profile: stored?.profile ?? VERIFIED_PROFILE,
      isAuthenticated: stored !== null,
      canAccessOpportunities:
        Boolean(stored?.session.token.trim()) && stored?.session.authProfile === 'PROFISSIONAL_SAUDE',
      canAccessAdmin:
        Boolean(stored?.session.token.trim()) && stored?.session.authProfile === 'ADMIN',
      signIn: (session: Session, profile: ProfessionalProfile = VERIFIED_PROFILE) => {
        const next = { session, profile }
        tokens.set(session.token)
        writeStoredSession(next)
        setStored(next)
      },
      signOut: () => {
        tokens.set(null)
        writeStoredSession(null)
        setStored(null)
      },
    }),
    [stored, tokens],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionStore {
  const value = useContext(SessionContext)
  if (value === null) throw new Error('useSession precisa de um SessionProvider')
  return value
}
