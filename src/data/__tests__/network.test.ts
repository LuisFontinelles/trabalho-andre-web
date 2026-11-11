import { describe, expect, it, vi } from 'vitest'
import { createDependencies } from '@/app/dependencies'
import { NetworkError, buildUrl, createHttpClient } from '@/data/network/httpClient'
import {
  BASE_URL,
  createMockFetch,
  loadFixture,
  matchTestAccount,
  matchesPattern,
  mockRoutes,
  rebaseToToday,
} from '@/data/network/mockBackend'
import { relativeDay } from '@/domain/professional'
import { validProfessionalDraft } from '@/test/factories'

const client = () => createHttpClient(BASE_URL, createMockFetch({ latency: false }))

describe('Montagem da requisicao', () => {
  it('junta o caminho ao baseUrl', () => {
    expect(buildUrl(BASE_URL, { path: 'opportunities' })).toBe(
      'https://api.carebridge.local/v1/opportunities',
    )
  })

  it('query vai ordenada por chave, para a URL ser estavel', () => {
    const url = buildUrl(BASE_URL, {
      path: 'opportunities',
      query: { page: '2', q: 'psico', modality: 'online' },
    })
    expect(url).toBe(
      'https://api.carebridge.local/v1/opportunities?modality=online&page=2&q=psico',
    )
  })

  it('login envia o JSON para o endpoint novo e preserva o status HTTP', async () => {
    let capturedUrl = ''
    let capturedInit: RequestInit | undefined
    const fetchImpl: typeof fetch = async (input, init) => {
      capturedUrl = String(input)
      capturedInit = init
      return Response.json({
        token: 'jwt-test',
        autenticado: true,
        tipoPerfil: 'PROFISSIONAL_SAUDE',
        validadoInstitucionalmente: false,
      })
    }

    const result = await createDependencies(fetchImpl).login(
      '  Profissional@Teste.com ',
      'SenhaSegura123!',
    )

    expect(capturedUrl).toBe('http://localhost:8080/user/login')
    expect(capturedInit?.method).toBe('POST')
    expect(new Headers(capturedInit?.headers).get('Content-Type')).toBe('application/json')
    expect(capturedInit?.body).toBe(
      JSON.stringify({ email: 'profissional@teste.com', password: 'SenhaSegura123!' }),
    )
    expect(result).toMatchObject({
      status: 200,
      data: {
        autenticado: true,
        token: 'jwt-test',
        tipoPerfil: 'PROFISSIONAL_SAUDE',
        validadoInstitucionalmente: false,
      },
    })
  })

  it('cadastro profissional envia JSON e arquivos como partes multipart distintas', async () => {
    let capturedUrl = ''
    let capturedInit: RequestInit | undefined
    const fetchImpl: typeof fetch = async (input, init) => {
      capturedUrl = String(input)
      capturedInit = init
      return new Response(null, { status: 201 })
    }
    const documents = [
      new File(['conteudo pdf'], 'registro.pdf', { type: 'application/pdf' }),
      new File(['conteudo imagem'], 'identidade.jpg', { type: 'image/jpeg' }),
    ]

    await createDependencies(fetchImpl).registerProfessional(
      validProfessionalDraft(),
      'Médico clínico geral.',
      documents,
    )

    expect(capturedUrl).toBe('http://localhost:8080/profissional-saude/cadastro')
    expect(capturedInit?.method).toBe('POST')
    expect(new Headers(capturedInit?.headers).has('Content-Type')).toBe(false)
    const requestBody = capturedInit?.body
    expect(requestBody).toBeInstanceOf(FormData)
    if (!(requestBody instanceof FormData)) throw new Error('O corpo deveria ser FormData')
    const body = requestBody
    const dataPart = body.get('dados')
    expect(dataPart).toBeInstanceOf(Blob)
    if (!(dataPart instanceof Blob)) throw new Error('A parte dados deveria ser JSON')
    expect(dataPart.type).toBe('application/json')
    const dataText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(dataPart)
    })
    expect(dataText).toBe(
      JSON.stringify({
        usuarioDto: {
          email: 'profissional@teste.com',
          senha: 'Profissa@2026',
          tipoPerfil: 'PROFISSIONAL_SAUDE',
        },
        nome: 'Marcos Vieira',
        documentosRegistro: ['CRM/DF 123456'],
        biografiaOuDescricao: 'Médico clínico geral.',
      }),
    )
    expect(body.getAll('documentos')).toEqual(documents)
  })

  it('permite cadastro sem anexar arquivos', async () => {
    let capturedBody: BodyInit | null | undefined
    const fetchImpl: typeof fetch = async (_input, init) => {
      capturedBody = init?.body
      return new Response(null, { status: 201 })
    }

    await createDependencies(fetchImpl).registerProfessional(
      validProfessionalDraft(),
      '',
      [],
    )

    expect(capturedBody).toBeInstanceOf(FormData)
    if (!(capturedBody instanceof FormData)) throw new Error('O corpo deveria ser FormData')
    expect(capturedBody.getAll('documentos')).toHaveLength(0)
    expect(capturedBody.get('dados')).toBeInstanceOf(Blob)
  })

  it('adiciona Bearer token somente em chamadas marcadas como protegidas', async () => {
    const capturedHeaders: Headers[] = []
    const fetchImpl: typeof fetch = async (_input, init) => {
      capturedHeaders.push(new Headers(init?.headers))
      return Response.json({})
    }
    const authenticatedClient = createHttpClient(BASE_URL, fetchImpl, {
      getToken: () => 'jwt-protected',
    })

    await authenticatedClient.send({
      path: 'professional/opportunities',
      requiresAuth: true,
    })
    await authenticatedClient.send({ path: 'opportunities' })

    expect(capturedHeaders[0]?.get('Authorization')).toBe('Bearer jwt-protected')
    expect(capturedHeaders[1]?.has('Authorization')).toBe(false)
  })

  it('notifica expiração ao receber 401 numa chamada protegida autenticada', async () => {
    const onSessionExpired = vi.fn()
    const protectedClient = createHttpClient(
      BASE_URL,
      async () => new Response(null, { status: 401 }),
      { getToken: () => 'jwt-expirado', onSessionExpired },
    )

    await expect(
      protectedClient.send({
        path: 'professional/opportunities',
        requiresAuth: true,
      }),
    ).rejects.toMatchObject({ kind: 'unauthorized', status: 401 })
    expect(onSessionExpired).toHaveBeenCalledOnce()
  })
})

