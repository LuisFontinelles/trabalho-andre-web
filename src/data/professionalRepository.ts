import type { HttpClient } from '@/data/network/httpClient'
import type {
  ApplicationDTOv2,
  MessageDTOv2,
  OpportunityDTOv2,
} from '@/data/professionalDto'
import {
  draftToDTO,
  managedOpportunityFromDTO,
  receivedRequestFromDTO,
  requestDetailFromDTO,
  requestMessageFromDTO,
} from '@/data/professionalMappers'
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
  /** `asDraft` guarda como rascunho em vez de publicar. */
  createOpportunity(draft: OpportunityDraft, asDraft?: boolean): Promise<ManagedOpportunity>
  updateOpportunity(
    id: string,
    draft: OpportunityDraft,
    asDraft?: boolean,
  ): Promise<ManagedOpportunity>
  closeOpportunity(id: string): Promise<void>
  deleteOpportunity(id: string): Promise<void>
  receivedRequests(): Promise<readonly ReceivedRequest[]>
  requestDetail(id: string): Promise<RequestDetail>
  /** A recusa leva o motivo, que o paciente le. */
  decideRequest(id: string, status: RequestStatus, reason?: string): Promise<RequestDetail>
  /** Pede uma informacao que falta; o pedido fica aguardando a resposta. */
  requestInfo(id: string, text: string): Promise<RequestDetail>
  sendMessage(id: string, text: string): Promise<RequestMessage>
}

export function createProfessionalRepository(
  client: HttpClient,
): ProfessionalRepository {
  return {
    async myOpportunities() {
      const dto = await client.send<OpportunityDTOv2[]>({
        path: 'profissional-saude/oportunidades',
        requiresAuth: true,
      })
      return dto.map(managedOpportunityFromDTO)
    },

    async opportunity(id) {
      const dto = await client.send<OpportunityDTOv2>({
        path: `oportunidades/${id}`,
        requiresAuth: true,
      })
      return managedOpportunityFromDTO(dto)
    },

    async createOpportunity(draft, asDraft = false) {
      const dto = await client.send<OpportunityDTOv2>({
        path: 'oportunidades',
        method: 'POST',
        body: draftToDTO(draft, asDraft ? 'RASCUNHO' : 'ATIVA'),
        requiresAuth: true,
      })
      return managedOpportunityFromDTO(dto)
    },

    async updateOpportunity(id, draft, asDraft = false) {
      const dto = await client.send<OpportunityDTOv2>({
        path: `oportunidades/${id}`,
        method: 'PUT',
        body: draftToDTO(draft, asDraft ? 'RASCUNHO' : 'ATIVA'),
        requiresAuth: true,
      })
      return managedOpportunityFromDTO(dto)
    },

    async closeOpportunity(id) {
      await client.sendVoid({
        path: `oportunidades/${id}/encerrar`,
        method: 'POST',
        requiresAuth: true,
      })
    },

    async deleteOpportunity(id) {
      await client.sendVoid({
        path: `oportunidades/${id}`,
        method: 'DELETE',
        requiresAuth: true,
      })
    },

    async receivedRequests() {
      const dto = await client.send<ApplicationDTOv2[]>({
        path: 'profissional-saude/inscricoes',
        requiresAuth: true,
      })
      return dto.map(receivedRequestFromDTO)
    },

    async requestDetail(id) {
      const dto = await client.send<ApplicationDTOv2>({
        path: `profissional-saude/inscricoes/${id}`,
        requiresAuth: true,
      })
      return requestDetailFromDTO(dto)
    },

    async decideRequest(id, status, reason) {
      const dto = await client.send<ApplicationDTOv2>({
        path: `profissional-saude/inscricoes/${id}/decisao`,
        method: 'POST',
        body: {
          status,
          motivo: reason?.trim() ?? null,
          combinado: status === 'APROVADA'
            ? { quando: 'A combinar', onde: 'A combinar', levar: 'A combinar' }
            : null,
        },
        requiresAuth: true,
      })
      return requestDetailFromDTO(dto)
    },

    async requestInfo(id, text) {
      const dto = await client.send<ApplicationDTOv2>({
        path: `profissional-saude/inscricoes/${id}/pedido-informacao`,
        method: 'POST',
        body: { texto: text.trim() },
        requiresAuth: true,
      })
      return requestDetailFromDTO(dto)
    },

    async sendMessage(id, text) {
      const dto = await client.send<MessageDTOv2>({
        path: `profissional-saude/inscricoes/${id}/mensagens`,
        method: 'POST',
        body: { texto: text },
        requiresAuth: true,
      })
      return requestMessageFromDTO(dto)
    },
  }
}
