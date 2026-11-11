import {
  allowsPrice,
  requiresAddress,
  type AccessMode,
  type Audience,
  type CareModality,
  type ContactMethod,
  type ServiceType,
} from '@/domain/professional'

/** Rascunho da nova oportunidade, nos tres passos do prototipo. */

export type DraftStep = 'DADOS' | 'ACESSO' | 'TRIAGEM'

export const DRAFT_STEPS: readonly DraftStep[] = ['DADOS', 'ACESSO', 'TRIAGEM']

export const DRAFT_STEP_LABEL: Record<DraftStep, string> = {
  DADOS: 'Dados básicos',
  ACESSO: 'Condições de acesso',
  TRIAGEM: 'Triagem e documentos',
}

export type TriageMode = 'PADRAO' | 'PERSONALIZADO'

export type QuestionType = 'TEXTO_CURTO' | 'TEXTO_LONGO' | 'MULTIPLA' | 'SIM_NAO'

export const QUESTION_TYPES: readonly QuestionType[] = [
  'TEXTO_CURTO',
  'TEXTO_LONGO',
  'MULTIPLA',
  'SIM_NAO',
]

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  TEXTO_CURTO: 'Texto curto',
  TEXTO_LONGO: 'Texto longo',
  MULTIPLA: 'Múltipla escolha',
  SIM_NAO: 'Sim ou não',
}

/** Multipla escolha so funciona com pelo menos duas opcoes. */
export const MIN_OPTIONS = 2

export interface TriageQuestion {
  id: string
  label: string
  type: QuestionType
  isRequired: boolean
  /** So a multipla escolha usa. */
  options: readonly string[]
}

export interface RequiredDocument {
  id: string
  label: string
  /** Documento que o profissional acrescentou, e nao veio do catalogo. */
  isCustom: boolean
}

/** Documentos que o prototipo oferece prontos. */
export const DOCUMENT_CATALOG: readonly RequiredDocument[] = [
  { id: 'rg', label: 'RG', isCustom: false },
  { id: 'cpf', label: 'CPF', isCustom: false },
  { id: 'sus', label: 'Cartão do SUS', isCustom: false },
  { id: 'encaminhamento', label: 'Encaminhamento médico', isCustom: false },
  { id: 'residencia', label: 'Comprovante de residência', isCustom: false },
  { id: 'renda', label: 'Comprovante de renda', isCustom: false },
  { id: 'exames', label: 'Exames anteriores', isCustom: false },
]

export interface OpportunityDraft {
  title: string
  serviceType: ServiceType | null
  audiences: readonly Audience[]
  description: string
  specialtyId: string | null
  modality: CareModality | null
  cep: string
  address: string
  accessMode: AccessMode | null
  price: string
  totalVacancies: string
  opensAt: string
  closesAt: string
  eligibility: string
  hasNoRestrictions: boolean
  contactMethod: ContactMethod | null
  triageMode: TriageMode
  questions: readonly TriageQuestion[]
  documents: readonly RequiredDocument[]
  selectedDocumentIds: readonly string[]
}

export const DEFAULT_QUESTIONS: readonly TriageQuestion[] = [
  { id: 'q1', label: 'Qual o motivo principal?', type: 'TEXTO_LONGO', isRequired: true, options: [] },
  {
    id: 'q2',
    label: 'Há quanto tempo?',
    type: 'MULTIPLA',
    isRequired: true,
    options: ['Menos de 1 semana', 'De 1 a 4 semanas', 'De 1 a 6 meses', 'Mais de 6 meses'],
  },
  { id: 'q3', label: 'Já possui diagnóstico?', type: 'SIM_NAO', isRequired: true, options: [] },
  { id: 'q4', label: 'Usa medicação contínua?', type: 'SIM_NAO', isRequired: true, options: [] },
  {
    id: 'q5',
    label: 'Qual a urgência percebida?',
    type: 'MULTIPLA',
    isRequired: true,
    options: ['Baixa', 'Média', 'Alta'],
  },
]

export function emptyOpportunityDraft(): OpportunityDraft {
  return {
    title: '',
    serviceType: null,
    audiences: [],
    description: '',
    specialtyId: null,
    modality: null,
    cep: '',
    address: '',
    // Nenhuma modalidade vem marcada: o prototipo exige a escolha.
    accessMode: null,
    price: '',
    totalVacancies: '',
    opensAt: '',
    closesAt: '',
    eligibility: '',
    hasNoRestrictions: false,
    contactMethod: null,
    triageMode: 'PADRAO',
    questions: DEFAULT_QUESTIONS,
    documents: DOCUMENT_CATALOG,
    selectedDocumentIds: ['rg'],
  }
}

