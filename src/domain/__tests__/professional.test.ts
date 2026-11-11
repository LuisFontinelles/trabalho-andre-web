import { describe, expect, it } from 'vitest'
import {
  ACCESS_MODE_LABEL,
  ACCESS_MODES,
  accessModeFrom,
  allowsPrice,
  audiencesFrom,
  canClose,
  canDelete,
  canEdit,
  canExchangeMessages,
  careModalityFrom,
  contactMethodFrom,
  countByFilter,
  DECIDABLE_STATUSES,
  documentKind,
  documentSize,
  filterRequests,
  isDecided,
  isFromProfessional,
  isFull,
  isValidReason,
  messageTime,
  OPPORTUNITY_STATUS_LABEL,
  OPPORTUNITY_STATUS_TONE,
  opportunityStatusFrom,
  relativeDay,
  remainingVacancies,
  REQUEST_FILTERS,
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_TONE,
  requestStatusFrom,
  requiresAddress,
  RESPONSE_DEADLINE_DAYS,
  responseDeadline,
  serviceTypeFrom,
  shortDate,
  summarize,
  vacancySummary,
} from '@/domain/professional'
import { makeManagedOpportunity, makeReceivedRequest } from '@/test/factories'

describe('Status da oportunidade', () => {
  it.each(['ATIVA', 'ENCERRADA', 'RASCUNHO'] as const)('mantem %s', (status) => {
    expect(opportunityStatusFrom(status)).toBe(status)
  })

  it('status desconhecido cai em rascunho, nunca em ativa', () => {
    expect(opportunityStatusFrom('PAUSADA')).toBe('RASCUNHO')
    expect(opportunityStatusFrom('')).toBe('RASCUNHO')
  })

  it('todo status tem rotulo', () => {
    for (const status of ['ATIVA', 'ENCERRADA', 'RASCUNHO'] as const) {
      expect(OPPORTUNITY_STATUS_LABEL[status]).not.toBe('')
    }
  })
})

describe('Modalidade de acesso', () => {
  it.each(['gratuito', 'preco-social', 'pesquisa'] as const)('mantem %s', (mode) => {
    expect(accessModeFrom(mode)).toBe(mode)
  })

  it('modalidade desconhecida cai em gratuito', () => {
    expect(accessModeFrom('permuta')).toBe('gratuito')
  })

  it('so preco social admite valor', () => {
    expect(allowsPrice('preco-social')).toBe(true)
    expect(allowsPrice('gratuito')).toBe(false)
    expect(allowsPrice('pesquisa')).toBe(false)
  })

  it('toda modalidade tem rotulo', () => {
    for (const mode of ['gratuito', 'preco-social', 'pesquisa'] as const) {
      expect(ACCESS_MODE_LABEL[mode]).not.toBe('')
    }
  })
})

describe('Vagas', () => {
  it('resume no formato do prototipo', () => {
    const item = makeManagedOpportunity({ filledVacancies: 3, totalVacancies: 5 })
    expect(vacancySummary(item)).toBe('3 de 5')
  })

  it('calcula o que sobra', () => {
    expect(
      remainingVacancies(makeManagedOpportunity({ filledVacancies: 3, totalVacancies: 5 })),
    ).toBe(2)
  })

  it('preenchida alem do total nao devolve numero negativo', () => {
    const item = makeManagedOpportunity({ filledVacancies: 8, totalVacancies: 5 })
    expect(remainingVacancies(item)).toBe(0)
    expect(isFull(item)).toBe(true)
  })

  it('lotada quando preenche o total', () => {
    expect(isFull(makeManagedOpportunity({ filledVacancies: 6, totalVacancies: 6 }))).toBe(
      true,
    )
    expect(isFull(makeManagedOpportunity({ filledVacancies: 5, totalVacancies: 6 }))).toBe(
      false,
    )
  })
})

describe('Acoes permitidas por status', () => {
  it('ativa pode editar e encerrar, mas nao excluir', () => {
    const item = makeManagedOpportunity({ status: 'ATIVA' })
    expect(canEdit(item)).toBe(true)
    expect(canClose(item)).toBe(true)
    expect(canDelete(item)).toBe(false)
  })

  it('rascunho edita e exclui, mas nao encerra', () => {
    const item = makeManagedOpportunity({ status: 'RASCUNHO' })
    expect(canEdit(item)).toBe(true)
    expect(canClose(item)).toBe(false)
    expect(canDelete(item)).toBe(true)
  })

  it('encerrada nao tem mais acao: fica no historico', () => {
    const item = makeManagedOpportunity({ status: 'ENCERRADA' })
    expect(canEdit(item)).toBe(false)
    expect(canClose(item)).toBe(false)
    expect(canDelete(item)).toBe(false)
  })
})

