import { describe, expect, it, vi } from 'vitest'
import { createDependencies } from '@/app/dependencies'
import {
  apiProfileFrom,
  nameFromEmail,
  professionalSignUpForm,
  professionalSignUpToApi,
  registrationText,
} from '@/data/carebridgeApi'
import { createMockFetch } from '@/data/network/mockBackend'
import { WrongProfileError } from '@/domain/entities'
import { validProfessionalDraft } from '@/test/factories'

const API = 'https://api.teste/'

interface Call {
  url: string
  init: RequestInit
}

/** fetch falso da API real: devolve `status` e `body` e guarda as chamadas. */
function apiFetch(status: number, body: unknown) {
  const calls: Call[] = []
  const impl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} })
    const text = body === null ? '' : JSON.stringify(body)
    return new Response(text === '' ? null : text, { status })
  }) as unknown as typeof fetch
  return { impl, calls }
}

function realApiDependencies(status: number, body: unknown) {
  const fake = apiFetch(status, body)
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
}

describe('Mapeamento da API real', () => {
  it('converte o perfil da API para o do app', () => {
    expect(apiProfileFrom('PROFISSIONAL_SAUDE')).toBe('PROFISSIONAL')
    expect(apiProfileFrom('PACIENTE')).toBe('PACIENTE')
    expect(apiProfileFrom('ADMIN')).toBe('DESCONHECIDO')
  })

  it('tira um nome legivel do e-mail enquanto o login nao devolve nome', () => {
    expect(nameFromEmail('ana.souza@exemplo.com')).toBe('Ana Souza')
    expect(nameFromEmail('MARCOS_vieira-2@x.com')).toBe('Marcos Vieira 2')
    expect(nameFromEmail('@x.com')).toBe('@x.com')
  })

  it('monta o registro como texto livre no formato do Swagger', () => {
    expect(registrationText(validProfessionalDraft())).toBe('CRM-DF 123456')
  })

  it('monta a parte dados do cadastro do profissional', () => {
    expect(professionalSignUpToApi(validProfessionalDraft())).toEqual({
      usuarioDto: {
        email: 'profissional@teste.com',
        senha: 'Profissa@2026',
        tipoPerfil: 'PROFISSIONAL_SAUDE',
      },
      nome: 'Marcos Vieira',
      documentosRegistro: ['CRM-DF 123456'],
      biografiaOuDescricao: null,
    })
  })

  it('envia dados como JSON dentro do multipart', async () => {
    const part = professionalSignUpForm(validProfessionalDraft()).get('dados')
    expect(part).toBeInstanceOf(Blob)
    const blob = part as Blob
    expect(blob.type).toBe('application/json')
    expect(JSON.parse(await readBlob(blob))).toMatchObject({ nome: 'Marcos Vieira' })
  })
})

describe('Login na API real', () => {
  it('chama /user/login e devolve a sessao com a conferencia do registro', async () => {
    const { deps, calls } = realApiDependencies(200, LOGIN_OK)
    const session = await deps.login(' Ana.Souza@Exemplo.com ', 'Senha@2026')

    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toBe('https://api.teste/user/login')
    expect(calls[0]!.init.method).toBe('POST')
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      email: 'ana.souza@exemplo.com',
      password: 'Senha@2026',
    })
    expect(session.token).toBe('jwt.do.servidor')
    expect(session.isVerified).toBe(false)
    expect(session.user).toMatchObject({
      email: 'ana.souza@exemplo.com',
      name: 'Ana Souza',
      profile: 'PROFISSIONAL',
    })
  })

  it('recusa conta de paciente no painel', async () => {
    const { deps } = realApiDependencies(200, { ...LOGIN_OK, tipoPerfil: 'PACIENTE' })
    await expect(deps.login('paciente@exemplo.com', 'Senha@2026')).rejects.toBeInstanceOf(
      WrongProfileError,
    )
  })

  it('senha errada (403 sem corpo util) vira unauthorized', async () => {
    const { deps } = realApiDependencies(403, {
      timestamp: '2026-11-11T12:00:00Z',
      status: 403,
      error: 'Forbidden',
      path: '/user/login',
    })
    await expect(deps.login('ana@exemplo.com', 'errada')).rejects.toMatchObject({
      kind: 'unauthorized',
      status: 403,
      message: 'HTTP 403',
    })
  })
})

describe('Cadastro na API real', () => {
  it('envia multipart para /profissional-saude/cadastro e dispensa o codigo', async () => {
    const { deps, calls } = realApiDependencies(201, null)
    const pending = await deps.signUp(validProfessionalDraft())

    expect(calls[0]!.url).toBe('https://api.teste/profissional-saude/cadastro')
    expect(calls[0]!.init.body).toBeInstanceOf(FormData)
    const headers = calls[0]!.init.headers as Record<string, string>
    // O navegador define o Content-Type com o boundary do multipart.
    expect(headers['Content-Type']).toBeUndefined()
    expect(pending).toEqual({
      email: 'profissional@teste.com',
      profile: 'PROFISSIONAL',
      codeLength: 0,
      requiresCode: false,
    })
  })

  it('e-mail repetido chega como 409 com a mensagem da API', async () => {
    const { deps } = realApiDependencies(409, {
      status: 409,
      message: 'Não foi possível concluir o cadastro porque os dados já estão em uso.',
    })
    await expect(deps.signUp(validProfessionalDraft())).rejects.toMatchObject({
      status: 409,
      apiMessage: 'Não foi possível concluir o cadastro porque os dados já estão em uso.',
    })
  })

  it('o que a API nao tem continua no backend de fixtures', async () => {
    const { deps, calls } = realApiDependencies(500, null)
    const catalog = await deps.loadProfessionalCatalog()
    expect(catalog.councils.length).toBeGreaterThan(0)
    expect(calls).toHaveLength(0)
  })
})

describe('Selecao do backend', () => {
  it('sem endereco da API tudo fica no mock', async () => {
    const fake = apiFetch(500, null)
    const deps = createDependencies(createMockFetch({ latency: false }), '', fake.impl)
    const session = await deps.login('profissional@teste.com', 'Profissa@2026')
    expect(session.user.profile).toBe('PROFISSIONAL')
    expect(session.isVerified).toBeUndefined()
    expect(fake.calls).toHaveLength(0)
  })
})