describe('Casamento de rotas', () => {
  it('caminho identico casa', () => {
    expect(matchesPattern('/v1/opportunities', '/v1/opportunities')).toBe(true)
  })

  it('curinga casa qualquer identificador', () => {
    expect(matchesPattern('/v1/opportunities/{id}', '/v1/opportunities/op-004')).toBe(true)
  })

  it('numero de segmentos diferente nao casa', () => {
    expect(matchesPattern('/v1/opportunities/{id}', '/v1/opportunities')).toBe(false)
    expect(matchesPattern('/v1/opportunities', '/v1/opportunities/op-004')).toBe(false)
  })

  it('segmento fixo diferente nao casa', () => {
    expect(matchesPattern('/v1/filters', '/v1/opportunities')).toBe(false)
  })
})

describe('Status de erro da API', () => {
  it('204 vira noContent quando o chamador espera um objeto', async () => {
    await expect(client().send({ path: 'debug/no-content' })).rejects.toMatchObject({
      kind: 'noContent',
    })
  })

  it('204 passa limpo quando o chamador nao espera corpo', async () => {
    await expect(client().sendVoid({ path: 'debug/no-content' })).resolves.toBeUndefined()
  })

  it('400 traz o corpo de erro do servidor', async () => {
    try {
      await client().send({ path: 'debug/bad-request' })
      expect.unreachable('deveria ter lancado')
    } catch (error) {
      const failure = error as NetworkError
      expect(failure.kind).toBe('server')
      expect(failure.status).toBe(400)
      expect(failure.apiMessage).toBe('Bad Request: the refresh token is missing')
      expect(failure.api?.requestId).toBe('ddfd6adc-59d5-4ef0-a1f1-7bc904c9b17e')
    }
  })

  it('401 vira unauthorized com a mensagem do servidor', async () => {
    try {
      await client().send({ path: 'debug/unauthorized' })
      expect.unreachable('deveria ter lancado')
    } catch (error) {
      const failure = error as NetworkError
      expect(failure.kind).toBe('unauthorized')
      expect(failure.api?.statusCode).toBe(401)
    }
  })

  it('404 vira notFound', async () => {
    try {
      await client().send({ path: 'debug/not-found' })
      expect.unreachable('deveria ter lancado')
    } catch (error) {
      expect((error as NetworkError).kind).toBe('notFound')
      expect((error as NetworkError).apiMessage).toBe('Not Found: user not found')
    }
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
    try {
      await client().send({ path: 'nao/existe' })
      expect.unreachable('deveria ter lancado')
    } catch (error) {
      const failure = error as NetworkError
      expect(failure.kind).toBe('notFound')
      expect(failure.apiMessage).toContain('GET')
    }
  })

  it('corpo que nao e JSON vira erro de decoding', async () => {
    const brokenFetch: typeof fetch = async () =>
      new Response('nao e json', { status: 200 })
    const broken = createHttpClient(BASE_URL, brokenFetch)
    await expect(broken.send({ path: 'filters' })).rejects.toMatchObject({
      kind: 'decoding',
    })
  })

  it('so transporte, offline e servidor sao repetiveis', () => {
    expect(new NetworkError('offline', 'x').isRetryable).toBe(true)
    expect(new NetworkError('transport', 'x').isRetryable).toBe(true)
    expect(new NetworkError('server', 'x', 503).isRetryable).toBe(true)
    expect(new NetworkError('unauthorized', 'x').isRetryable).toBe(false)
    expect(new NetworkError('notFound', 'x').isRetryable).toBe(false)
    expect(new NetworkError('noContent', 'x').isRetryable).toBe(false)
  })
})

