import { createHttpClient, SESSION_EXPIRED_EVENT } from '@/data/network/httpClient'
import { BASE_URL, createMockFetch } from '@/data/network/mockBackend'
import {
  createApplicationRepository,
  createAuthRepository,
  createOpportunityRepository,
  PROFESSIONAL_SIGNUP_URL,
  USER_LOGIN_URL,
} from '@/data/repositories'
import { createProfessionalRepository } from '@/data/professionalRepository'
import {
  makeLoadApplicationStatus,
  makeLoadFilters,
  makeLoadOpportunityDetail,
  makeLoadProfessionalCatalog,
  makeLogin,
  makeRegisterProfessional,
  makeRequestPasswordReset,
  makeResendCode,
  makeSearchOpportunities,
  makeSignUp,
  makeVerifyCode,
} from '@/domain/useCases'

/** Raiz de composicao. Equivale ao AppDependencies do aplicativo iOS. */
export function createDependencies(fetchImpl?: typeof fetch) {
  const mockFetch = createMockFetch()
  const appFetch: typeof fetch =
    fetchImpl ??
    ((input, init) => {
      const requestUrl =
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      return requestUrl === PROFESSIONAL_SIGNUP_URL || requestUrl === USER_LOGIN_URL
        ? fetch(input, init)
        : mockFetch(input, init)
    })
  const client = createHttpClient(BASE_URL, appFetch, {
    getToken: () => {
      try {
        return sessionStorage.getItem('token')
      } catch {
        return null
      }
    },
    onSessionExpired: () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
      }
    },
  })
  const authRepository = createAuthRepository(client)
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
    registerProfessional: makeRegisterProfessional(authRepository),
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
