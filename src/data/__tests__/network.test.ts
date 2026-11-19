import { describe, expect, it, vi } from 'vitest'
import {
  NetworkError,
  buildUrl,
  createHttpClient,
  kindForStatus,
} from '@/data/network/httpClient'
import {
  BASE_URL,
  EXPIRED_TOKEN,
  authorizationLog,
  createMockFetch,
  loadFixture,
  matchTestAccount,
  matchesPattern,
  mockRoutes,
  rebaseRequests,
  rebaseToToday,
  requestLog,
} from '@/data/network/mockBackend'
import type { InscricaoDTO } from '@/data/professionalDto'
import { relativeDay } from '@/domain/professional'

const client = (token: string | null = null, onUnauthorized?: () => void) =>
  createHttpClient(BASE_URL, createMockFetch({ latency: false }), {
    getToken: () => token,
    onUnauthorized,
  })

describe('Montagem da requisicao', () => {
  it('caminho sem prefixo /v1, direto na raiz', () => {
    expect(BASE_URL).toBe('https://api.carebridge.local')
    expect(buildUrl(BASE_URL, { path: 'oportunidades' })).toBe(
      'https://api.carebridge.local/oportunidades',
    )
  })

  it('query vai ordenada por chave, para a URL ser estavel', () => {
    const url = buildUrl(BASE_URL, {
      path: 'oportunidades',
      query: { page: '0', q: 'psico', modalidade: 'ONLINE' },
    })
    expect(url).toBe('https://api.carebridge.local/oportunidades?modalidade=ONLINE&page=0&q=psico')
  })

  it('rota autenticada leva Authorization: Bearer com o token da sessao', async () => {
    await client('mock.profissional@teste.com').send({
      path: 'profissional-saude/oportunidades',
      authenticated: true,
    })
    expect(authorizationLog.at(-1)).toBe('Bearer mock.profissional@teste.com')
  })

  it('rota publica nao leva o token, mesmo com sessao', async () => {
    await client('mock.profissional@teste.com').send({ path: 'catalogos' })
    expect(authorizationLog.at(-1)).toBeNull()
  })

  it('sem token guardado a rota autenticada sai sem o cabecalho e recebe 401', async () => {
    await expect(
      client(null).send({ path: 'profissional-saude/oportunidades', authenticated: true }),
    ).rejects.toMatchObject({ kind: 'unauthorized', status: 401 })
    expect(authorizationLog.at(-1)).toBeNull()
  })

  it('401 numa rota autenticada avisa que a sessao venceu', async () => {
    const expired = vi.fn()
    await expect(
      client(EXPIRED_TOKEN, expired).send({ path: 'profissional-saude/inscricoes', authenticated: true }),
    ).rejects.toMatchObject({ kind: 'unauthorized' })
    expect(expired).toHaveBeenCalledTimes(1)
  })

  it('401 do login (senha errada) nao derruba a sessao', async () => {
    const expired = vi.fn()
    await expect(
      client(null, expired).send({
        path: 'user/login',
        method: 'POST',
        body: { email: 'ninguem@teste.com', password: 'x' },
      }),
    ).rejects.toMatchObject({ kind: 'unauthorized' })
    expect(expired).not.toHaveBeenCalled()
  })

  it('cabecalho explicito vence o token guardado', async () => {
    await client('mock.paciente@teste.com').send({
      path: 'user/me',
      headers: { Authorization: 'Bearer mock.profissional@teste.com' },
      authenticated: true,
    })
    expect(authorizationLog.at(-1)).toBe('Bearer mock.profissional@teste.com')
  })
})

describe('Casamento de rotas', () => {
  it('caminho identico casa', () => {
    expect(matchesPattern('/oportunidades', '/oportunidades')).toBe(true)
  })

  it('curinga casa qualquer identificador', () => {
    expect(matchesPattern('/oportunidades/{id}', '/oportunidades/op-004')).toBe(true)
    expect(
      matchesPattern('/profissional-saude/inscricoes/{id}/decisao', '/profissional-saude/inscricoes/req-1/decisao'),
    ).toBe(true)
  })

  it('numero de segmentos diferente nao casa', () => {
    expect(matchesPattern('/oportunidades/{id}', '/oportunidades')).toBe(false)
    expect(matchesPattern('/oportunidades', '/oportunidades/op-004')).toBe(false)
  })

  it('segmento fixo diferente nao casa', () => {
    expect(matchesPattern('/catalogos', '/oportunidades')).toBe(false)
  })

  it('nenhuma rota do simulado usa o prefixo antigo /v1', () => {
    expect(mockRoutes.some((route) => route.pattern.startsWith('/v1'))).toBe(false)
  })
})

