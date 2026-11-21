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
  defaultAgreement,
  documentKind,
  documentSize,
  filterRequests,
  isDecided,
  isFromProfessional,
  isFull,
  isOverdue,
  isValidReason,
  messageTime,
  OPPORTUNITY_STATUS_LABEL,
  OPPORTUNITY_STATUS_TONE,
  opportunityStatusFrom,
  relativeDay,
  remainingVacancies,
  REQUEST_FILTER_LABEL,
  REQUEST_FILTERS,
  REQUEST_STATUSES,
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
  it.each(REQUEST_STATUSES)('mantem %s', (status) => {
    expect(requestStatusFrom(status)).toBe(status)
  })

  it('sao os 6 estados do contrato, na ordem do fluxo', () => {
    expect(REQUEST_STATUSES).toEqual([
      'RECEBIDA',
      'EM_ANALISE',
      'AGUARDANDO_INFORMACOES',
      'APROVADA',
      'RECUSADA',
      'CANCELADA',
    ])
  })

  it.each(['ARQUIVADA', 'NOVA', 'AGUARDANDO_INFO', ''])(
    'valor desconhecido %s cai em recebida',
    (raw) => {
      expect(requestStatusFrom(raw)).toBe('RECEBIDA')
    },
  )

  it('aprovada, recusada e cancelada encerram o pedido', () => {
    expect(isDecided('APROVADA')).toBe(true)
    expect(isDecided('RECUSADA')).toBe(true)
    expect(isDecided('CANCELADA')).toBe(true)
    expect(isDecided('EM_ANALISE')).toBe(false)
    expect(isDecided('RECEBIDA')).toBe(false)
    expect(isDecided('AGUARDANDO_INFORMACOES')).toBe(false)
  })

  it('a decisao so pode ser aprovar ou recusar', () => {
    expect(DECIDABLE_STATUSES).toEqual(['APROVADA', 'RECUSADA'])
  })

  it('todo status tem rotulo', () => {
    for (const status of REQUEST_STATUSES) {
      expect(REQUEST_STATUS_LABEL[status]).not.toBe('')
    }
  })

  it('recebida e cancelada tem rotulo e tom neutro', () => {
    expect(REQUEST_STATUS_LABEL.RECEBIDA).toBe('Recebida')
    expect(REQUEST_STATUS_LABEL.CANCELADA).toBe('Cancelada')
    expect(REQUEST_STATUS_TONE.RECEBIDA).toBe('neutral')
    expect(REQUEST_STATUS_TONE.CANCELADA).toBe('neutral')
  })
})