describe('Resumo do painel', () => {
  it('conta so as ativas e soma todas as solicitacoes', () => {
    const items = [
      makeManagedOpportunity({ id: '1', status: 'ATIVA', applicationCount: 4 }),
      makeManagedOpportunity({ id: '2', status: 'ENCERRADA', applicationCount: 9 }),
      makeManagedOpportunity({ id: '3', status: 'RASCUNHO', applicationCount: 0 }),
      makeManagedOpportunity({ id: '4', status: 'ATIVA', applicationCount: 1 }),
    ]
    const summary = summarize(items, 5)
    expect(summary.activeCount).toBe(2)
    expect(summary.requestCount).toBe(14)
    expect(summary.acceptedCount).toBe(5)
  })

  it('lista vazia zera tudo', () => {
    expect(summarize([], 0)).toEqual({
      activeCount: 0,
      requestCount: 0,
      acceptedCount: 0,
    })
  })
})

describe('Status da solicitacao', () => {
  it.each(['EM_ANALISE', 'APROVADA', 'RECUSADA'] as const)('mantem %s', (status) => {
    expect(requestStatusFrom(status)).toBe(status)
  })

  it('status desconhecido cai em nova', () => {
    expect(requestStatusFrom('ARQUIVADA')).toBe('NOVA')
  })

  it('aprovada e recusada contam como decididas', () => {
    expect(isDecided('APROVADA')).toBe(true)
    expect(isDecided('RECUSADA')).toBe(true)
    expect(isDecided('EM_ANALISE')).toBe(false)
    expect(isDecided('NOVA')).toBe(false)
  })

  it('a tela de decisao nao oferece "nova" como escolha', () => {
    expect(DECIDABLE_STATUSES).not.toContain('NOVA')
    expect(DECIDABLE_STATUSES).toHaveLength(3)
  })

  it('todo status tem rotulo', () => {
    for (const status of ['NOVA', 'EM_ANALISE', 'APROVADA', 'RECUSADA'] as const) {
      expect(REQUEST_STATUS_LABEL[status]).not.toBe('')
    }
  })
})

describe('Filtro de solicitacoes', () => {
  const items = [
    makeReceivedRequest({ id: 'a', status: 'APROVADA' }),
    makeReceivedRequest({ id: 'b', status: 'EM_ANALISE' }),
    makeReceivedRequest({ id: 'c', status: 'APROVADA' }),
    makeReceivedRequest({ id: 'd', status: 'RECUSADA' }),
  ]

  it('todas devolve a lista inteira', () => {
    expect(filterRequests(items, 'TODAS')).toHaveLength(4)
    expect(countByFilter(items, 'TODAS')).toBe(4)
  })

  it.each([
    ['APROVADA', 2],
    ['EM_ANALISE', 1],
    ['RECUSADA', 1],
    ['NOVA', 0],
  ] as const)('filtro %s conta %i', (filter, expected) => {
    expect(countByFilter(items, filter)).toBe(expected)
  })

  it('o filtro nao altera a lista original', () => {
    filterRequests(items, 'APROVADA')
    expect(items).toHaveLength(4)
  })

  it('filtro sem resultado devolve lista vazia, nao a lista toda', () => {
    expect(filterRequests(items, 'NOVA')).toEqual([])
  })
})

describe('Tempo relativo', () => {
  const now = new Date('2026-10-21T12:00:00Z')

  it('hoje', () => {
    expect(relativeDay('2026-10-21T09:12:00Z', now)).toBe('Hoje')
  })

  it('ontem', () => {
    expect(relativeDay('2026-10-20T23:40:00Z', now)).toBe('Ontem')
  })

  it.each([
    ['2026-10-19T11:05:00Z', 'Há 2 dias'],
    ['2026-10-18T16:20:00Z', 'Há 3 dias'],
    ['2026-10-01T10:00:00Z', 'Há 20 dias'],
  ])('%s vira %s', (iso, expected) => {
    expect(relativeDay(iso, now)).toBe(expected)
  })

  it('data no futuro nao vira numero negativo', () => {
    expect(relativeDay('2026-10-25T10:00:00Z', now)).toBe('Hoje')
  })

  it('data invalida devolve string vazia em vez de quebrar', () => {
    expect(relativeDay('nao-e-data', now)).toBe('')
  })
})

describe('Mensagens', () => {
  it('reconhece quem escreveu', () => {
    expect(
      isFromProfessional({
        id: '1',
        author: 'PROFISSIONAL',
        text: 'oi',
        sentAt: '2026-10-21T12:46:00Z',
      }),
    ).toBe(true)
    expect(
      isFromProfessional({
        id: '2',
        author: 'PACIENTE',
        text: 'oi',
        sentAt: '2026-10-21T12:45:00Z',
      }),
    ).toBe(false)
  })

  it('formata a hora em 24h', () => {
    expect(messageTime('2026-10-21T12:45:00Z')).toBe('12:45')
    expect(messageTime('2026-10-21T09:05:00Z')).toBe('09:05')
  })

  it('data invalida devolve string vazia', () => {
    expect(messageTime('qualquer coisa')).toBe('')
  })
})

