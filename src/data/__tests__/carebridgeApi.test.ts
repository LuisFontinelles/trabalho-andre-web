import { describe, expect, it, vi } from 'vitest'
import { createDependencies } from '@/app/dependencies'
import { createMockFetch, requestLog } from '@/data/network/mockBackend'
import { WrongProfileError } from '@/domain/entities'
import { validProfessionalDraft } from '@/test/factories'

const API = 'https://api.teste/'

interface Call {
  url: string
  init: RequestInit
}

type Reply = { status: number; body: unknown } | 'network'

/**
 * fetch falso da API real. Responde por caminho (`/user/login`, `/user/me`) e
 * guarda as chamadas. 'network' simula a rota inacessivel.
 */
function apiFetch(replies: Record<string, Reply>) {
  const calls: Call[] = []
  const impl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    const reply = replies[new URL(String(url)).pathname] ?? { status: 404, body: null }
    if (reply === 'network') throw new TypeError('Failed to fetch')
    const text = reply.body === null ? '' : JSON.stringify(reply.body)
    return new Response(text === '' ? null : text, { status: reply.status })
  }) as unknown as typeof fetch
  return { impl, calls }
}

function realApiDependencies(replies: Record<string, Reply>) {
  const fake = apiFetch(replies)
  const deps = createDependencies(createMockFetch({ latency: false }), API, fake.impl)
  return { deps, calls: fake.calls }
}

/** O Blob do jsdom nao tem text(); o FileReader dele le. */
function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

const LOGIN_OK = {
  token: 'jwt.do.servidor',
  autenticado: true,
  tipoPerfil: 'PROFISSIONAL_SAUDE',
  validadoInstitucionalmente: false,
  expiraEmSegundos: 7200,
}

const ME = {
  id: '6f1c-uuid',
  email: 'ana.souza@exemplo.com',
  tipoPerfil: 'PROFISSIONAL_SAUDE',
  nome: 'Dra. Ana Souza',
  dataNascimento: null,
  telefone: null,
  situacaoRegistro: 'EM_VERIFICACAO',
}

describe('Login na API real', () => {
  it('chama /user/login e depois /user/me com o token, e usa o nome do /me', async () => {
    const { deps, calls } = realApiDependencies({
      '/user/login': { status: 200, body: LOGIN_OK },
      '/user/me': { status: 200, body: ME },
    })
    const session = await deps.login(' Ana.Souza@Exemplo.com ', 'Senha@2026')

    expect(calls.map((call) => call.url)).toEqual([
      'https://api.teste/user/login',
      'https://api.teste/user/me',
    ])
    expect(calls[0]!.init.method).toBe('POST')
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      email: 'ana.souza@exemplo.com',
      password: 'Senha@2026',
    })
    const meHeaders = calls[1]!.init.headers as Record<string, string>
    expect(meHeaders.Authorization).toBe('Bearer jwt.do.servidor')
    expect(session).toEqual({
      token: 'jwt.do.servidor',
      isVerified: false,
      user: {
        id: '6f1c-uuid',
        email: 'ana.souza@exemplo.com',
        name: 'Dra. Ana Souza',
        profile: 'PROFISSIONAL',
      },
    })
  })

  it.each([
    ['404, rota ainda nao existe', { status: 404, body: null }],
    ['403 do Spring', { status: 403, body: { status: 403, error: 'Forbidden', path: '/user/me' } }],
    ['401', { status: 401, body: { status: 401, message: 'Token inválido.' } }],
    ['500', { status: 500, body: { status: 500, message: 'Erro inesperado.' } }],
    ['erro de rede', 'network' as const],
  ])('sem /user/me (%s) o nome sai do e-mail', async (_case, reply) => {
    const { deps } = realApiDependencies({
      '/user/login': { status: 200, body: LOGIN_OK },
      '/user/me': reply as Reply,
    })
    const session = await deps.login('ana.souza@exemplo.com', 'Senha@2026')
    expect(session.user).toEqual({
      id: 'ana.souza@exemplo.com',
      email: 'ana.souza@exemplo.com',
      name: 'Ana Souza',
      profile: 'PROFISSIONAL',
    })
  })

  it('o login responde sem expiraEmSegundos, como a API de hoje, e funciona', async () => {
    const { expiraEmSegundos: _omitted, ...legacy } = LOGIN_OK
    void _omitted
    const { deps } = realApiDependencies({ '/user/login': { status: 200, body: legacy } })
    await expect(deps.login('ana@exemplo.com', 'Senha@2026')).resolves.toMatchObject({
      token: 'jwt.do.servidor',
    })
  })

  it('recusa conta de paciente no painel', async () => {
    const { deps } = realApiDependencies({
      '/user/login': { status: 200, body: { ...LOGIN_OK, tipoPerfil: 'PACIENTE' } },
    })
    await expect(deps.login('paciente@exemplo.com', 'Senha@2026')).rejects.toBeInstanceOf(
      WrongProfileError,
    )
  })

  it('o perfil do /me vale mais que o do login', async () => {
    const { deps } = realApiDependencies({
      '/user/login': { status: 200, body: LOGIN_OK },
      '/user/me': { status: 200, body: { ...ME, tipoPerfil: 'ADMIN' } },
    })
    await expect(deps.login('ana@exemplo.com', 'Senha@2026')).rejects.toMatchObject({
      profile: 'DESCONHECIDO',
    })
  })

  it('senha errada e 401 no contrato v2', async () => {
    const { deps } = realApiDependencies({
      '/user/login': { status: 401, body: { status: 401, message: 'E-mail ou senha incorretos.' } },
    })
    await expect(deps.login('ana@exemplo.com', 'errada')).rejects.toMatchObject({
      kind: 'unauthorized',
      status: 401,
      apiMessage: 'E-mail ou senha incorretos.',
    })
  })

  it('a API de hoje ainda responde 403 sem message para senha errada: vira forbidden', async () => {
    const { deps } = realApiDependencies({
      '/user/login': {
        status: 403,
        body: { timestamp: '2026-11-11T12:00:00Z', status: 403, error: 'Forbidden', path: '/user/login' },
      },
    })
    await expect(deps.login('ana@exemplo.com', 'errada')).rejects.toMatchObject({
      kind: 'forbidden',
      status: 403,
      message: 'HTTP 403',
    })
  })

  it('o painel vai para a API real com o token do login', async () => {
    const { deps, calls } = realApiDependencies({
      '/user/login': { status: 200, body: LOGIN_OK },
      '/user/me': { status: 200, body: ME },
      '/profissional-saude/oportunidades': { status: 200, body: [] },
    })
    const session = await deps.login('ana@exemplo.com', 'Senha@2026')
    deps.tokens.set(session.token)
    await deps.professionalRepository.myOpportunities()
    const painel = calls.find((call) => call.url.endsWith('/profissional-saude/oportunidades'))!
    expect((painel.init.headers as Record<string, string>).Authorization).toBe('Bearer jwt.do.servidor')
    expect(requestLog).toEqual([])
  })
})

