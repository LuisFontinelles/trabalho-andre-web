import { allowsPrice, type AccessMode } from '@/domain/professional'

/** Rascunho da nova oportunidade, nos tres passos do prototipo. */

export type DraftStep = 'DADOS' | 'ACESSO' | 'TRIAGEM'

export const DRAFT_STEPS: readonly DraftStep[] = ['DADOS', 'ACESSO', 'TRIAGEM']

export const DRAFT_STEP_LABEL: Record<DraftStep, string> = {
  DADOS: 'Dados basicos',
  ACESSO: 'Condicoes de acesso',
  TRIAGEM: 'Triagem e documentos',
}

export type TriageMode = 'PADRAO' | 'PERSONALIZADO'

export interface TriageQuestion {
  id: string
  label: string
}

export interface OpportunityDraft {
  title: string
  description: string
  specialtyId: string | null
  audience: string
  modality: 'presencial' | 'online'
  address: string
  accessMode: AccessMode
  price: string
  totalVacancies: string
  opensAt: string
  closesAt: string
  triageMode: TriageMode
  questions: readonly TriageQuestion[]
}

export const DEFAULT_QUESTIONS: readonly TriageQuestion[] = [
  { id: 'q1', label: 'Qual o motivo principal?' },
  { id: 'q2', label: 'Ja possui diagnostico?' },
  { id: 'q3', label: 'Usa medicacao continua?' },
  { id: 'q4', label: 'Qual a urgencia percebida?' },
]

export function emptyOpportunityDraft(): OpportunityDraft {
  return {
    title: '',
    description: '',
    specialtyId: null,
    audience: '',
    modality: 'presencial',
    address: '',
    accessMode: 'gratuito',
    price: '',
    totalVacancies: '',
    opensAt: '',
    closesAt: '',
    triageMode: 'PADRAO',
    questions: DEFAULT_QUESTIONS,
  }
}

export type DraftErrorCode =
  | 'descriptionRequired'
  | 'specialtyRequired'
  | 'audienceRequired'
  | 'addressRequired'
  | 'vacanciesRequired'
  | 'vacanciesInvalid'
  | 'priceRequired'
  | 'priceInvalid'
  | 'opensAtRequired'
  | 'closesAtRequired'
  | 'closesBeforeOpens'
  | 'questionsRequired'

const DRAFT_ERROR_MESSAGE: Record<DraftErrorCode, string> = {
  descriptionRequired: 'Descreva o que sera oferecido.',
  specialtyRequired: 'Selecione a especialidade.',
  audienceRequired: 'Informe o publico-alvo.',
  addressRequired: 'Informe o endereco do atendimento presencial.',
  vacanciesRequired: 'Informe o numero de vagas.',
  vacanciesInvalid: 'O numero de vagas precisa ser maior que zero.',
  priceRequired: 'Informe o preco da modalidade preco social.',
  priceInvalid: 'O preco precisa ser maior que zero.',
  opensAtRequired: 'Informe o inicio das inscricoes.',
  closesAtRequired: 'Informe o encerramento.',
  closesBeforeOpens: 'O encerramento precisa ser depois do inicio.',
  questionsRequired: 'Inclua ao menos uma pergunta na triagem.',
}

export class DraftError extends Error {
  readonly code: DraftErrorCode

  constructor(code: DraftErrorCode) {
    super(DRAFT_ERROR_MESSAGE[code])
    this.name = 'DraftError'
    this.code = code
  }
}

/**
 * O titulo nao e obrigatorio no prototipo: so os campos marcados com
 * asterisco sao. O endereco so e exigido quando o atendimento e presencial.
 */
export function validateBasics(draft: OpportunityDraft): void {
  if (draft.description.trim() === '') throw new DraftError('descriptionRequired')
  if (draft.specialtyId === null) throw new DraftError('specialtyRequired')
  if (draft.audience.trim() === '') throw new DraftError('audienceRequired')
  if (draft.modality === 'presencial' && draft.address.trim() === '') {
    throw new DraftError('addressRequired')
  }
}

export function parseVacancies(raw: string): number | null {
  const value = Number(raw.trim())
  return Number.isInteger(value) ? value : null
}

export function parsePrice(raw: string): number | null {
  const value = Number(raw.trim().replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

export function validateAccess(draft: OpportunityDraft): void {
  if (allowsPrice(draft.accessMode)) {
    if (draft.price.trim() === '') throw new DraftError('priceRequired')
    const price = parsePrice(draft.price)
    if (price === null || price <= 0) throw new DraftError('priceInvalid')
  }

  if (draft.totalVacancies.trim() === '') throw new DraftError('vacanciesRequired')
  const vacancies = parseVacancies(draft.totalVacancies)
  if (vacancies === null || vacancies <= 0) throw new DraftError('vacanciesInvalid')

  if (draft.opensAt.trim() === '') throw new DraftError('opensAtRequired')
  if (draft.closesAt.trim() === '') throw new DraftError('closesAtRequired')
  if (draft.closesAt < draft.opensAt) throw new DraftError('closesBeforeOpens')
}

export function validateTriage(draft: OpportunityDraft): void {
  const filled = draft.questions.filter((item) => item.label.trim() !== '')
  if (filled.length === 0) throw new DraftError('questionsRequired')
}

export function validateStep(draft: OpportunityDraft, step: DraftStep): void {
  if (step === 'DADOS') return validateBasics(draft)
  if (step === 'ACESSO') return validateAccess(draft)
  return validateTriage(draft)
}

export function nextStep(step: DraftStep): DraftStep | null {
  const index = DRAFT_STEPS.indexOf(step)
  return DRAFT_STEPS[index + 1] ?? null
}

export function previousStep(step: DraftStep): DraftStep | null {
  const index = DRAFT_STEPS.indexOf(step)
  return index <= 0 ? null : (DRAFT_STEPS[index - 1] ?? null)
}

/** Trocar para uma modalidade sem preco limpa o valor digitado antes. */
export function applyAccessMode(
  draft: OpportunityDraft,
  mode: AccessMode,
): OpportunityDraft {
  return {
    ...draft,
    accessMode: mode,
    price: allowsPrice(mode) ? draft.price : '',
  }
}

/** Trocar para online limpa o endereco, que deixa de fazer sentido. */
export function applyModality(
  draft: OpportunityDraft,
  modality: 'presencial' | 'online',
): OpportunityDraft {
  return {
    ...draft,
    modality,
    address: modality === 'presencial' ? draft.address : '',
  }
}