describe('Status de erro da API', () => {
  it.each([
    [400, 'badRequest'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'notFound'],
    [409, 'conflict'],
    [429, 'tooManyAttempts'],
    [500, 'server'],
    [503, 'server'],
  ] as const)('%i vira %s', (status, kind) => {
    expect(kindForStatus(status)).toBe(kind)
  })

  it('204 vira noContent quando o chamador espera um objeto', async () => {
    await expect(client().send({ path: 'debug/no-content' })).rejects.toMatchObject({
      kind: 'noContent',
    })
  })

  it('204 passa limpo quando o chamador nao espera corpo', async () => {
    await expect(client().sendVoid({ path: 'debug/no-content' })).resolves.toBeUndefined()
  })

  it('204 vira null quando o corpo e opcional', async () => {
    await expect(client().sendOptional({ path: 'debug/no-content' })).resolves.toBeNull()
  })

  it('o corpo de erro tem status e message, mais os campos do Spring', async () => {
    try {
      await client().send({ path: 'debug/bad-request' })
      expect.unreachable('deveria ter lancado')
    } catch (error) {
      const failure = error as NetworkError
      expect(failure.kind).toBe('badRequest')
      expect(failure.status).toBe(400)
      expect(failure.apiMessage).toBe('Parâmetro inválido.')
      expect(failure.api).toMatchObject({
        status: 400,
        message: 'Parâmetro inválido.',
        error: 'Bad Request',
        path: '/debug/bad-request',
      })
      expect(typeof failure.api?.timestamp).toBe('string')
    }
  })

  it('401 e 403 sao coisas diferentes', async () => {
    await expect(client().send({ path: 'debug/unauthorized' })).rejects.toMatchObject({
      kind: 'unauthorized',
      status: 401,
    })
    await expect(client().send({ path: 'debug/forbidden' })).rejects.toMatchObject({
      kind: 'forbidden',
      status: 403,
      apiMessage: 'Sem permissão.',
    })
  })

  it('409 vira conflict e 429 vira tooManyAttempts', async () => {
    await expect(client().send({ path: 'debug/conflict' })).rejects.toMatchObject({ kind: 'conflict' })
    await expect(client().send({ path: 'debug/too-many' })).rejects.toMatchObject({
      kind: 'tooManyAttempts',
    })
  })

  it('404 vira notFound', async () => {
    await expect(client().send({ path: 'debug/not-found' })).rejects.toMatchObject({
      kind: 'notFound',
      apiMessage: 'Não encontrado.',
    })
  })

  it('500 vira server e e marcado como repetivel', async () => {
    try {
      await client().send({ path: 'debug/server-error' })
      expect.unreachable('deveria ter lancado')
    } catch (error) {
      const failure = error as NetworkError
      expect(failure.status).toBe(500)
      expect(failure.isRetryable).toBe(true)
    }
  })

  it('rota nao mapeada responde 404 no formato da API', async () => {
    await expect(client().send({ path: 'nao/existe' })).rejects.toMatchObject({
      kind: 'notFound',
      api: { status: 404 },
    })
  })

  it('erro do Spring sem message cai no texto padrao do status', async () => {
    const springFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ status: 403, error: 'Forbidden', path: '/x' }), { status: 403 })
    const spring = createHttpClient(BASE_URL, springFetch)
    await expect(spring.send({ path: 'x' })).rejects.toMatchObject({
      kind: 'forbidden',
      message: 'HTTP 403',
      apiMessage: null,
    })
  })

  it('erro sem corpo JSON ainda traz o status', async () => {
    const bare: typeof fetch = async () => new Response('falhou', { status: 502 })
    await expect(createHttpClient(BASE_URL, bare).send({ path: 'x' })).rejects.toMatchObject({
      kind: 'server',
      status: 502,
      api: null,
    })
  })

  it('corpo que nao e JSON vira erro de decoding', async () => {
    const brokenFetch: typeof fetch = async () => new Response('nao e json', { status: 200 })
    const broken = createHttpClient(BASE_URL, brokenFetch)
    await expect(broken.send({ path: 'catalogos' })).rejects.toMatchObject({ kind: 'decoding' })
    await expect(broken.sendOptional({ path: 'catalogos' })).rejects.toMatchObject({
      kind: 'decoding',
    })
  })

  it('falha de transporte vira transport, e e repetivel', async () => {
    const down: typeof fetch = async () => {
      throw new TypeError('Failed to fetch')
    }
    await expect(createHttpClient(BASE_URL, down).send({ path: 'x' })).rejects.toMatchObject({
      kind: 'transport',
      isRetryable: true,
    })
  })

  it('so transporte, offline e erro 5xx sao repetiveis', () => {
    expect(new NetworkError('offline', 'x').isRetryable).toBe(true)
    expect(new NetworkError('transport', 'x').isRetryable).toBe(true)
    expect(new NetworkError('server', 'x', 503).isRetryable).toBe(true)
    expect(new NetworkError('server', 'x', 418).isRetryable).toBe(false)
    expect(new NetworkError('badRequest', 'x', 400).isRetryable).toBe(false)
    expect(new NetworkError('unauthorized', 'x').isRetryable).toBe(false)
    expect(new NetworkError('forbidden', 'x').isRetryable).toBe(false)
    expect(new NetworkError('conflict', 'x').isRetryable).toBe(false)
    expect(new NetworkError('notFound', 'x').isRetryable).toBe(false)
    expect(new NetworkError('noContent', 'x').isRetryable).toBe(false)
  })
})

