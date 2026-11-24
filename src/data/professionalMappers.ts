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
  RESPONSE_DEADLINE_DAYS,
  type Agreement,
  type Decision,
  type ManagedOpportunity,
  type OpportunityTriage,
  type ReceivedRequest,
  type RequestDetail,
  type RequestMessage,
} from '@/domain/professional'
import {
  DEFAULT_QUESTIONS,
  DOCUMENT_CATALOG,
  QUESTION_TYPES,
  emptyOpportunityDraft,
  formatCep,
  parsePrice,
  parseVacancies,
  selectedDocuments,
  type OpportunityDraft,
  type QuestionType,
  type RequiredDocument,
  type TriageQuestion,
} from '@/domain/opportunityDraft'
import { fromWireEnum, toWireEnum } from '@/data/mappers'
import type {
  DecisaoRequestDTO,
  InscricaoDTO,
  MensagemDTO,
  OportunidadeDTO,
  OportunidadeRequestDTO,
  PerguntaDTO,
  TriagemDTO,
} from '@/data/professionalDto'

/** Pergunta do fio para o dominio. Tipo desconhecido vira texto curto. */
export function questionFromDTO(dto: PerguntaDTO): TriageQuestion {
  const type: QuestionType = QUESTION_TYPES.find((item) => item === dto.tipo) ?? 'TEXTO_CURTO'
  return {
    id: dto.id,
    label: dto.rotulo,
    type,
    isRequired: dto.obrigatoria,
    options: type === 'MULTIPLA' ? [...(dto.opcoes ?? [])] : [],
    ...(dto.permiteVarias !== undefined ? { allowsMultiple: dto.permiteVarias } : {}),
    ...(dto.minCaracteres !== undefined ? { minLength: dto.minCaracteres } : {}),
    ...(dto.maxCaracteres !== undefined ? { maxLength: dto.maxCaracteres } : {}),
    ...(dto.ajuda !== undefined ? { help: dto.ajuda } : {}),
    ...(dto.dependeDe !== undefined
      ? { dependsOn: { questionId: dto.dependeDe.perguntaId, answer: dto.dependeDe.resposta } }
      : {}),
  }
}

/**
 * Pergunta do dominio para o fio. Cada campo opcional so vai quando vale para
 * o tipo: opcoes e permiteVarias na multipla escolha, limites nas de texto.
 */
export function questionToDTO(question: TriageQuestion): PerguntaDTO {
  const isMultiple = question.type === 'MULTIPLA'
  const isText = question.type === 'TEXTO_CURTO' || question.type === 'TEXTO_LONGO'
  return {
    id: question.id,
    rotulo: question.label.trim(),
    tipo: question.type,
    obrigatoria: question.isRequired,
    ...(isMultiple ? { opcoes: [...question.options] } : {}),
    ...(isMultiple && question.allowsMultiple !== undefined
      ? { permiteVarias: question.allowsMultiple }
      : {}),
    ...(isText && question.minLength !== undefined ? { minCaracteres: question.minLength } : {}),
    ...(isText && question.maxLength !== undefined ? { maxCaracteres: question.maxLength } : {}),
    ...(question.help !== undefined && question.help !== '' ? { ajuda: question.help } : {}),
    ...(question.dependsOn !== undefined
      ? {
          dependeDe: {
            perguntaId: question.dependsOn.questionId,
            resposta: question.dependsOn.answer,
          },
        }
      : {}),
  }
}

/** Sem triagem salva, a oportunidade usa o formulario padrao com RG. */
export function triageFromDTO(dto: TriagemDTO | null): OpportunityTriage {
  if (dto === null) {
    return { mode: 'PADRAO', questions: DEFAULT_QUESTIONS, documents: [{ id: 'rg', label: 'RG' }] }
  }
  return {
    mode: dto.modo === 'PERSONALIZADO' ? 'PERSONALIZADO' : 'PADRAO',
    questions: dto.perguntas.map(questionFromDTO),
    documents: dto.documentosExigidos.map((item) => ({ id: item.id, label: item.rotulo })),
  }
}

export function managedOpportunityFromDTO(dto: OportunidadeDTO): ManagedOpportunity {
  return {
    id: dto.id,
    title: dto.titulo,
    description: dto.descricao ?? '',
    serviceType: serviceTypeFrom(fromWireEnum(dto.tipoServico)),
    audiences: audiencesFrom((dto.publicoAlvo ?? []).map(fromWireEnum)),
    specialtyId: dto.especialidade ?? '',
    accessMode: accessModeFrom(fromWireEnum(dto.modalidadeAcesso)),
    price: dto.preco,
    filledVacancies: dto.vagasPreenchidas,
    totalVacancies: dto.vagasTotais ?? 0,
    applicationCount: dto.totalInscricoes ?? 0,
    status: opportunityStatusFrom(dto.status),
    modality: careModalityFrom(fromWireEnum(dto.modalidade)),
    cep: dto.cep,
    address: dto.endereco,
    opensAt: dto.inscricoesDe,
    closesAt: dto.inscricoesAte,
    eligibility: dto.criteriosElegibilidade ?? '',
    hasNoRestrictions: dto.semRestricoes,
    contactMethod: contactMethodFrom(fromWireEnum(dto.formaContato)),
    updatedAt: dto.ultimaAtualizacao,
    city: dto.cidade,
    state: dto.uf,
    audienceNote: dto.publicoAlvoObservacao,
    responseDays: dto.prazoRespostaDias ?? RESPONSE_DEADLINE_DAYS,
    triage: triageFromDTO(dto.triagem),
  }
}

const textOrNull = (value: string) => (value.trim() === '' ? null : value.trim())

