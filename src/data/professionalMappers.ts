import {
  accessModeFrom,
  allowsPrice,
  audiencesFrom,
  careModalityFrom,
  contactMethodFrom,
  opportunityStatusFrom,
  requestStatusFrom,
  requiresAddress,
  serviceTypeFrom,
  type ManagedOpportunity,
  type ReceivedRequest,
  type RequestDetail,
  type RequestMessage,
} from '@/domain/professional'
import type { OpportunityDraft } from '@/domain/opportunityDraft'
import {
  digitsOf,
  emptyOpportunityDraft,
  formatCep,
  parsePrice,
  parseVacancies,
  selectedDocuments,
} from '@/domain/opportunityDraft'
import type {
  ApplicationDTOv2,
  CreateOpportunityRequestDTO,
  MessageDTOv2,
  OpportunityDTOv2,
} from '@/data/professionalDto'

const upper = (value: string | null) => value?.toUpperCase() ?? null

export function managedOpportunityFromDTO(dto: OpportunityDTOv2): ManagedOpportunity {
  return {
    id: dto.id,
    title: dto.titulo,
    description: dto.descricao ?? '',
    serviceType: serviceTypeFrom(dto.tipoServico),
    audiences: audiencesFrom(dto.publicoAlvo),
    specialtyId: dto.especialidade,
    accessMode: accessModeFrom(dto.modalidadeAcesso),
    price: dto.preco ?? null,
    filledVacancies: dto.vagasPreenchidas,
    totalVacancies: dto.vagasTotais,
    applicationCount: dto.totalInscricoes ?? 0,
    status: opportunityStatusFrom(dto.status),
    modality: careModalityFrom(dto.modalidade),
    cep: dto.cep ?? null,
    address: dto.endereco ?? null,
    opensAt: dto.inscricoesDe ?? null,
    closesAt: dto.inscricoesAte ?? null,
    eligibility: dto.criteriosElegibilidade ?? '',
    hasNoRestrictions: dto.semRestricoes ?? false,
    contactMethod: contactMethodFrom(dto.formaContato),
    updatedAt: dto.ultimaAtualizacao,
  }
}

export function receivedRequestFromDTO(dto: ApplicationDTOv2): ReceivedRequest {
  return {
    id: dto.id,
    patientName: dto.paciente?.nome ?? '',
    opportunityId: dto.oportunidade.id,
    opportunityTitle: dto.oportunidade.titulo,
    receivedAt: dto.dataInscricao,
    status: requestStatusFrom(dto.status),
    hasUnreadMessage: (dto.mensagensNaoLidas ?? 0) > 0,
    canMessage: dto.podeTrocarMensagens ?? false,
  }
}

export function requestMessageFromDTO(dto: MessageDTOv2): RequestMessage {
  return {
    id: dto.id,
    author: dto.autor === 'PROFISSIONAL_SAUDE' ? 'PROFISSIONAL' : 'PACIENTE',
    text: dto.texto,
    sentAt: dto.enviadaEm,
  }
}

export function requestDetailFromDTO(dto: ApplicationDTOv2): RequestDetail {
  return {
    id: dto.id,
    patientName: dto.paciente?.nome ?? '',
    opportunityId: dto.oportunidade.id,
    opportunityTitle: dto.oportunidade.titulo,
    receivedAt: dto.dataInscricao,
    status: requestStatusFrom(dto.status),
    protocol: dto.protocolo || digitsOf(dto.id),
    decidedAt: dto.decididaEm ?? null,
    triage: (dto.respostasTriagem ?? []).map((item) => ({
      question: item.pergunta,
      answer: item.resposta,
    })),
    documents: (dto.documentos ?? []).map((item) => ({
      id: item.id,
      name: item.nomeArquivo,
      sizeKb: Math.ceil(item.tamanhoBytes / 1024),
      sentAt: item.enviadoEm ?? null,
    })),
    messages: (dto.mensagens ?? []).map(requestMessageFromDTO),
  }
}

export function draftToDTO(
  draft: OpportunityDraft,
  status: 'ATIVA' | 'RASCUNHO' = 'ATIVA',
): CreateOpportunityRequestDTO {
  const hasAddress = requiresAddress(draft.modality)
  return {
    status,
    titulo: draft.title.trim(),
    tipoServico: upper(draft.serviceType),
    publicoAlvo: draft.audiences.map((item) => item.toUpperCase()),
    descricao: draft.description.trim(),
    especialidade: draft.specialtyId ?? '',
    modalidade: upper(draft.modality) ?? 'PRESENCIAL',
    cep: hasAddress ? formatCep(draft.cep) : null,
    endereco: hasAddress ? draft.address.trim() : null,
    modalidadeAcesso:
      draft.accessMode === 'preco-social'
        ? 'PRECO_SOCIAL'
        : (upper(draft.accessMode) ?? 'GRATUITO'),
    preco: allowsPrice(draft.accessMode) ? parsePrice(draft.price) : null,
    vagasTotais: parseVacancies(draft.totalVacancies) ?? 0,
    inscricoesDe: draft.opensAt,
    inscricoesAte: draft.closesAt,
    criteriosElegibilidade: draft.hasNoRestrictions ? null : draft.eligibility.trim(),
    semRestricoes: draft.hasNoRestrictions,
    formaContato: upper(draft.contactMethod),
    triagem: {
      modo: draft.triageMode,
      perguntas: draft.questions
        .filter((item) => item.label.trim() !== '')
        .map((item) => ({
          id: item.id,
          rotulo: item.label.trim(),
          tipo: item.type,
          obrigatoria: item.isRequired,
          opcoes: item.type === 'MULTIPLA' ? [...item.options] : undefined,
        })),
      documentosExigidos: selectedDocuments(draft).map((item) => ({
        id: item.id,
        rotulo: item.label.trim(),
      })),
    },
  }
}

export function draftFromManagedOpportunity(item: ManagedOpportunity): OpportunityDraft {
  return {
    ...emptyOpportunityDraft(),
    title: item.title,
    serviceType: item.serviceType,
    audiences: item.audiences,
    description: item.description,
    specialtyId: item.specialtyId === '' ? null : item.specialtyId,
    modality: item.modality,
    cep: item.cep ?? '',
    address: item.address ?? '',
    accessMode: item.accessMode,
    price: item.price === null ? '' : String(item.price).replace('.', ','),
    totalVacancies: item.totalVacancies > 0 ? String(item.totalVacancies) : '',
    opensAt: item.opensAt ?? '',
    closesAt: item.closesAt ?? '',
    eligibility: item.eligibility,
    hasNoRestrictions: item.hasNoRestrictions,
    contactMethod: item.contactMethod,
  }
}