describe('Fixtures e contas de teste', () => {
  it.each(['contas', 'catalogos', 'oportunidades_profissional', 'inscricoes'])(
    'a fixture %s existe',
    (name) => {
      expect(loadFixture(name)).toBeDefined()
    },
  )

  it('fixture ausente avisa pelo nome', () => {
    expect(() => loadFixture('nao_existe')).toThrow('nao_existe.json')
  })

  it.each(['paciente@teste.com', '  PACIENTE@TESTE.COM ', 'profissional@teste.com'])(
    'reconhece a conta de teste %s',
    (email) => {
      expect(matchTestAccount(email)).not.toBeNull()
    },
  )

  it('nao reconhece outras contas', () => {
    expect(matchTestAccount('alguem@outro.com')).toBeNull()
    expect(matchTestAccount(null)).toBeNull()
  })

  it('as fixtures usam so os valores fechados do contrato, em MAIUSCULAS', () => {
    const opportunities = loadFixture<Record<string, unknown>[]>('oportunidades_profissional')
    for (const item of opportunities) {
      expect(['RASCUNHO', 'ATIVA', 'ENCERRADA']).toContain(item.status)
      expect(['PRESENCIAL', 'ONLINE', 'HIBRIDO']).toContain(item.modalidade)
      expect(['GRATUITO', 'SUS', 'PRECO_SOCIAL', 'PESQUISA']).toContain(item.modalidadeAcesso)
    }
    const requests = loadFixture<InscricaoDTO[]>('inscricoes')
    const statuses = new Set(requests.map((item) => item.status))
    expect([...statuses].sort()).toEqual(
      ['AGUARDANDO_INFORMACOES', 'APROVADA', 'CANCELADA', 'EM_ANALISE', 'RECEBIDA', 'RECUSADA'],
    )
  })

  it('o log guarda metodo, caminho e query de cada requisicao', async () => {
    await client('mock.profissional@teste.com').send({
      path: 'profissional-saude/inscricoes',
      query: { status: 'APROVADA' },
      authenticated: true,
    })
    expect(requestLog.at(-1)).toBe('GET /profissional-saude/inscricoes?status=APROVADA')
  })
})

describe('Datas do demo', () => {
  const now = new Date('2026-11-05T16:00:00Z')
  const items = [
    { id: 'a', receivedAt: '2026-10-21T09:12:00Z' },
    { id: 'b', receivedAt: '2026-10-20T15:40:00Z' },
    { id: 'c', receivedAt: '2026-10-18T16:20:00Z' },
  ]

  it('o item mais recente aparece como de hoje', () => {
    const rebased = rebaseToToday(items, 'receivedAt', now)
    expect(relativeDay(String(rebased[0]!.receivedAt), now)).toBe('Hoje')
  })

  it('a distancia entre as datas continua a mesma', () => {
    const rebased = rebaseToToday(items, 'receivedAt', now)
    expect(rebased.map((item) => relativeDay(String(item.receivedAt), now))).toEqual([
      'Hoje',
      'Ontem',
      'Há 3 dias',
    ])
  })

  it('o horario do dia nao muda', () => {
    const rebased = rebaseToToday(items, 'receivedAt', now)
    expect(rebased[1]!.receivedAt).toBe('2026-11-04T15:40:00.000Z')
  })

  it('data invalida fica como estava', () => {
    const rebased = rebaseToToday([{ id: 'x', receivedAt: 'sem data' }, ...items], 'receivedAt', now)
    expect(rebased[0]!.receivedAt).toBe('sem data')
  })

  it('na inscricao, prazo, decisao, pedido e mensagens andam junto com a data', () => {
    const fixtures = loadFixture<InscricaoDTO[]>('inscricoes')
    const rebased = rebaseRequests(fixtures, now)
    const gap = (item: InscricaoDTO) =>
      new Date(item.prazoResposta!).getTime() - new Date(item.dataInscricao).getTime()
    rebased.forEach((item, index) => expect(gap(item)).toBe(gap(fixtures[index]!)))

    const approved = rebased.find((item) => item.id === 'req-001')!
    expect(relativeDay(approved.dataInscricao, now)).toBe('Hoje')
    expect(relativeDay(approved.mensagens![0]!.enviadaEm, now)).toBe('Hoje')
    const waiting = rebased.find((item) => item.status === 'AGUARDANDO_INFORMACOES')!
    expect(new Date(waiting.pedidoInformacao!.prazo).getTime()).toBeGreaterThan(now.getTime())
  })
})