export const DESCRIPTION_MIN = 40
export const DESCRIPTION_MAX = 600

export type DraftErrorCode =
  | 'titleRequired'
  | 'serviceTypeRequired'
  | 'audiencesRequired'
  | 'descriptionRequired'
  | 'descriptionTooShort'
  | 'descriptionTooLong'
  | 'specialtyRequired'
  | 'modalityRequired'
  | 'cepRequired'
  | 'cepInvalid'
  | 'addressRequired'
  | 'accessModeRequired'
  | 'vacanciesRequired'
  | 'vacanciesInvalid'
  | 'priceRequired'
  | 'priceInvalid'
  | 'opensAtRequired'
  | 'closesAtRequired'
  | 'closesBeforeOpens'
  | 'eligibilityRequired'
  | 'contactMethodRequired'
  | 'questionsRequired'
  | 'documentsRequired'
  | 'questionLabelRequired'
  | 'questionOptionsRequired'

const DRAFT_ERROR_MESSAGE: Record<DraftErrorCode, string> = {
  titleRequired: 'Informe um título.',
  serviceTypeRequired: 'Escolha o tipo de serviço.',
  audiencesRequired: 'Escolha para quem é a oportunidade.',
  descriptionRequired: 'Descreva o que será oferecido.',
  descriptionTooShort: `A descrição precisa ter pelo menos ${DESCRIPTION_MIN} caracteres.`,
  descriptionTooLong: `A descrição pode ter até ${DESCRIPTION_MAX} caracteres.`,
  specialtyRequired: 'Escolha uma especialidade.',
  modalityRequired: 'Escolha como será o atendimento.',
  cepRequired: 'Informe o CEP.',
  cepInvalid: 'O CEP tem 8 dígitos.',
  addressRequired: 'Obrigatório no atendimento presencial.',
  accessModeRequired: 'Escolha a modalidade de acesso.',
  vacanciesRequired: 'Informe o número de vagas.',
  vacanciesInvalid: 'O número de vagas precisa ser maior que zero.',
  priceRequired: 'Informe o preço da modalidade preço social.',
  priceInvalid: 'O preço precisa ser maior que zero.',
  opensAtRequired: 'Informe o início das inscrições.',
  closesAtRequired: 'Informe o encerramento.',
  closesBeforeOpens: 'O encerramento precisa ser depois do início.',
  eligibilityRequired: 'Diga quem pode solicitar ou marque "Sem restrições".',
  contactMethodRequired: 'Escolha como combinar o atendimento.',
  questionsRequired: 'Inclua ao menos uma pergunta na triagem.',
  documentsRequired: 'Selecione ao menos um documento exigido.',
  questionLabelRequired: 'Escreva a pergunta.',
  questionOptionsRequired: `A múltipla escolha precisa de pelo menos ${MIN_OPTIONS} opções.`,
}

export function draftErrorMessage(code: DraftErrorCode): string {
  return DRAFT_ERROR_MESSAGE[code]
}

export class DraftError extends Error {
  readonly code: DraftErrorCode

  constructor(code: DraftErrorCode) {
    super(DRAFT_ERROR_MESSAGE[code])
    this.name = 'DraftError'
    this.code = code
  }
}

/** Campo do formulario que recebe a marca de erro. */
export type DraftField =
  | 'title'
  | 'serviceType'
  | 'audiences'
  | 'description'
  | 'specialtyId'
  | 'modality'
  | 'cep'
  | 'address'
  | 'accessMode'
  | 'price'
  | 'totalVacancies'
  | 'opensAt'
  | 'closesAt'
  | 'eligibility'
  | 'contactMethod'
  | 'questions'
  | 'documents'

export type DraftErrors = Partial<Record<DraftField, DraftErrorCode>>

export function digitsOf(raw: string): string {
  return raw.replace(/\D/g, '')
}