describe('Atrasada', () => {
  const now = new Date('2026-11-20T12:00:00Z')
  const late = { deadline: '2026-11-19T09:12:00Z' }

  it.each(['RECEBIDA', 'EM_ANALISE'] as const)('%s depois do prazo esta atrasada', (status) => {
    expect(isOverdue({ ...late, status }, now)).toBe(true)
  })

  it.each(['AGUARDANDO_INFORMACOES', 'APROVADA', 'RECUSADA', 'CANCELADA'] as const)(
    '%s nao fica atrasada',
    (status) => {
      expect(isOverdue({ ...late, status }, now)).toBe(false)
    },
  )

  it('dentro do prazo, ou sem prazo, nao esta atrasada', () => {
    expect(isOverdue({ status: 'RECEBIDA', deadline: '2026-11-21T00:00:00Z' }, now)).toBe(false)
    expect(isOverdue({ status: 'RECEBIDA', deadline: null }, now)).toBe(false)
    expect(isOverdue({ status: 'RECEBIDA', deadline: 'sem data' }, now)).toBe(false)
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
    ['RECEBIDA', 0],
    ['CANCELADA', 0],
  ] as const)('filtro %s conta %i', (filter, expected) => {
    expect(countByFilter(items, filter)).toBe(expected)
  })

  it('o filtro nao altera a lista original', () => {
    filterRequests(items, 'APROVADA')
    expect(items).toHaveLength(4)
  })

  it('filtro sem resultado devolve lista vazia, nao a lista toda', () => {
    expect(filterRequests(items, 'RECEBIDA')).toEqual([])
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
        authorName: 'Marcos Vieira',
        text: 'oi',
        sentAt: '2026-10-21T12:46:00Z',
      }),
    ).toBe(true)
    expect(
      isFromProfessional({
        id: '2',
        author: 'PACIENTE',
        authorName: 'Ana Souza',
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
    expect(requestStatusFrom('AGUARDANDO_INFORMACOES')).toBe('AGUARDANDO_INFORMACOES')
    expect(REQUEST_STATUS_LABEL.AGUARDANDO_INFORMACOES).toBe('Aguardando informações')
  })

  it('aguardando informacoes ainda nao e uma decisao', () => {
    expect(isDecided('AGUARDANDO_INFORMACOES')).toBe(false)
  })

  it('cada status tem o tom do selo', () => {
    expect(REQUEST_STATUS_TONE.APROVADA).toBe('success')
    expect(REQUEST_STATUS_TONE.EM_ANALISE).toBe('warning')
    expect(REQUEST_STATUS_TONE.RECUSADA).toBe('danger')
    expect(OPPORTUNITY_STATUS_TONE.RASCUNHO).toBe('warning')
    expect(OPPORTUNITY_STATUS_TONE.ENCERRADA).toBe('neutral')
  })

  it('cada estado tem filtro proprio, alem de Todas', () => {
    const items = [
      makeReceivedRequest({ id: '1', status: 'AGUARDANDO_INFORMACOES' }),
      makeReceivedRequest({ id: '2', status: 'APROVADA' }),
      makeReceivedRequest({ id: '3', status: 'CANCELADA' }),
    ]
    expect(filterRequests(items, 'TODAS')).toHaveLength(3)
    expect(filterRequests(items, 'AGUARDANDO_INFORMACOES').map((i) => i.id)).toEqual(['1'])
    expect(filterRequests(items, 'CANCELADA').map((i) => i.id)).toEqual(['3'])
    expect(REQUEST_FILTERS).toEqual(['TODAS', ...REQUEST_STATUSES])
    for (const filter of REQUEST_FILTERS) expect(REQUEST_FILTER_LABEL[filter]).not.toBe('')
  })

  it('mensagens so depois da aprovacao', () => {
    expect(canExchangeMessages('APROVADA')).toBe(true)
    expect(canExchangeMessages('EM_ANALISE')).toBe(false)
    expect(canExchangeMessages('RECUSADA')).toBe(false)
    expect(canExchangeMessages('CANCELADA')).toBe(false)
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

  it('o prazo segue os dias da oportunidade quando ela diz outro', () => {
    expect(shortDate(responseDeadline('2026-11-10T09:12:00Z', 5))).toBe('15/11')
  })

  it('data invalida nao gera prazo nem texto', () => {
    expect(responseDeadline('nao e data')).toBeNull()
    expect(shortDate('nao e data')).toBe('')
    expect(shortDate(null)).toBe('')
  })
})

describe('Documento enviado', () => {
  const document = { id: 'd1', documentId: 'rg', name: 'RG_frente.jpg', sizeKb: 420, sentAt: null }

  it('o tipo vem da extensao', () => {
    expect(documentKind(document)).toBe('JPG')
    expect(documentKind({ ...document, name: 'sem-extensao' })).toBe('')
  })

  it('o tamanho sai em KB ate 1 MB e em MB dali em diante', () => {
    expect(documentSize(document)).toBe('420 KB')
    expect(documentSize({ ...document, sizeKb: 1229 })).toBe('1,2 MB')
  })
})

describe('Combinado na aprovacao', () => {
  it('presencial combina no endereco e leva os documentos exigidos', () => {
    expect(defaultAgreement(makeManagedOpportunity())).toEqual({
      when: 'A combinar',
      where: 'Rua das Flores, 120',
      bring: 'RG, Encaminhamento médico',
    })
  })

  it('online combina pela modalidade', () => {
    const online = makeManagedOpportunity({ modality: 'online', address: null })
    expect(defaultAgreement(online).where).toBe('Online')
  })

  it('presencial sem endereco cai na modalidade', () => {
    const noAddress = makeManagedOpportunity({ address: '  ' })
    expect(defaultAgreement(noAddress).where).toBe('Presencial')
  })

  it('sem a oportunidade carregada tudo fica a combinar', () => {
    expect(defaultAgreement(null)).toEqual({ when: 'A combinar', where: 'A combinar', bring: '' })
  })
})
