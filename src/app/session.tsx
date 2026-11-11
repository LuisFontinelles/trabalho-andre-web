import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  authProfileFrom,
  type AuthProfile,
  type Session,
} from '@/domain/entities'
import { SESSION_EXPIRED_EVENT } from '@/data/network/httpClient'
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
 * O que o painel mostra do registro profissional. A API de sessao ainda nao
 * devolve esses dados, entao eles vem do cadastro feito nesta sessao; quem
 * entra pelo login ja passou pela conferencia.
 */
export interface ProfessionalProfile {
  /** "CRM/DF 123456". Vazio quando nao se sabe. */
  registration: string
  isVerified: boolean
}

const VERIFIED_PROFILE: ProfessionalProfile = {
  registration: 'CRM/DF 123456',
  isVerified: true,
}

interface StoredSession {
  session: Session
  profile: ProfessionalProfile
}

interface StoredSessionData {
  token: string
  user: Session['user']
  tipoPerfil?: AuthProfile
  validadoInstitucionalmente?: boolean
}

function normalizeSession(raw: StoredSessionData): Session | null {
  if (typeof raw.token !== 'string' || raw.token.trim() === '' || !raw.user) return null
  const rawProfile =
    raw.tipoPerfil ?? (raw.user.profile === 'PROFISSIONAL' ? 'PROFISSIONAL_SAUDE' : raw.user.profile)
  const tipoPerfil = authProfileFrom(rawProfile)
  return {
    token: raw.token,
    user: raw.user,
    tipoPerfil,
    validadoInstitucionalmente:
      raw.validadoInstitucionalmente ?? tipoPerfil === 'PROFISSIONAL_SAUDE',
  }
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
    const parsed = JSON.parse(raw) as
      | { session: StoredSessionData; profile?: ProfessionalProfile }
      | StoredSessionData
    if ('session' in parsed) {
      const session = normalizeSession(parsed.session)
      return session
        ? {
            session,
            profile: parsed.profile ?? {
              registration: '',
              isVerified: session.validadoInstitucionalmente,
            },
          }
        : null
    }
    const session = normalizeSession(parsed)
    return session
      ? {
          session,
          profile: {
            registration: '',
            isVerified: session.validadoInstitucionalmente,
          },
        }
      : null
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
      sessionStorage.setItem('tipoPerfil', stored.session.tipoPerfil)
      sessionStorage.setItem(
        'validadoInstitucionalmente',
        String(stored.session.validadoInstitucionalmente),
      )
    }
  } catch {
    // Sem armazenamento a sessao vale so para esta navegacao, e tudo bem.
  }
}

interface SessionStore {
  session: Session | null
  profile: ProfessionalProfile
  tipoPerfil: AuthProfile
  isAuthenticated: boolean
  canAccessOpportunities: boolean
  sessionExpired: boolean
  signIn: (session: Session, profile?: ProfessionalProfile) => void
  signOut: () => void
}

const SessionContext = createContext<SessionStore | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredSession | null>(readStoredSession)
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    function handleSessionExpired() {
      writeStoredSession(null)
      setStored(null)
      setSessionExpired(true)
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [])

  const value = useMemo<SessionStore>(
    () => ({
      session: stored?.session ?? null,
      profile: stored?.profile ?? VERIFIED_PROFILE,
      tipoPerfil: stored?.session.tipoPerfil ?? 'DESCONHECIDO',
      isAuthenticated: stored !== null,
      canAccessOpportunities:
        Boolean(stored?.session.token.trim()) &&
        stored?.session.tipoPerfil === 'PROFISSIONAL_SAUDE',
      sessionExpired,
      signIn: (session: Session, profile?: ProfessionalProfile) => {
        const effectiveProfile = profile ?? {
          registration: '',
          isVerified: session.validadoInstitucionalmente,
        }
        const next = {
          session: {
            ...session,
            validadoInstitucionalmente: effectiveProfile.isVerified,
          },
          profile: effectiveProfile,
        }
        writeStoredSession(next)
        setStored(next)
        setSessionExpired(false)
      },
      signOut: () => {
        writeStoredSession(null)
        setStored(null)
        setSessionExpired(false)
      },
    }),
    [stored, sessionExpired],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionStore {
  const value = useContext(SessionContext)
  if (value === null) throw new Error('useSession precisa de um SessionProvider')
  return value
}