describe('Modalidade de acesso e atendimento', () => {
  it('as quatro modalidades saem na ordem dos cards', () => {
    expect(ACCESS_MODES).toEqual(['gratuito', 'sus', 'preco-social', 'pesquisa'])
  })

  it('SUS e reconhecido, e valor desconhecido cai em gratuito', () => {
    expect(accessModeFrom('sus')).toBe('sus')
    expect(accessModeFrom('outro')).toBe('gratuito')
  })

  it('so o preco social admite valor', () => {
    expect(allowsPrice('preco-social')).toBe(true)
    expect(allowsPrice('sus')).toBe(false)
    expect(allowsPrice(null)).toBe(false)
  })

  it.each([
    ['presencial', true],
    ['hibrido', true],
    ['online', false],
  ] as const)('atendimento %s pede endereco: %s', (modality, expected) => {
    expect(requiresAddress(modality)).toBe(expected)
  })

  it('sem atendimento escolhido ainda nao pede endereco', () => {
    expect(requiresAddress(null)).toBe(false)
  })

  it('hibrido e reconhecido, e valor desconhecido cai em presencial', () => {
    expect(careModalityFrom('hibrido')).toBe('hibrido')
    expect(careModalityFrom('qualquer')).toBe('presencial')
  })

  it('tipo de servico, publico e contato desconhecidos sao descartados', () => {
    expect(serviceTypeFrom('exame')).toBe('exame')
    expect(serviceTypeFrom('cirurgia')).toBeNull()
    expect(serviceTypeFrom(null)).toBeNull()
    expect(audiencesFrom(['idosos', 'marcianos', 'adultos'])).toEqual(['adultos', 'idosos'])
    expect(audiencesFrom(undefined)).toEqual([])
    expect(contactMethodFrom('telefone')).toBe('telefone')
    expect(contactMethodFrom('fax')).toBeNull()
  })
})

describe('Status da solicitacao', () => {
  it('aguardando informacoes e um status proprio', () => {
    expect(requestStatusFrom('AGUARDANDO_INFO')).toBe('AGUARDANDO_INFO')
    expect(REQUEST_STATUS_LABEL.AGUARDANDO_INFO).toBe('Aguardando informações')
  })

  it('aguardando informacoes ainda nao e uma decisao', () => {
    expect(isDecided('AGUARDANDO_INFO')).toBe(false)
  })

  it('cada status tem o tom do selo', () => {
    expect(REQUEST_STATUS_TONE.APROVADA).toBe('success')
    expect(REQUEST_STATUS_TONE.EM_ANALISE).toBe('warning')
    expect(REQUEST_STATUS_TONE.RECUSADA).toBe('danger')
    expect(OPPORTUNITY_STATUS_TONE.RASCUNHO).toBe('warning')
    expect(OPPORTUNITY_STATUS_TONE.ENCERRADA).toBe('neutral')
  })

  it('quem aguarda informacoes aparece em Todas, sem filtro proprio', () => {
    const items = [
      makeReceivedRequest({ id: '1', status: 'AGUARDANDO_INFO' }),
      makeReceivedRequest({ id: '2', status: 'APROVADA' }),
    ]
    expect(filterRequests(items, 'TODAS')).toHaveLength(2)
    expect(REQUEST_FILTERS).not.toContain('AGUARDANDO_INFO')
  })

  it('mensagens so depois da aprovacao', () => {
    expect(canExchangeMessages('APROVADA')).toBe(true)
    expect(canExchangeMessages('EM_ANALISE')).toBe(false)
    expect(canExchangeMessages('RECUSADA')).toBe(false)
  })
})

describe('Decisao', () => {
  it('o motivo da recusa precisa de pelo menos 10 caracteres', () => {
    expect(isValidReason('   curto   ')).toBe(false)
    expect(isValidReason('Vagas so para moradores de Ceilandia.')).toBe(true)
  })

  it('o prazo de resposta e de 15 dias a partir do recebimento', () => {
    expect(RESPONSE_DEADLINE_DAYS).toBe(15)
    expect(shortDate(responseDeadline('2026-11-10T09:12:00Z'))).toBe('25/11')
  })

  it('data invalida nao gera prazo nem texto', () => {
    expect(responseDeadline('nao e data')).toBeNull()
    expect(shortDate('nao e data')).toBe('')
    expect(shortDate(null)).toBe('')
  })
})

describe('Documento enviado', () => {
  const document = { id: 'd1', name: 'RG_frente.jpg', sizeKb: 420, sentAt: null }

  it('o tipo vem da extensao', () => {
    expect(documentKind(document)).toBe('JPG')
    expect(documentKind({ ...document, name: 'sem-extensao' })).toBe('')
  })

  it('o tamanho sai em KB ate 1 MB e em MB dali em diante', () => {
    expect(documentSize(document)).toBe('420 KB')
    expect(documentSize({ ...document, sizeKb: 1229 })).toBe('1,2 MB')
  })
})
