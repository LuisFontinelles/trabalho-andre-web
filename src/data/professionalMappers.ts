import {
  accessModeFrom,
  opportunityStatusFrom,
  requestStatusFrom,
  type ManagedOpportunity,
  type ReceivedRequest,
  type RequestDetail,
  type RequestMessage,
} from '@/domain/professional'
import { modalityFrom } from '@/domain/entities'
import {
  allowsPrice,
} from '@/domain/professional'
import type { OpportunityDraft } from '@/domain/opportunityDraft'
import { parsePrice, parseVacancies } from '@/domain/opportunityDraft'
import type {
  CreateOpportunityRequestDTO,
  ManagedOpportunityDTO,
  ReceivedRequestDTO,
  RequestDetailDTO,
  RequestMessageDTO,
} from '@/data/professionalDto'

export function managedOpportunityFromDTO(
  dto: ManagedOpportunityDTO,
): ManagedOpportunity {
  return {
    id: dto.id,
    title: dto.title,
    specialtyId: dto.specialty,
    accessMode: accessModeFrom(dto.accessMode),
    price: dto.price,
    filledVacancies: dto.filledVacancies,
    totalVacancies: dto.totalVacancies,
    applicationCount: dto.applicationCount,
    status: opportunityStatusFrom(dto.status),
    modality: modalityFrom(dto.modality),
    address: dto.address,
    opensAt: dto.opensAt,
    closesAt: dto.closesAt,
    updatedAt: dto.updatedAt,
  }
}

export function receivedRequestFromDTO(dto: ReceivedRequestDTO): ReceivedRequest {
  return {
    id: dto.id,
    patientName: dto.patientName,
    opportunityId: dto.opportunityId,
    opportunityTitle: dto.opportunityTitle,
    receivedAt: dto.receivedAt,
    status: requestStatusFrom(dto.status),
    hasUnreadMessage: dto.hasUnreadMessage,
    canMessage: dto.canMessage,
  }
}

export function requestMessageFromDTO(dto: RequestMessageDTO): RequestMessage {
  return {
    id: dto.id,
    author: dto.author === 'PROFISSIONAL' ? 'PROFISSIONAL' : 'PACIENTE',
    text: dto.text,
    sentAt: dto.sentAt,
  }
}

export function requestDetailFromDTO(dto: RequestDetailDTO): RequestDetail {
  return {
    id: dto.id,
    patientName: dto.patientName,
    opportunityId: dto.opportunityId,
    opportunityTitle: dto.opportunityTitle,
    receivedAt: dto.receivedAt,
    status: requestStatusFrom(dto.status),
    triage: dto.triage.map((item) => ({
      question: item.question,
      answer: item.answer,
    })),
    documents: dto.documents.map((item) => ({
      id: item.id,
      name: item.name,
      sizeKb: item.sizeKb,
    })),
    messages: dto.messages.map(requestMessageFromDTO),
  }
}

export function draftToDTO(draft: OpportunityDraft): CreateOpportunityRequestDTO {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    specialty: draft.specialtyId ?? '',
    audience: draft.audience.trim(),
    modality: draft.modality,
    address: draft.modality === 'presencial' ? draft.address.trim() : null,
    accessMode: draft.accessMode,
    price: allowsPrice(draft.accessMode) ? parsePrice(draft.price) : null,
    totalVacancies: parseVacancies(draft.totalVacancies) ?? 0,
    opensAt: draft.opensAt,
    closesAt: draft.closesAt,
    triage: {
      mode: draft.triageMode,
      questions: draft.questions
        .filter((item) => item.label.trim() !== '')
        .map((item) => ({ id: item.id, label: item.label.trim() })),
    },
  }
}
