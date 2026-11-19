import { createHttpClient } from '@/data/network/httpClient'
import { BASE_URL, createMockFetch } from '@/data/network/mockBackend'
import { createCareBridgeAuthRepository } from '@/data/carebridgeApi'
import { createAuthRepository } from '@/data/repositories'
import { createProfessionalRepository } from '@/data/professionalRepository'
import {
  makeLoadCatalog,
  makeLogin,
  makeRequestPasswordReset,
  makeResendCode,
  makeSignUp,
  makeVerifyCode,
} from '@/domain/useCases'

/**
 * Endereco da API real. Vazio = tudo no servidor simulado. Em
 * desenvolvimento use `/api`, que o Vite repassa para o Render (a API ainda
 * nao libera CORS para o navegador chamar direto).
 */
const API_URL: string = import.meta.env.VITE_API_URL ?? ''

/**
 * Guarda o token da sessao para o cliente HTTP mandar `Authorization:
 * Bearer` nas rotas autenticadas, e avisa quem estiver ouvindo quando uma
 * delas responde 401 (sessao vencida).
 */
export interface TokenStore {
  get(): string | null
  set(token: string | null): void
  expire(): void
  onExpired(listener: () => void): () => void
}

export function createTokenStore(): TokenStore {
  let token: string | null = null
  const listeners = new Set<() => void>()
  return {
    get: () => token,
    set: (next) => {
      token = next
    },
    expire: () => {
      token = null
      for (const listener of listeners) listener()
    },
    onExpired: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/** Raiz de composicao. Equivale ao AppDependencies do aplicativo iOS. */
export function createDependencies(
  fetchImpl: typeof fetch = createMockFetch(),
  apiUrl: string = API_URL,
  apiFetch: typeof fetch = (...args) => fetch(...args),
  tokens: TokenStore = createTokenStore(),
) {
  const options = { getToken: tokens.get, onUnauthorized: tokens.expire }
  const client = createHttpClient(BASE_URL, fetchImpl, options)
  const mockAuthRepository = createAuthRepository(client)
  // Na API real ja existem login e cadastro; o resto segue no simulado.
  const authRepository =
    apiUrl.trim() === ''
      ? mockAuthRepository
      : createCareBridgeAuthRepository(
          createAuthRepository(createHttpClient(apiUrl, apiFetch, options)),
          mockAuthRepository,
        )
  const professionalRepository = createProfessionalRepository(client)

  return {
    tokens,
    authRepository,
    professionalRepository,
    login: makeLogin(authRepository),
    signUp: makeSignUp(authRepository),
    verifyCode: makeVerifyCode(authRepository),
    resendCode: makeResendCode(authRepository),
    requestPasswordReset: makeRequestPasswordReset(authRepository),
    loadCatalog: makeLoadCatalog(authRepository),
  }
}

export type Dependencies = ReturnType<typeof createDependencies>
