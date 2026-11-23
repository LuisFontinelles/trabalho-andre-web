import type { HttpClient } from '@/data/network/httpClient'
import type { InscricaoDTO, MensagemDTO, OportunidadeDTO } from '@/data/professionalDto'
import {
  decisionToDTO,
  draftToDTO,
  managedOpportunityFromDTO,
  receivedRequestFromDTO,
  requestDetailFromDTO,
  requestMessageFromDTO,
} from '@/data/professionalMappers'
import type { OpportunityDraft } from '@/domain/opportunityDraft'
import type {
  Agreement,
  Decision,
  ManagedOpportunity,
  ReceivedRequest,
  RequestDetail,
  RequestMessage,
  RequestStatus,
} from '@/domain/professional'

export interface DecisionOptions {
  /** Obrigatorio na recusa; o paciente le. */
  reason?: string
  /** O que fica combinado na aprovacao. */
  agreement?: Agreement
}

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
  receivedRequests(status?: RequestStatus): Promise<readonly ReceivedRequest[]>
  requestDetail(id: string): Promise<RequestDetail>
  decideRequest(id: string, status: Decision, options?: DecisionOptions): Promise<RequestDetail>
  /** Pede uma informacao que falta; o pedido fica aguardando a resposta. */
  requestInfo(id: string, text: string): Promise<RequestDetail>
  sendMessage(id: string, text: string): Promise<RequestMessage>
}

/** Rotas do profissional no contrato v2 (secoes 5 e 7). Todas com token. */
export function createProfessionalRepository(client: HttpClient): ProfessionalRepository {
  return {
    async myOpportunities() {
      const dto = await client.send<OportunidadeDTO[]>({
        path: 'profissional-saude/oportunidades',
        authenticated: true,
      })
      return dto.map(managedOpportunityFromDTO)
    },

    async opportunity(id) {
      // Publica, mas o rascunho so aparece para o dono: o token vai junto.
      const dto = await client.send<OportunidadeDTO>({
        path: `oportunidades/${id}`,
        authenticated: true,
      })
      return managedOpportunityFromDTO(dto)
    },

    async createOpportunity(draft, asDraft = false) {
      const dto = await client.send<OportunidadeDTO>({
        path: 'oportunidades',
        method: 'POST',
        body: draftToDTO(draft, asDraft ? 'RASCUNHO' : 'ATIVA'),
        authenticated: true,
      })
      return managedOpportunityFromDTO(dto)
    },

    async updateOpportunity(id, draft, asDraft = false) {
      const dto = await client.send<OportunidadeDTO>({
        path: `oportunidades/${id}`,
        method: 'PUT',
        body: draftToDTO(draft, asDraft ? 'RASCUNHO' : 'ATIVA'),
        authenticated: true,
      })
      return managedOpportunityFromDTO(dto)
    },

    async closeOpportunity(id) {
      await client.sendVoid({
        path: `oportunidades/${id}/encerrar`,
        method: 'POST',
        authenticated: true,
      })
    },

    async deleteOpportunity(id) {
      await client.sendVoid({ path: `oportunidades/${id}`, method: 'DELETE', authenticated: true })
    },

    async receivedRequests(status) {
      const dto = await client.send<InscricaoDTO[]>({
        path: 'profissional-saude/inscricoes',
        query: status === undefined ? undefined : { status },
        authenticated: true,
      })
      return dto.map(receivedRequestFromDTO)
    },

    async requestDetail(id) {
      const dto = await client.send<InscricaoDTO>({
        path: `profissional-saude/inscricoes/${id}`,
        authenticated: true,
      })
      return requestDetailFromDTO(dto)
    },

    async decideRequest(id, status, options = {}) {
      const dto = await client.send<InscricaoDTO>({
        path: `profissional-saude/inscricoes/${id}/decisao`,
        method: 'POST',
        body: decisionToDTO(status, options),
        authenticated: true,
      })
      return requestDetailFromDTO(dto)
    },

    async requestInfo(id, text) {
      const dto = await client.send<InscricaoDTO>({
        path: `profissional-saude/inscricoes/${id}/pedido-informacao`,
        method: 'POST',
        body: { texto: text.trim() },
        authenticated: true,
      })
      return requestDetailFromDTO(dto)
    },

    async sendMessage(id, text) {
      const dto = await client.send<MensagemDTO>({
        path: `profissional-saude/inscricoes/${id}/mensagens`,
        method: 'POST',
        body: { texto: text.trim() },
        authenticated: true,
      })
      return requestMessageFromDTO(dto)
    },
  }
}
