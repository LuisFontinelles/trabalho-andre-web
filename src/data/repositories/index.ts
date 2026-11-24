import type {
  ApplicationDTO,
  CurrentUserDTO,
  FilterCatalogDTO,
  LoginResponseDTO,
  OpportunityDTO,
  PageDTO,
  PendingProfessionalDTO,
  ProfessionalCatalogDTO,
  VerificationChallengeDTO,
} from '@/data/dto'
import {
  applicationFromDTO,
  currentUserFromDTO,
  filterCatalogFromDTO,
  loginResultFromDTO,
  opportunityFromDTO,
  opportunityPageFromDTO,
  pendingVerificationFromDTO,
  pendingProfessionalFromDTO,
  professionalCatalogFromDTO,
  professionalHealthSignupToDTO,
  signUpDraftToDTO,
} from '@/data/mappers'
import type { HttpClient } from '@/data/network/httpClient'
import {
  queryItems,
  type Application,
  type CurrentUser,
  type FilterCatalog,
  type LoginResult,
  type Opportunity,
  type OpportunityPage,
  type PendingVerification,
  type PendingProfessional,
  type ProfessionalCatalog,
  type SignUpDraft,
} from '@/domain/entities'
import type {
  ApplicationRepository,
  AdminRepository,
  AuthRepository,
  OpportunityRepository,
} from '@/domain/repositories'

export function createAuthRepository(client: HttpClient): AuthRepository {
  return {
    async login(email, password): Promise<LoginResult> {
      const { data, status } = await client.sendWithStatus<LoginResponseDTO>({
        path: 'auth/login',
        method: 'POST',
        body: { email, password },
      })
      return loginResultFromDTO(data, status)
    },

    async me(): Promise<CurrentUser> {
      const dto = await client.send<CurrentUserDTO>({
        path: 'user/me',
        requiresAuth: true,
      })
      return currentUserFromDTO(dto)
    },

    async signUp(draft: SignUpDraft): Promise<PendingVerification> {
      const dto = await client.send<VerificationChallengeDTO>({
        path: 'auth/register',
        method: 'POST',
        body: signUpDraftToDTO(draft),
      })
      return pendingVerificationFromDTO(dto)
    },

    async registerProfessional(
      draft: SignUpDraft,
      biographyOrDescription: string,
      documents: readonly File[],
    ): Promise<PendingVerification> {
      const body = new FormData()
      body.append(
        'dados',
        new Blob(
          [JSON.stringify(professionalHealthSignupToDTO(draft, biographyOrDescription))],
          { type: 'application/json' },
        ),
      )
      for (const document of documents) body.append('documentos', document)
      const dto = await client.send<VerificationChallengeDTO>({
        path: 'auth/register',
        method: 'POST',
        body,
      })
      return pendingVerificationFromDTO(dto)
    },

    async verify(email, code): Promise<void> {
      await client.send<{ message: string }>({
        path: 'auth/verify',
        method: 'POST',
        body: { email, code },
      })
    },

    async resendCode(email): Promise<void> {
      await client.sendVoid({
        path: 'auth/resend-code',
        method: 'POST',
        body: { email },
      })
    },

    async requestPasswordReset(email): Promise<void> {
      await client.sendVoid({
        path: 'auth/password-reset',
        method: 'POST',
        body: { email },
      })
    },

    async confirmPasswordReset(email, code, newPassword): Promise<void> {
      await client.sendVoid({
        path: 'auth/password-reset',
        method: 'POST',
        body: { email, code, newPassword },
      })
    },

    async deleteAccount(password): Promise<void> {
      await client.sendVoid({
        path: 'me',
        method: 'DELETE',
        body: { password },
        requiresAuth: true,
        invalidatesSessionOnUnauthorized: false,
      })
    },

    async professionalCatalog(): Promise<ProfessionalCatalog> {
      const dto = await client.send<ProfessionalCatalogDTO>({
        path: 'catalogos',
      })
      return professionalCatalogFromDTO(dto)
    },
  }
}

export function createOpportunityRepository(
  client: HttpClient,
): OpportunityRepository {
  return {
    async search(criteria): Promise<OpportunityPage> {
      const dto = await client.send<PageDTO<OpportunityDTO>>({
        path: 'oportunidades',
        query: queryItems(criteria),
      })
      return opportunityPageFromDTO(dto)
    },

    async detail(id): Promise<Opportunity> {
      const dto = await client.send<OpportunityDTO>({ path: `oportunidades/${id}` })
      return opportunityFromDTO(dto)
    },

    async filters(): Promise<FilterCatalog> {
      const dto = await client.send<FilterCatalogDTO>({ path: 'catalogos' })
      return filterCatalogFromDTO(dto)
    },
  }
}

export function createApplicationRepository(
  client: HttpClient,
): ApplicationRepository {
  return {
    async status(id): Promise<Application> {
      const dto = await client.send<ApplicationDTO>({
        path: `profissional-saude/inscricoes/${id}`,
        requiresAuth: true,
      })
      return applicationFromDTO(dto)
    },
  }
}

export function createAdminRepository(client: HttpClient): AdminRepository {
  async function changeStatus(
    id: string,
    action: 'aprovar' | 'recusar',
  ): Promise<PendingProfessional> {
    const dto = await client.send<PendingProfessionalDTO>({
      path: `user/profissionais/${id}/${action}`,
      method: 'PATCH',
      requiresAuth: true,
    })
    return pendingProfessionalFromDTO(dto)
  }

  return {
    async pendingProfessionals(): Promise<readonly PendingProfessional[]> {
      const items = await client.send<PendingProfessionalDTO[]>({
        path: 'user/profissionais/pendentes',
        requiresAuth: true,
      })
      return items.map(pendingProfessionalFromDTO)
    },

    approveProfessional(id): Promise<PendingProfessional> {
      return changeStatus(id, 'aprovar')
    },

    rejectProfessional(id): Promise<PendingProfessional> {
      return changeStatus(id, 'recusar')
    },
  }
}
