import { createHttpClient } from '@/data/network/httpClient'
import { BASE_URL, createMockFetch } from '@/data/network/mockBackend'
import { createCareBridgeAuthRepository } from '@/data/carebridgeApi'
import {
  createApplicationRepository,
  createAuthRepository,
  createOpportunityRepository,
} from '@/data/repositories'
import { createProfessionalRepository } from '@/data/professionalRepository'
import {
  makeLoadApplicationStatus,
  makeLoadFilters,
  makeLoadOpportunityDetail,
  makeLoadProfessionalCatalog,
  makeLogin,
  makeRequestPasswordReset,
  makeResendCode,
  makeSearchOpportunities,
  makeSignUp,
  makeVerifyCode,
} from '@/domain/useCases'

/**
 * Endereco da API real. Vazio = tudo no backend de fixtures. Em
 * desenvolvimento use `/api`, que o Vite repassa para o Render (a API ainda
 * nao libera CORS para o navegador chamar direto).
 */
const API_URL: string = import.meta.env.VITE_API_URL ?? ''

/** Raiz de composicao. Equivale ao AppDependencies do aplicativo iOS. */
export function createDependencies(
  fetchImpl: typeof fetch = createMockFetch(),
  apiUrl: string = API_URL,
  apiFetch: typeof fetch = (...args) => fetch(...args),
) {
  const client = createHttpClient(BASE_URL, fetchImpl)
  const mockAuthRepository = createAuthRepository(client)
  // So login e cadastro estao prontos na API real; o resto segue no mock.
  const authRepository =
    apiUrl.trim() === ''
      ? mockAuthRepository
      : createCareBridgeAuthRepository(createHttpClient(apiUrl, apiFetch), mockAuthRepository)
  const opportunityRepository = createOpportunityRepository(client)
  const applicationRepository = createApplicationRepository(client)
  const professionalRepository = createProfessionalRepository(client)

  return {
    authRepository,
    opportunityRepository,
    applicationRepository,
    professionalRepository,
    login: makeLogin(authRepository),
    signUp: makeSignUp(authRepository),
    verifyCode: makeVerifyCode(authRepository),
    resendCode: makeResendCode(authRepository),
    requestPasswordReset: makeRequestPasswordReset(authRepository),
    loadProfessionalCatalog: makeLoadProfessionalCatalog(authRepository),
    searchOpportunities: makeSearchOpportunities(opportunityRepository),
    loadOpportunityDetail: makeLoadOpportunityDetail(opportunityRepository),
    loadFilters: makeLoadFilters(opportunityRepository),
    loadApplicationStatus: makeLoadApplicationStatus(applicationRepository),
  }
}

export type Dependencies = ReturnType<typeof createDependencies>
