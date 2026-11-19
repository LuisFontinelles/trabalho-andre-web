import type { SignUpDraft } from '@/domain/entities'
import type { ManagedOpportunity, ReceivedRequest } from '@/domain/professional'
import type { OpportunityDraft } from '@/domain/opportunityDraft'
import { DEFAULT_QUESTIONS, emptyOpportunityDraft } from '@/domain/opportunityDraft'
import { createDependencies } from '@/app/dependencies'
import { createMockFetch } from '@/data/network/mockBackend'

/**
 * Dependencias apontando para o servidor simulado, sem latencia. Com
 * `signedInAs`, o token da conta ja esta guardado, como depois do login.
 */
export function testDependencies(signedInAs: string | null = 'profissional@teste.com') {
  const dependencies = createDependencies(createMockFetch({ latency: false }), '')
  if (signedInAs !== null) dependencies.tokens.set(`mock.${signedInAs}`)
  return dependencies
}

export function validPatientDraft(): SignUpDraft {
  return {
    profile: 'PACIENTE',
    name: 'Ana Paula Ribeiro',
    email: 'paciente@teste.com',
    password: 'Paciente@2026',
    confirmPassword: 'Paciente@2026',
    professional: { councilId: null, stateId: null, number: '', specialtyId: null, workplace: '' },
    acceptedTerms: true,
  }
}

export function validProfessionalDraft(): SignUpDraft {
  return {
    profile: 'PROFISSIONAL',
    name: 'Marcos Vieira',
    email: 'novo.medico@clinica.com',
    password: 'Profissa@2026',
    confirmPassword: 'Profissa@2026',
    professional: {
      councilId: 'CRM',
      stateId: 'DF',
      number: '123456',
      specialtyId: 'cardiologia',
      workplace: 'Instituto Movida',
    },
    acceptedTerms: true,
  }
}

export function makeManagedOpportunity(
  overrides: Partial<ManagedOpportunity> = {},
): ManagedOpportunity {
  return {
    id: 'op-101',
    title: 'Cardiologia - vaga social',
    description: 'Avaliacao cardiologica com ECG, voltada a pacientes sem convenio.',
    serviceType: 'consulta',
    audiences: ['adultos'],
    specialtyId: 'cardiologia',
    accessMode: 'preco-social',
    price: 60,
    filledVacancies: 3,
    totalVacancies: 5,
    applicationCount: 4,
    status: 'ATIVA',
    modality: 'presencial',
    cep: '70000-000',
    address: 'Rua das Flores, 120',
    opensAt: '2026-09-01',
    closesAt: '2026-10-15',
    eligibility: 'Adultos sem convenio.',
    hasNoRestrictions: false,
    contactMethod: 'plataforma',
    updatedAt: '2026-10-05T14:00:00Z',
    city: 'Brasília',
    state: 'DF',
    audienceNote: null,
    responseDays: 15,
    triage: {
      mode: 'PADRAO',
      questions: DEFAULT_QUESTIONS,
      documents: [
        { id: 'rg', label: 'RG' },
        { id: 'encaminhamento', label: 'Encaminhamento médico' },
      ],
    },
    ...overrides,
  }
}

export function makeReceivedRequest(
  overrides: Partial<ReceivedRequest> = {},
): ReceivedRequest {
  return {
    id: 'req-001',
    protocol: '20418',
    patientName: 'Ana Souza',
    opportunityId: 'op-101',
    opportunityTitle: 'Cardiologia - vaga social',
    receivedAt: '2026-10-21T09:12:00Z',
    deadline: '2026-11-05T09:12:00Z',
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
    serviceType: 'consulta',
    audiences: ['adultos', 'idosos'],
    description: 'Avaliacao cardiologica com ECG, voltada a pacientes sem convenio.',
    specialtyId: 'cardiologia',
    modality: 'presencial',
    cep: '70000-000',
    address: 'Rua das Flores, 120',
    accessMode: 'gratuito',
    totalVacancies: '5',
    opensAt: '2026-11-01',
    closesAt: '2026-12-01',
    eligibility: 'Adultos sem convenio, moradores do DF.',
    contactMethod: 'plataforma',
  }
}
