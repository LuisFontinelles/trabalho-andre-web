import type { Opportunity, SignUpDraft } from '@/domain/entities'
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