describe('Cadastro na API real', () => {
  it('envia multipart com conselho, uf, numero, especialidade e local de atendimento', async () => {
    const { deps, calls } = realApiDependencies({
      '/profissional-saude/cadastro': {
        status: 201,
        body: { email: 'novo.medico@clinica.com', tipoPerfil: 'PROFISSIONAL_SAUDE', exigeVerificacao: false },
      },
    })
    const pending = await deps.signUp(validProfessionalDraft())

    expect(calls[0]!.url).toBe('https://api.teste/profissional-saude/cadastro')
    const form = calls[0]!.init.body as FormData
    expect(form).toBeInstanceOf(FormData)
    const headers = calls[0]!.init.headers as Record<string, string>
    // O navegador define o Content-Type com o boundary do multipart.
    expect(headers['Content-Type']).toBeUndefined()
    const part = form.get('dados') as Blob
    expect(part.type).toBe('application/json')
    expect(JSON.parse(await readBlob(part))).toEqual({
      usuarioDto: {
        email: 'novo.medico@clinica.com',
        senha: 'Profissa@2026',
        tipoPerfil: 'PROFISSIONAL_SAUDE',
      },
      nome: 'Marcos Vieira',
      conselho: 'CRM',
      uf: 'DF',
      numeroRegistro: '123456',
      especialidade: 'cardiologia',
      ondeAtende: 'Instituto Movida',
      biografiaOuDescricao: null,
      aceitouTermos: true,
    })
    expect(pending).toEqual({
      email: 'novo.medico@clinica.com',
      profile: 'PROFISSIONAL',
      codeLength: 0,
      requiresCode: false,
    })
  })

  it('201 sem corpo e lido como conta que ja nasce ativa', async () => {
    const { deps } = realApiDependencies({
      '/profissional-saude/cadastro': { status: 201, body: null },
    })
    await expect(deps.signUp(validProfessionalDraft())).resolves.toMatchObject({
      requiresCode: false,
    })
  })

  it('exigeVerificacao verdadeiro pede o codigo do tamanho informado', async () => {
    const { deps } = realApiDependencies({
      '/profissional-saude/cadastro': {
        status: 201,
        body: { email: 'novo.medico@clinica.com', tipoPerfil: 'PROFISSIONAL_SAUDE', exigeVerificacao: true, tamanhoCodigo: 6 },
      },
    })
    await expect(deps.signUp(validProfessionalDraft())).resolves.toMatchObject({
      requiresCode: true,
      codeLength: 6,
    })
  })

  it('e-mail repetido chega como conflict com a mensagem da API', async () => {
    const { deps } = realApiDependencies({
      '/profissional-saude/cadastro': {
        status: 409,
        body: { status: 409, message: 'Já existe um usuário cadastrado com este e-mail.' },
      },
    })
    await expect(deps.signUp(validProfessionalDraft())).rejects.toMatchObject({
      kind: 'conflict',
      status: 409,
      apiMessage: 'Já existe um usuário cadastrado com este e-mail.',
    })
  })

  it('codigo e recuperar senha continuam no simulado; catalogo vai para a API real', async () => {
    const { deps, calls } = realApiDependencies({
      '/catalogos': {
        status: 200,
        body: { especialidades: [], conselhos: [{ sigla: 'CRM', profissao: 'Medicina' }], ufs: ['DF'], distanciasKm: [5] },
      },
    })
    const catalog = await deps.loadCatalog()
    await deps.requestPasswordReset('ana@exemplo.com')
    await deps.resendCode('ana@exemplo.com')
    expect(catalog.councils.length).toBe(1)
    expect(calls.map((call) => call.url)).toEqual(['https://api.teste/catalogos'])
    expect(requestLog).toEqual(['POST /user/senha/recuperacao', 'POST /user/verificacao/reenvio'])
  })
})

describe('Selecao do backend', () => {
  it('sem endereco da API tudo fica no simulado', async () => {
    const fake = apiFetch({})
    const deps = createDependencies(createMockFetch({ latency: false }), '', fake.impl)
    const session = await deps.login('profissional@teste.com', 'Profissa@2026')
    expect(session.user.name).toBe('Marcos Vieira')
    expect(session.isVerified).toBe(true)
    expect(fake.calls).toHaveLength(0)
  })
})
