import { createHttpClient, SESSION_EXPIRED_EVENT } from '@/data/network/httpClient'
import { API_BASE_URL } from '@/data/network/apiConfig'
import {
  createApplicationRepository,
  createAdminRepository,
  createAuthRepository,
  createOpportunityRepository,
} from '@/data/repositories'
import { createProfessionalRepository } from '@/data/professionalRepository'
import {
  makeConfirmPasswordReset,
  makeLoadApplicationStatus,
  makeLoadCurrentUser,
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
  const client = createHttpClient(API_BASE_URL, fetchImpl ?? fetch, {
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
  const adminRepository = createAdminRepository(client)

  return {
    authRepository,
    opportunityRepository,
    applicationRepository,
    professionalRepository,
    adminRepository,
    login: makeLogin(authRepository),
    loadCurrentUser: makeLoadCurrentUser(authRepository),
    signUp: makeSignUp(authRepository),
    registerProfessional: makeRegisterProfessional(authRepository),
    verifyCode: makeVerifyCode(authRepository),
    resendCode: makeResendCode(authRepository),
    requestPasswordReset: makeRequestPasswordReset(authRepository),
    confirmPasswordReset: makeConfirmPasswordReset(authRepository),
    loadProfessionalCatalog: makeLoadProfessionalCatalog(authRepository),
    searchOpportunities: makeSearchOpportunities(opportunityRepository),
    loadOpportunityDetail: makeLoadOpportunityDetail(opportunityRepository),
    loadFilters: makeLoadFilters(opportunityRepository),
    loadApplicationStatus: makeLoadApplicationStatus(applicationRepository),
  }
}

export type Dependencies = ReturnType<typeof createDependencies>
