import { createHttpClient } from '@/data/network/httpClient'
import { createAdminRepository, createAuthRepository } from '@/data/repositories'
import { createProfessionalRepository } from '@/data/professionalRepository'
import {
  makeDeleteAccount,
  makeLoadCatalog,
  makeLogin,
  makeRequestPasswordReset,
  makeResendCode,
  makeResetPassword,
  makeSignUp,
  makeVerifyCode,
} from '@/domain/useCases'

/**
 * Endereco da API usada pela aplicacao. Desenvolvimento e producao usam o
 * mesmo backend publicado; testes podem injetar outro transporte e URL.
 */
const API_URL: string =
  import.meta.env.VITE_API_URL?.trim() || 'https://carebridge-api-2.onrender.com'
const INJECTED_BACKEND_URL = 'https://api.carebridge.local'

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
  fetchImpl: typeof fetch = (...args) => fetch(...args),
  apiUrl: string = API_URL,
  apiFetch: typeof fetch = fetchImpl,
  tokens: TokenStore = createTokenStore(),
) {
  const options = { getToken: tokens.get, onUnauthorized: tokens.expire }
  const usesApi = apiUrl.trim() !== ''
  const client = createHttpClient(
    usesApi ? apiUrl : INJECTED_BACKEND_URL,
    usesApi ? apiFetch : fetchImpl,
    options,
  )
  const authRepository = createAuthRepository(client)
  const adminRepository = createAdminRepository(client)
  const professionalRepository = createProfessionalRepository(client)

  return {
    tokens,
    authRepository,
    adminRepository,
    professionalRepository,
    login: makeLogin(authRepository),
    signUp: makeSignUp(authRepository),
    verifyCode: makeVerifyCode(authRepository),
    resendCode: makeResendCode(authRepository),
    requestPasswordReset: makeRequestPasswordReset(authRepository),
    resetPassword: makeResetPassword(authRepository),
    exportMyData: () => authRepository.exportMyData(),
    deleteAccount: makeDeleteAccount(authRepository),
    loadCatalog: makeLoadCatalog(authRepository),
  }
}

export type Dependencies = ReturnType<typeof createDependencies>