/**
 * `status` separa publicar de guardar rascunho. No rascunho os campos podem
 * estar pela metade, entao o que falta vai nulo e nada aqui presume que a
 * validacao ja passou.
 */
export function draftToDTO(
  draft: OpportunityDraft,
  status: 'ATIVA' | 'RASCUNHO' = 'ATIVA',
): OportunidadeRequestDTO {
  const hasAddress = requiresAddress(draft.modality)
  return {
    titulo: draft.title.trim(),
    descricao: textOrNull(draft.description),
    tipoServico: draft.serviceType === null ? null : toWireEnum(draft.serviceType),
    especialidade: draft.specialtyId,
    modalidade: draft.modality === null ? null : toWireEnum(draft.modality),
    modalidadeAcesso: draft.accessMode === null ? null : toWireEnum(draft.accessMode),
    preco: allowsPrice(draft.accessMode) && draft.price.trim() !== '' ? parsePrice(draft.price) : null,
    publicoAlvo: draft.audiences.map(toWireEnum),
    publicoAlvoObservacao: draft.audienceNote,
    vagasTotais: draft.totalVacancies.trim() === '' ? null : parseVacancies(draft.totalVacancies),
    cep: hasAddress ? textOrNull(formatCep(draft.cep)) : null,
    endereco: hasAddress ? textOrNull(draft.address) : null,
    cidade: draft.city,
    uf: draft.state,
    inscricoesDe: textOrNull(draft.opensAt),
    inscricoesAte: textOrNull(draft.closesAt),
    criteriosElegibilidade: draft.hasNoRestrictions ? null : textOrNull(draft.eligibility),
    semRestricoes: draft.hasNoRestrictions,
    formaContato: draft.contactMethod === null ? null : toWireEnum(draft.contactMethod),
    prazoRespostaDias: draft.responseDays,
    status,
    triagem: {
      modo: draft.triageMode,
      perguntas: draft.questions
        .filter((item) => item.label.trim() !== '')
        .map(questionToDTO),
      documentosExigidos: selectedDocuments(draft).map((item) => ({
        id: item.id,
        rotulo: item.label.trim(),
      })),
    },
  }
}

/**
 * Carrega uma oportunidade no formulario de edicao, com a triagem salva. Os
 * documentos exigidos fora do catalogo voltam como escritos pelo
 * profissional.
 */
export function draftFromManagedOpportunity(item: ManagedOpportunity): OpportunityDraft {
  const catalogIds = new Set(DOCUMENT_CATALOG.map((document) => document.id))
  const custom: RequiredDocument[] = item.triage.documents
    .filter((document) => !catalogIds.has(document.id))
    .map((document) => ({ id: document.id, label: document.label, isCustom: true }))
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
    triageMode: item.triage.mode,
    questions: item.triage.mode === 'PADRAO' ? DEFAULT_QUESTIONS : item.triage.questions,
    documents: [...DOCUMENT_CATALOG, ...custom],
    selectedDocumentIds: item.triage.documents.map((document) => document.id),
    city: item.city,
    state: item.state,
    audienceNote: item.audienceNote,
    responseDays: item.responseDays,
  }
}

export function requestMessageFromDTO(dto: MensagemDTO): RequestMessage {
  return {
    id: dto.id,
    author: dto.autor === 'PROFISSIONAL_SAUDE' ? 'PROFISSIONAL' : 'PACIENTE',
    authorName: dto.nomeAutor,
    text: dto.texto,
    sentAt: dto.enviadaEm,
  }
}

export function receivedRequestFromDTO(dto: InscricaoDTO): ReceivedRequest {
  return {
    id: dto.id,
    protocol: dto.protocolo,
    patientName: dto.paciente.nome,
    opportunityId: dto.oportunidade.id,
    opportunityTitle: dto.oportunidade.titulo,
    receivedAt: dto.dataInscricao,
    deadline: dto.prazoResposta,
    status: requestStatusFrom(dto.status),
    hasUnreadMessage: dto.mensagensNaoLidas > 0,
    canMessage: dto.podeTrocarMensagens,
  }
}

export function requestDetailFromDTO(dto: InscricaoDTO): RequestDetail {
  return {
    ...receivedRequestFromDTO(dto),
    decidedAt: dto.decididaEm,
    decisionReason: dto.motivoDecisao,
    infoRequest:
      dto.pedidoInformacao === null
        ? null
        : { text: dto.pedidoInformacao.texto, deadline: dto.pedidoInformacao.prazo },
    agreement:
      dto.combinado === null
        ? null
        : { when: dto.combinado.quando, where: dto.combinado.onde, bring: dto.combinado.levar },
    triage: dto.respostasTriagem.map((item) => ({
      questionId: item.perguntaId,
      question: item.pergunta,
      answer: item.resposta,
    })),
    documents: dto.documentos.map((item) => ({
      id: item.id,
      documentId: item.documentoId,
      name: item.nomeArquivo,
      sizeKb: Math.round(item.tamanhoBytes / 1024),
      sentAt: item.enviadoEm,
    })),
    messages: (dto.mensagens ?? []).map(requestMessageFromDTO),
  }
}

/** Aprovar leva o combinado; recusar leva o motivo, que o paciente le. */
export function decisionToDTO(
  status: Decision,
  options: { reason?: string; agreement?: Agreement } = {},
): DecisaoRequestDTO {
  if (status === 'RECUSADA') {
    return { status, motivo: options.reason?.trim() ?? '', combinado: null }
  }
  const agreement = options.agreement
  return {
    status,
    motivo: null,
    combinado:
      agreement === undefined
        ? { quando: 'A combinar', onde: 'A combinar', levar: '' }
        : { quando: agreement.when, onde: agreement.where, levar: agreement.bring },
  }
}
