/** DTOs do painel do profissional. Espelham o que a API vai enviar. */

export interface ManagedOpportunityDTO {
  id: string
  title: string
  specialty: string
  accessMode: string
  price: number | null
  filledVacancies: number
  totalVacancies: number
  applicationCount: number
  status: string
  modality: string
  address: string | null
  opensAt: string | null
  closesAt: string | null
  updatedAt: string
}

export interface ReceivedRequestDTO {
  id: string
  patientName: string
  opportunityId: string
  opportunityTitle: string
  receivedAt: string
  status: string
  hasUnreadMessage: boolean
  canMessage: boolean
}

export interface TriageAnswerDTO {
  question: string
  answer: string
}

export interface RequestDocumentDTO {
  id: string
  name: string
  sizeKb: number
}

export interface RequestMessageDTO {
  id: string
  author: string
  text: string
  sentAt: string
}

export interface RequestDetailDTO {
  id: string
  patientName: string
  opportunityId: string
  opportunityTitle: string
  receivedAt: string
  status: string
  triage: TriageAnswerDTO[]
  documents: RequestDocumentDTO[]
  messages: RequestMessageDTO[]
}

export interface CreateOpportunityRequestDTO {
  title: string
  description: string
  specialty: string
  audience: string
  modality: string
  address: string | null
  accessMode: string
  price: number | null
  totalVacancies: number
  opensAt: string
  closesAt: string
  triage: { mode: string; questions: { id: string; label: string }[] }
}
