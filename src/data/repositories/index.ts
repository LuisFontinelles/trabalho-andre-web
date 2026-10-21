import type {
  ApplicationDTO,
  AuthResponseDTO,
  FilterCatalogDTO,
  OpportunityDTO,
  PageDTO,
  ProfessionalCatalogDTO,
  VerificationChallengeDTO,
} from '@/data/dto'
import {
  applicationFromDTO,
  filterCatalogFromDTO,
  opportunityFromDTO,
  opportunityPageFromDTO,
  pendingVerificationFromDTO,
  professionalCatalogFromDTO,
  sessionFromDTO,
  signUpDraftToDTO,
} from '@/data/mappers'
import type { HttpClient } from '@/data/network/httpClient'
import {
  queryItems,
  type Application,
  type FilterCatalog,
  type Opportunity,
  type OpportunityPage,
  type PendingVerification,
  type ProfessionalCatalog,
  type SearchCriteria,
  type Session,
  type SignUpDraft,
} from '@/domain/entities'
import type {
  ApplicationRepository,
  AuthRepository,
  OpportunityRepository,
} from '@/domain/repositories'

export function createAuthRepository(client: HttpClient): AuthRepository {
  return {
    async login(email, password): Promise<Session> {
      const dto = await client.send<AuthResponseDTO>({
        path: 'auth/login',
        method: 'POST',
        body: { email, password },
      })
      return sessionFromDTO(dto)
    },

    async loginWithGoogle(): Promise<Session> {
      const dto = await client.send<AuthResponseDTO>({
        path: 'auth/google',
        method: 'POST',
        body: {},
      })
      return sessionFromDTO(dto)
    },

    async signUp(draft: SignUpDraft): Promise<PendingVerification> {
      const dto = await client.send<VerificationChallengeDTO>({
        path: 'auth/signup',
        method: 'POST',
        body: signUpDraftToDTO(draft),
      })
      return pendingVerificationFromDTO(dto)
    },

    async verify(email, code): Promise<Session> {
      const dto = await client.send<AuthResponseDTO>({
        path: 'auth/verify',
        method: 'POST',
        body: { email, code },
      })
      return sessionFromDTO(dto)
    },

    async resendCode(email): Promise<void> {
      await client.sendVoid({
        path: 'auth/resend-code',
        method: 'POST',
        body: { email },
      })
    },

    async professionalCatalog(): Promise<ProfessionalCatalog> {
      const dto = await client.send<ProfessionalCatalogDTO>({
        path: 'auth/professional-catalog',
      })
      return professionalCatalogFromDTO(dto)
    },
  }
}

const PAGE_SIZE = 6

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/**
 * O backend ainda nao existe. A busca e a paginacao sao resolvidas no cliente
 * sobre o conjunto devolvido pela fixture, preservando o contrato de query que
 * o servidor vai implementar.
 */
export function createOpportunityRepository(
  client: HttpClient,
): OpportunityRepository {
  function applyFilters(
    criteria: SearchCriteria,
    items: readonly Opportunity[],
  ): Opportunity[] {
    const term = normalize(criteria.term)
    return items.filter((item) => {
      const haystack = normalize(
        [item.title, item.provider.name, item.city, item.specialtyId].join(' '),
      )
      const matchesTerm = term === '' || haystack.includes(term)
      const matchesSpecialty =
        criteria.specialties.length === 0 ||
        criteria.specialties.includes(item.specialtyId)
      const matchesModality =
        criteria.modalities.length === 0 || criteria.modalities.includes(item.modality)
      const matchesOffer =
        criteria.offerTypes.length === 0 || criteria.offerTypes.includes(item.offerType)
      const limit = criteria.distance === null ? null : Number(criteria.distance)
      const matchesDistance = limit === null || (item.distanceKm ?? 0) <= limit
      return (
        matchesTerm &&
        matchesSpecialty &&
        matchesModality &&
        matchesOffer &&
        matchesDistance
      )
    })
  }

  function paginate(items: Opportunity[], page: number): OpportunityPage {
    if (items.length === 0) {
      return { items: [], page: 1, totalPages: 1, totalItems: 0 }
    }
    const totalPages = Math.ceil(items.length / PAGE_SIZE)
    const current = Math.min(Math.max(page, 1), totalPages)
    const start = (current - 1) * PAGE_SIZE
    return {
      items: items.slice(start, start + PAGE_SIZE),
      page: current,
      totalPages,
      totalItems: items.length,
    }
  }

  return {
    async search(criteria): Promise<OpportunityPage> {
      const dto = await client.send<PageDTO<OpportunityDTO>>({
        path: 'opportunities',
        query: queryItems(criteria),
      })
      const page = opportunityPageFromDTO(dto)
      return paginate(applyFilters(criteria, page.items), criteria.page)
    },

    async detail(id): Promise<Opportunity> {
      const dto = await client.send<OpportunityDTO>({ path: `opportunities/${id}` })
      const detail = opportunityFromDTO(dto)
      if (detail.id === id) return detail
      const all = await client.send<PageDTO<OpportunityDTO>>({ path: 'opportunities' })
      const found = all.items.find((item) => item.id === id)
      return found ? opportunityFromDTO(found) : detail
    },

    async filters(): Promise<FilterCatalog> {
      const dto = await client.send<FilterCatalogDTO>({ path: 'filters' })
      return filterCatalogFromDTO(dto)
    },
  }
}

export function createApplicationRepository(
  client: HttpClient,
): ApplicationRepository {
  return {
    async status(id): Promise<Application> {
      const dto = await client.send<ApplicationDTO>({ path: `applications/${id}` })
      return applicationFromDTO(dto)
    },
  }
}