describe('Fixtures e contas de teste', () => {
  it.each([
    'auth_login',
    'auth_login_professional',
    'auth_signup',
    'professional_catalog',
    'opportunities',
    'opportunity_detail',
    'filters',
    'application_status',
    'error_400',
    'error_401',
    'error_404',
    'error_500',
  ])('a fixture %s existe', (name) => {
    expect(loadFixture(name)).toBeDefined()
  })

  it('toda rota declarada tem fixture presente ou resposta dinamica', () => {
    for (const route of mockRoutes) {
      if (route.fixture === null) continue
      expect(() => loadFixture(route.fixture as string)).not.toThrow()
    }
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
})

describe('Datas do demo', () => {
  const now = new Date('2026-11-05T16:00:00Z')
  const items = [
    { id: 'a', receivedAt: '2026-10-21T09:12:00Z' },
    { id: 'b', receivedAt: '2026-10-20T15:40:00Z' },
    { id: 'c', receivedAt: '2026-10-18T16:20:00Z' },
  ]

  it('a solicitacao mais recente aparece como de hoje', () => {
    const rebased = rebaseToToday(items, 'receivedAt', now)
    expect(relativeDay(String(rebased[0].receivedAt), now)).toBe('Hoje')
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
    expect(rebased[1].receivedAt).toBe('2026-11-04T15:40:00.000Z')
  })

  it('data invalida fica como estava', () => {
    const rebased = rebaseToToday([{ id: 'x', receivedAt: 'sem data' }, ...items], 'receivedAt', now)
    expect(rebased[0].receivedAt).toBe('sem data')
  })
})
