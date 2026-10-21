import type { Opportunity, SignUpDraft } from '@/domain/entities'
import type { ManagedOpportunity, ReceivedRequest } from '@/domain/professional'
import type { OpportunityDraft } from '@/domain/opportunityDraft'
import { emptyOpportunityDraft } from '@/domain/opportunityDraft'
import { createDependencies } from '@/app/dependencies'
import { createMockFetch } from '@/data/network/mockBackend'

/** Dependencias apontando para o backend de fixtures, sem latencia. */
export function testDependencies() {
  return createDependencies(createMockFetch({ latency: false }))
}

export function validPatientDraft(): SignUpDraft {
  return {
    profile: 'PACIENTE',
    name: 'Ana Paula Ribeiro',
    email: 'paciente@teste.com',
    password: 'Paciente@2026',
    confirmPassword: 'Paciente@2026',
    professional: { councilId: null, stateId: null, number: '' },
    acceptedTerms: true,
  }
}

export function validProfessionalDraft(): SignUpDraft {
  return {
    profile: 'PROFISSIONAL',
    name: 'Marcos Vieira',
    email: 'profissional@teste.com',
    password: 'Profissa@2026',
    confirmPassword: 'Profissa@2026',
    professional: { councilId: 'CRM', stateId: 'DF', number: '123456' },
    acceptedTerms: true,
  }
}

export function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 'op-001',
    title: 'Psicologia online',
    specialtyId: 'psicologia',
    modality: 'online',
    offerType: 'gratuita',
    vacancies: 3,
    provider: { id: 'pr-001', name: 'Clinica Saude', isVerified: true },
    city: 'Brasilia',
    address: 'Remoto',
    distanceKm: null,
    summary: 'Atendimento semanal',
    requiredDocuments: ['RG'],
    updatedAt: '2026-10-05T14:00:00Z',
    ...overrides,
  }
}

export function makeManagedOpportunity(
  overrides: Partial<ManagedOpportunity> = {},
): ManagedOpportunity {
  return {
    id: 'op-101',
    title: 'Cardiologia - vaga social',
    specialtyId: 'cardiologia',
    accessMode: 'preco-social',
    price: 60,
    filledVacancies: 3,
    totalVacancies: 5,
    applicationCount: 4,
    status: 'ATIVA',
    modality: 'presencial',
    address: 'Rua das Flores, 120',
    opensAt: '2026-09-01',
    closesAt: '2026-10-15',
    updatedAt: '2026-10-05T14:00:00Z',
    ...overrides,
  }
}

export function makeReceivedRequest(
  overrides: Partial<ReceivedRequest> = {},
): ReceivedRequest {
  return {
    id: 'req-001',
    patientName: 'Ana Souza',
    opportunityId: 'op-101',
    opportunityTitle: 'Cardiologia - vaga social',
    receivedAt: '2026-10-21T09:12:00Z',
    status: 'EM_ANALISE',
    hasUnreadMessage: false,
    canMessage: false,
    ...overrides,
  }
}

/** Rascunho que passa nos tres passos, base para variar um campo por teste. */
export function validOpportunityDraft(): OpportunityDraft {
  return {
    ...emptyOpportunityDraft(),
    title: 'Cardiologia - vaga social',
    description: 'Avaliacao cardiologica com ECG.',
    specialtyId: 'cardiologia',
    audience: 'Adultos sem convenio',
    modality: 'presencial',
    address: 'Rua das Flores, 120',
    accessMode: 'gratuito',
    totalVacancies: '5',
    opensAt: '2026-11-01',
    closesAt: '2026-12-01',
  }
}
