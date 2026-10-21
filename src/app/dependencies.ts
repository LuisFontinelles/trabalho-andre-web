import { createHttpClient } from '@/data/network/httpClient'
import { BASE_URL, createMockFetch } from '@/data/network/mockBackend'
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
  makeResendCode,
  makeSearchOpportunities,
  makeSignUp,
  makeVerifyCode,
} from '@/domain/useCases'

/** Raiz de composicao. Equivale ao AppDependencies do aplicativo iOS. */
export function createDependencies(fetchImpl: typeof fetch = createMockFetch()) {
  const client = createHttpClient(BASE_URL, fetchImpl)
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
    verifyCode: makeVerifyCode(authRepository),
    resendCode: makeResendCode(authRepository),
    loadProfessionalCatalog: makeLoadProfessionalCatalog(authRepository),
    searchOpportunities: makeSearchOpportunities(opportunityRepository),
    loadOpportunityDetail: makeLoadOpportunityDetail(opportunityRepository),
    loadFilters: makeLoadFilters(opportunityRepository),
    loadApplicationStatus: makeLoadApplicationStatus(applicationRepository),
  }
}

export type Dependencies = ReturnType<typeof createDependencies>
