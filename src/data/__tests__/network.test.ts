import { describe, expect, it } from 'vitest'
import { NetworkError, buildUrl, createHttpClient } from '@/data/network/httpClient'
import {
  BASE_URL,
  createMockFetch,
  loadFixture,
  matchTestAccount,
  matchesPattern,
  mockRoutes,
} from '@/data/network/mockBackend'

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
