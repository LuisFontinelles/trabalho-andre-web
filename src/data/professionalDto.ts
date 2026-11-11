/** DTOs do painel do profissional. Espelham o que a API vai enviar. */

export interface ManagedOpportunityDTO {
  id: string
  title: string
  description?: string | null
  serviceType?: string | null
  audiences?: string[] | null
  specialty: string
  accessMode: string
  price: number | null
  filledVacancies: number
  totalVacancies: number
  applicationCount: number
  status: string
  modality: string
  cep?: string | null
  address: string | null
  opensAt: string | null
  closesAt: string | null
  eligibility?: string | null
  noRestrictions?: boolean | null
  contactMethod?: string | null
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
  sentAt?: string | null
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
  protocol?: string | null
  decidedAt?: string | null
  triage: TriageAnswerDTO[]
  documents: RequestDocumentDTO[]
  messages: RequestMessageDTO[]
}

export interface TriageQuestionDTO {
  id: string
  label: string
  type: string
  required: boolean
  options: string[]
}

export interface CreateOpportunityRequestDTO {
  /** ATIVA publica; RASCUNHO so guarda. */
  status: string
  title: string
  serviceType: string | null
  audiences: string[]
  description: string
  specialty: string
  modality: string
  cep: string | null
  address: string | null
  accessMode: string
  price: number | null
  totalVacancies: number
  opensAt: string
  closesAt: string
  eligibility: string | null
  noRestrictions: boolean
  contactMethod: string | null
  triage: {
    mode: string
    questions: TriageQuestionDTO[]
    documents: { id: string; label: string }[]
  }
}