/** "70000000" vira "70000-000" enquanto a pessoa digita. */
export function formatCep(raw: string): string {
  const digits = digitsOf(raw).slice(0, 8)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

/**
 * Todos os erros do passo Dados basicos de uma vez, para a tela marcar cada
 * campo e dizer quantos faltam. CEP e endereco so entram quando o
 * atendimento tem encontro presencial.
 */
export function basicsErrors(draft: OpportunityDraft): DraftErrors {
  const errors: DraftErrors = {}
  if (draft.title.trim() === '') errors.title = 'titleRequired'
  if (draft.serviceType === null) errors.serviceType = 'serviceTypeRequired'
  if (draft.audiences.length === 0) errors.audiences = 'audiencesRequired'

  const description = draft.description.trim()
  if (description === '') errors.description = 'descriptionRequired'
  else if (description.length < DESCRIPTION_MIN) errors.description = 'descriptionTooShort'
  else if (description.length > DESCRIPTION_MAX) errors.description = 'descriptionTooLong'

  if (draft.specialtyId === null) errors.specialtyId = 'specialtyRequired'
  if (draft.modality === null) errors.modality = 'modalityRequired'

  if (requiresAddress(draft.modality)) {
    const cep = digitsOf(draft.cep)
    if (cep === '') errors.cep = 'cepRequired'
    else if (cep.length !== 8) errors.cep = 'cepInvalid'
    if (draft.address.trim() === '') errors.address = 'addressRequired'
  }
  return errors
}

export function parseVacancies(raw: string): number | null {
  const value = Number(raw.trim())
  return Number.isInteger(value) ? value : null
}

export function parsePrice(raw: string): number | null {
  const value = Number(raw.trim().replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

export function accessErrors(draft: OpportunityDraft): DraftErrors {
  const errors: DraftErrors = {}
  if (draft.accessMode === null) errors.accessMode = 'accessModeRequired'

  if (allowsPrice(draft.accessMode)) {
    if (draft.price.trim() === '') errors.price = 'priceRequired'
    else {
      const price = parsePrice(draft.price)
      if (price === null || price <= 0) errors.price = 'priceInvalid'
    }
  }

  if (draft.totalVacancies.trim() === '') errors.totalVacancies = 'vacanciesRequired'
  else {
    const vacancies = parseVacancies(draft.totalVacancies)
    if (vacancies === null || vacancies <= 0) errors.totalVacancies = 'vacanciesInvalid'
  }

  if (draft.opensAt.trim() === '') errors.opensAt = 'opensAtRequired'
  if (draft.closesAt.trim() === '') errors.closesAt = 'closesAtRequired'
  else if (draft.opensAt.trim() !== '' && draft.closesAt < draft.opensAt) {
    errors.closesAt = 'closesBeforeOpens'
  }

  if (!draft.hasNoRestrictions && draft.eligibility.trim() === '') {
    errors.eligibility = 'eligibilityRequired'
  }
  if (draft.contactMethod === null) errors.contactMethod = 'contactMethodRequired'
  return errors
}

export function triageErrors(draft: OpportunityDraft): DraftErrors {
  const errors: DraftErrors = {}
  const filled = draft.questions.filter((item) => item.label.trim() !== '')
  if (filled.length === 0) errors.questions = 'questionsRequired'
  if (draft.selectedDocumentIds.length === 0) errors.documents = 'documentsRequired'
  return errors
}

export function stepErrors(draft: OpportunityDraft, step: DraftStep): DraftErrors {
  if (step === 'DADOS') return basicsErrors(draft)
  if (step === 'ACESSO') return accessErrors(draft)
  return triageErrors(draft)
}

export function errorCount(errors: DraftErrors): number {
  return Object.keys(errors).length
}

/** A ordem dos campos na tela, para o primeiro erro ser o do campo de cima. */
const FIELD_ORDER: readonly DraftField[] = [
  'title',
  'serviceType',
  'audiences',
  'description',
  'specialtyId',
  'modality',
  'cep',
  'address',
  'accessMode',
  'price',
  'totalVacancies',
  'opensAt',
  'closesAt',
  'eligibility',
  'contactMethod',
  'questions',
  'documents',
]

function throwFirst(errors: DraftErrors): void {
  for (const field of FIELD_ORDER) {
    const code = errors[field]
    if (code !== undefined) throw new DraftError(code)
  }
}

export function validateBasics(draft: OpportunityDraft): void {
  throwFirst(basicsErrors(draft))
}

export function validateAccess(draft: OpportunityDraft): void {
  throwFirst(accessErrors(draft))
}

export function validateTriage(draft: OpportunityDraft): void {
  throwFirst(triageErrors(draft))
}

export function validateStep(draft: OpportunityDraft, step: DraftStep): void {
  throwFirst(stepErrors(draft, step))
}

/** Rascunho so precisa de titulo: e ele que identifica a linha na lista. */
export function canSaveAsDraft(draft: OpportunityDraft): boolean {
  return draft.title.trim() !== ''
}

/** So o formulario personalizado deixa mexer nas perguntas e documentos. */
export function canEditTriage(draft: OpportunityDraft): boolean {
  return draft.triageMode === 'PERSONALIZADO'
}

export function newQuestion(): TriageQuestion {
  return {
    id: `q-${crypto.randomUUID()}`,
    label: '',
    type: 'TEXTO_CURTO',
    isRequired: true,
    options: [],
  }
}

/** Trocar o tipo para longe da multipla escolha descarta as opcoes. */
export function withQuestionType(
  question: TriageQuestion,
  type: QuestionType,
): TriageQuestion {
  return { ...question, type, options: type === 'MULTIPLA' ? question.options : [] }
}

export function validateQuestion(question: TriageQuestion): void {
  if (question.label.trim() === '') throw new DraftError('questionLabelRequired')
  if (question.type === 'MULTIPLA') {
    const options = question.options.filter((item) => item.trim() !== '')
    if (options.length < MIN_OPTIONS) throw new DraftError('questionOptionsRequired')
  }
}

/** Grava a pergunta editada: troca a existente ou acrescenta a nova no fim. */
export function saveQuestion(
  draft: OpportunityDraft,
  question: TriageQuestion,
): OpportunityDraft {
  const cleaned: TriageQuestion = {
    ...question,
    label: question.label.trim(),
    options: question.options.map((item) => item.trim()).filter((item) => item !== ''),
  }
  const exists = draft.questions.some((item) => item.id === cleaned.id)
  return {
    ...draft,
    questions: exists
      ? draft.questions.map((item) => (item.id === cleaned.id ? cleaned : item))
      : [...draft.questions, cleaned],
  }
}

export function removeQuestion(
  draft: OpportunityDraft,
  id: string,
): OpportunityDraft {
  return { ...draft, questions: draft.questions.filter((item) => item.id !== id) }
}

export function toggleDocument(
  draft: OpportunityDraft,
  id: string,
): OpportunityDraft {
  const selected = draft.selectedDocumentIds.includes(id)
  return {
    ...draft,
    selectedDocumentIds: selected
      ? draft.selectedDocumentIds.filter((item) => item !== id)
      : [...draft.selectedDocumentIds, id],
  }
}

/** O documento novo ja nasce marcado: foi o profissional que pediu por ele. */
export function addDocument(draft: OpportunityDraft, label: string): OpportunityDraft {
  const name = label.trim()
  if (name === '') return draft
  const id = `doc-${crypto.randomUUID()}`
  return {
    ...draft,
    documents: [...draft.documents, { id, label: name, isCustom: true }],
    selectedDocumentIds: [...draft.selectedDocumentIds, id],
  }
}

export function removeDocument(
  draft: OpportunityDraft,
  id: string,
): OpportunityDraft {
  return {
    ...draft,
    documents: draft.documents.filter((item) => item.id !== id),
    selectedDocumentIds: draft.selectedDocumentIds.filter((item) => item !== id),
  }
}

export function selectedDocuments(
  draft: OpportunityDraft,
): readonly RequiredDocument[] {
  return draft.documents.filter((item) =>
    draft.selectedDocumentIds.includes(item.id),
  )
}

/**
 * Trocar para o formulario padrao devolve as perguntas originais: o que foi
 * escrito no personalizado nao vale para o padrao, e manter misturado
 * confundiria na hora de publicar.
 */
export function applyTriageMode(
  draft: OpportunityDraft,
  mode: TriageMode,
): OpportunityDraft {
  if (mode === draft.triageMode) return draft
  if (mode === 'PADRAO') {
    return { ...draft, triageMode: mode, questions: DEFAULT_QUESTIONS }
  }
  return { ...draft, triageMode: mode }
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

/** Trocar para online limpa CEP e endereco, que deixam de fazer sentido. */
export function applyModality(
  draft: OpportunityDraft,
  modality: CareModality,
): OpportunityDraft {
  const keeps = requiresAddress(modality)
  return {
    ...draft,
    modality,
    cep: keeps ? draft.cep : '',
    address: keeps ? draft.address : '',
  }
}

/** "Sem restricoes" dispensa o texto de criterios, entao ele some. */
export function applyNoRestrictions(
  draft: OpportunityDraft,
  hasNoRestrictions: boolean,
): OpportunityDraft {
  return {
    ...draft,
    hasNoRestrictions,
    eligibility: hasNoRestrictions ? '' : draft.eligibility,
  }
}
