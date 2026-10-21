import type { HttpClient } from '@/data/network/httpClient'
import type {
  ManagedOpportunityDTO,
  ReceivedRequestDTO,
  RequestDetailDTO,
  RequestMessageDTO,
} from '@/data/professionalDto'
import {
  draftToDTO,
  managedOpportunityFromDTO,
  receivedRequestFromDTO,
  requestDetailFromDTO,
  requestMessageFromDTO,
} from '@/data/professionalMappers'
import type { PageDTO } from '@/data/dto'
import type { OpportunityDraft } from '@/domain/opportunityDraft'
import type {
  ManagedOpportunity,
  ReceivedRequest,
  RequestDetail,
  RequestMessage,
  RequestStatus,
} from '@/domain/professional'

export interface ProfessionalRepository {
  myOpportunities(): Promise<readonly ManagedOpportunity[]>
  opportunity(id: string): Promise<ManagedOpportunity>
  createOpportunity(draft: OpportunityDraft): Promise<ManagedOpportunity>
  updateOpportunity(id: string, draft: OpportunityDraft): Promise<ManagedOpportunity>
  closeOpportunity(id: string): Promise<void>
  deleteOpportunity(id: string): Promise<void>
  receivedRequests(): Promise<readonly ReceivedRequest[]>
  requestDetail(id: string): Promise<RequestDetail>
  decideRequest(id: string, status: RequestStatus): Promise<RequestDetail>
  sendMessage(id: string, text: string): Promise<RequestMessage>
}

export function createProfessionalRepository(
  client: HttpClient,
): ProfessionalRepository {
  return {
    async myOpportunities() {
      const dto = await client.send<PageDTO<ManagedOpportunityDTO>>({
        path: 'professional/opportunities',
      })
      return dto.items.map(managedOpportunityFromDTO)
    },

    async opportunity(id) {
      const dto = await client.send<ManagedOpportunityDTO>({
        path: `professional/opportunities/${id}`,
      })
      return managedOpportunityFromDTO(dto)
    },

    async createOpportunity(draft) {
      const dto = await client.send<ManagedOpportunityDTO>({
        path: 'professional/opportunities',
        method: 'POST',
        body: draftToDTO(draft),
      })
      return managedOpportunityFromDTO(dto)
    },

    async updateOpportunity(id, draft) {
      const dto = await client.send<ManagedOpportunityDTO>({
        path: `professional/opportunities/${id}`,
        method: 'PUT',
        body: draftToDTO(draft),
      })
      return managedOpportunityFromDTO(dto)
    },

    async closeOpportunity(id) {
      await client.sendVoid({
        path: `professional/opportunities/${id}/close`,
        method: 'POST',
      })
    },

    async deleteOpportunity(id) {
      await client.sendVoid({
        path: `professional/opportunities/${id}`,
        method: 'DELETE',
      })
    },

    async receivedRequests() {
      const dto = await client.send<PageDTO<ReceivedRequestDTO>>({
        path: 'professional/requests',
      })
      return dto.items.map(receivedRequestFromDTO)
    },

    async requestDetail(id) {
      const dto = await client.send<RequestDetailDTO>({
        path: `professional/requests/${id}`,
      })
      return requestDetailFromDTO(dto)
    },

    async decideRequest(id, status) {
      const dto = await client.send<RequestDetailDTO>({
        path: `professional/requests/${id}/decision`,
        method: 'POST',
        body: { status },
      })
      return requestDetailFromDTO(dto)
    },

    async sendMessage(id, text) {
      const dto = await client.send<RequestMessageDTO>({
        path: `professional/requests/${id}/messages`,
        method: 'POST',
        body: { text },
      })
      return requestMessageFromDTO(dto)
    },
  }
}
