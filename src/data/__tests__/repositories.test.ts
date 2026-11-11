import { describe, expect, it } from 'vitest'
import { ValidationError } from '@/domain/useCases'
import {
  DEBUG_RESET_CODE,
  DEBUG_VERIFICATION_CODE,
  LOCK_MS,
  MAX_FAILED_LOGINS,
  authorizationLog,
  requestLog,
  setMockClock,
} from '@/data/network/mockBackend'
import { testDependencies, validProfessionalDraft } from '@/test/factories'

const deps = () => testDependencies(null)

describe('Login', () => {
  it('conta de teste do profissional entra com qualquer senha', async () => {
    const session = await deps().login('profissional@teste.com', 'qualquer')
    expect(session.user.profile).toBe('PROFISSIONAL')
    expect(session.token).toBe('mock.profissional@teste.com')
    expect(session.isVerified).toBe(true)
  })

  it('o nome vem de GET /user/me, chamado logo depois com o token novo', async () => {
    const session = await deps().login('profissional@teste.com', 'Profissa@2026')
    expect(session.user.name).toBe('Marcos Vieira')
    expect(session.user.id).toBe('9b3d7e21-5c8f-4a06-b2d4-71e5a0c9f302')
    expect(requestLog).toEqual(['POST /user/login', 'GET /user/me'])
    expect(authorizationLog).toEqual([null, 'Bearer mock.profissional@teste.com'])
  })

  it('conta de paciente e identificada para o guard bloquear o painel', async () => {
    await expect(deps().login('paciente@teste.com', 'Paciente@2026')).resolves.toMatchObject({
      authProfile: 'PACIENTE',
      user: { profile: 'PACIENTE' },
    })
  })

  it('e-mail e normalizado antes de bater no servidor', async () => {
    const session = await deps().login('  PROFISSIONAL@TESTE.COM ', 'qualquer')
    expect(session.user.email).toBe('profissional@teste.com')
  })

  it('conta fora da lista e recusada com 401 e a mensagem do servidor', async () => {
    await expect(deps().login('ninguem@teste.com', 'Senha@2026')).rejects.toMatchObject({
      kind: 'unauthorized',
      status: 401,
      apiMessage: 'E-mail ou senha incorretos.',
    })
  })

  it('o caso de uso valida antes de chamar a rede', async () => {
    const dependencies = deps()
    await expect(dependencies.login('sem-arroba', 'Senha@2026')).rejects.toBeInstanceOf(
      ValidationError,
    )
    await expect(dependencies.login('profissional@teste.com', '')).rejects.toBeInstanceOf(
      ValidationError,
    )
    expect(requestLog).toEqual([])
  })
})

describe('Bloqueio depois de 5 senhas erradas', () => {
  const wrong = (dependencies: ReturnType<typeof deps>, email = 'ana@clinica.com') =>
    dependencies.login(email, 'errada').catch((error: unknown) => error)

  it('as 4 primeiras dao 401 e a quinta bloqueia com 429', async () => {
    const dependencies = deps()
    for (let attempt = 1; attempt < MAX_FAILED_LOGINS; attempt += 1) {
      expect(await wrong(dependencies)).toMatchObject({ kind: 'unauthorized' })
    }
    expect(await wrong(dependencies)).toMatchObject({
      kind: 'tooManyAttempts',
      status: 429,
      apiMessage: 'Muitas tentativas. Tente de novo em 15 minutos.',
    })
  })

  it('bloqueado, nem a senha certa entra; depois de 15 minutos entra', async () => {
    let now = Date.parse('2026-11-19T12:00:00Z')
    setMockClock(() => now)
    const dependencies = deps()
    // A conta de teste so erra com senha vazia, que o caso de uso barra
    // antes; aqui a falha vai direto pelo repositorio.
    for (let attempt = 0; attempt < MAX_FAILED_LOGINS; attempt += 1) {
      await dependencies.authRepository.login('profissional@teste.com', '').catch(() => null)
    }
    await expect(dependencies.login('profissional@teste.com', 'certa')).rejects.toMatchObject({
      kind: 'tooManyAttempts',
    })
    now += LOCK_MS + 1
    await expect(dependencies.login('profissional@teste.com', 'certa')).resolves.toMatchObject({
      user: { name: 'Marcos Vieira' },
    })
  })

  it('o bloqueio e por e-mail', async () => {
    const dependencies = deps()
    for (let attempt = 0; attempt < MAX_FAILED_LOGINS; attempt += 1) await wrong(dependencies)
    await expect(dependencies.login('profissional@teste.com', 'x')).resolves.toBeDefined()
  })

  it('acertar zera a contagem', async () => {
    const dependencies = deps()
    const draft = { ...validProfessionalDraft(), email: 'conta.nova@clinica.com' }
    await dependencies.signUp(draft)
    await dependencies.verifyCode(draft.email, DEBUG_VERIFICATION_CODE)
    for (let attempt = 1; attempt < MAX_FAILED_LOGINS; attempt += 1) {
      await wrong(dependencies, draft.email)
    }
    await expect(dependencies.login(draft.email, draft.password)).resolves.toBeDefined()
    for (let attempt = 1; attempt < MAX_FAILED_LOGINS; attempt += 1) {
      expect(await wrong(dependencies, draft.email)).toMatchObject({ kind: 'unauthorized' })
    }
  })
})

describe('Cadastro e verificacao', () => {
  it('cadastro devolve o desafio de verificacao de 4 digitos', async () => {
    const pending = await deps().signUp(validProfessionalDraft())
    expect(pending).toEqual({
      email: 'novo.medico@clinica.com',
      profile: 'PROFISSIONAL',
      codeLength: 4,
      requiresCode: true,
    })
    expect(requestLog).toEqual(['POST /profissional-saude/cadastro'])
  })

  it('o caso de uso normaliza o e-mail antes de enviar', async () => {
    const draft = { ...validProfessionalDraft(), email: '  Nova.Medica@Clinica.COM ' }
    const pending = await deps().signUp(draft)
    expect(pending.email).toBe('nova.medica@clinica.com')
  })

  it('e-mail que ja tem conta responde 409', async () => {
    const draft = { ...validProfessionalDraft(), email: 'profissional@teste.com' }
    await expect(deps().signUp(draft)).rejects.toMatchObject({
      kind: 'conflict',
      apiMessage: 'Já existe um usuário cadastrado com este e-mail.',
    })
  })

  it('sem aceitar os termos o caso de uso nem chega na rede', async () => {
    const draft = { ...validProfessionalDraft(), acceptedTerms: false }
    await expect(deps().signUp(draft)).rejects.toBeInstanceOf(ValidationError)
    expect(requestLog).toEqual([])
  })

  it('o codigo de depuracao conclui a verificacao e entra com a senha do cadastro', async () => {
    const dependencies = deps()
    const draft = { ...validProfessionalDraft(), name: 'Helena Souza' }
    const pending = await dependencies.signUp(draft)
    const session = (await dependencies.verifyCode(pending.email, DEBUG_VERIFICATION_CODE))!
    expect(requestLog).toEqual([
      'POST /profissional-saude/cadastro',
      'POST /auth/verify',
      'POST /user/login',
      'GET /user/me',
    ])
    expect(session.user).toMatchObject({
      email: 'novo.medico@clinica.com',
      name: 'Helena Souza',
      profile: 'PROFISSIONAL',
    })
    expect(session.token).toBe('mock.novo.medico@clinica.com')
    // O profissional nasce EM_VERIFICACAO: ainda sem o selo.
    expect(session.isVerified).toBe(false)
  })

  it('antes do codigo a conta nova nao entra', async () => {
    const dependencies = deps()
    const draft = validProfessionalDraft()
    await dependencies.signUp(draft)
    await expect(dependencies.login(draft.email, draft.password)).rejects.toMatchObject({
      kind: 'unauthorized',
    })
  })

  it('depois do codigo a conta nova entra so com a senha cadastrada', async () => {
    const dependencies = deps()
    const draft = validProfessionalDraft()
    await dependencies.signUp(draft)
    await dependencies.verifyCode(draft.email, DEBUG_VERIFICATION_CODE)
    await expect(dependencies.login(draft.email, draft.password)).resolves.toMatchObject({
      isVerified: false,
    })
    await expect(dependencies.login(draft.email, 'Outra@2026')).rejects.toMatchObject({
      kind: 'unauthorized',
    })
  })

  it.each(['1234', '0001', '9999'])('codigo errado %s devolve 400', async (code) => {
    await expect(deps().verifyCode('profissional@teste.com', code)).rejects.toMatchObject({
      kind: 'badRequest',
      apiMessage: 'Código inválido ou expirado.',
    })
  })

  it.each(['', '0', '00', '000'])('codigo incompleto %s para no caso de uso', async (code) => {
    await expect(deps().verifyCode('profissional@teste.com', code)).rejects.toBeInstanceOf(
      ValidationError,
    )
  })

  it('caracteres nao numericos sao descartados; sem a senha na memoria pede login', async () => {
    await expect(deps().verifyCode('profissional@teste.com', '0-0 0a0')).resolves.toBeNull()
    expect(requestLog).toEqual(['POST /auth/verify'])
  })

  it('verificar e-mail sem cadastro responde 400, sem revelar quem tem conta', async () => {
    await expect(deps().verifyCode('ninguem@teste.com', '0000')).rejects.toMatchObject({
      kind: 'badRequest',
    })
  })

  it('reenvio de codigo vai para /auth/resend-code', async () => {
    await expect(deps().resendCode('profissional@teste.com')).resolves.toBeUndefined()
    expect(requestLog).toEqual(['POST /auth/resend-code'])
  })
})

describe('Catalogo', () => {
  it('traz conselhos, UFs e especialidades de GET /catalogos', async () => {
    const catalog = await deps().loadCatalog()
    expect(requestLog).toEqual(['GET /catalogos'])
    expect(catalog.councils.map((item) => item.id)).toEqual([
      'CRM',
      'COREN',
      'CRO',
      'CRP',
      'CREFITO',
      'CRN',
      'CRF',
      'CREFONO',
      'CRESS',
      'CREF',
      'CRBM',
    ])
    expect(catalog.states).toHaveLength(27)
    expect(catalog.states[0]).toEqual({ id: 'AC', label: 'AC' })
    expect(catalog.specialties).toContainEqual({ id: 'clinica-geral', label: 'Clínica geral' })
  })
})

describe('Recuperar senha', () => {
  it('envia o pedido com o e-mail normalizado', async () => {
    await expect(deps().requestPasswordReset('  Profissional@Teste.com ')).resolves.toBeUndefined()
    expect(requestLog).toEqual(['POST /auth/password-reset'])
  })

  it('codigo certo e senha forte trocam a senha', async () => {
    const dependencies = deps()
    const draft = validProfessionalDraft()
    await dependencies.signUp(draft)
    await dependencies.verifyCode(draft.email, DEBUG_VERIFICATION_CODE)
    await dependencies.resetPassword(draft.email, DEBUG_RESET_CODE, 'Nova@2026x')
    await expect(dependencies.login(draft.email, 'Nova@2026x')).resolves.toBeTruthy()
    await expect(dependencies.login(draft.email, draft.password)).rejects.toMatchObject({
      kind: 'unauthorized',
    })
  })

  it('codigo errado na troca chega como badRequest', async () => {
    await expect(
      deps().resetPassword('profissional@teste.com', '123456', 'Nova@2026x'),
    ).rejects.toMatchObject({ kind: 'badRequest', apiMessage: 'Código inválido ou expirado.' })
  })

  it.each(['Nova2026x', 'nova@2026x', 'NOVA@2026X', 'Nv@1'])('senha %s nao passa da regra', async (password) => {
    await expect(
      deps().resetPassword('profissional@teste.com', DEBUG_RESET_CODE, password),
    ).rejects.toMatchObject({ code: 'newPasswordWeak' })
    expect(requestLog).toEqual([])
  })

  it('responde igual para e-mail sem conta, para nao revelar quem tem cadastro', async () => {
    await expect(deps().requestPasswordReset('ninguem@exemplo.com')).resolves.toBeUndefined()
  })

  it('e-mail invalido nem chega ao servidor', async () => {
    await expect(deps().requestPasswordReset('sem-arroba')).rejects.toMatchObject({
      code: 'emailInvalid',
    })
    await expect(deps().requestPasswordReset('  ')).rejects.toMatchObject({
      code: 'emailRequired',
    })
  })
})

describe('Minha conta (LGPD)', () => {
  async function signedIn() {
    const dependencies = deps()
    const draft = validProfessionalDraft()
    await dependencies.signUp(draft)
    const session = (await dependencies.verifyCode(draft.email, DEBUG_VERIFICATION_CODE))!
    dependencies.tokens.set(session.token)
    return dependencies
  }

  it('exporta os dados da conta por POST /me/data-export', async () => {
    const dependencies = await signedIn()
    await expect(dependencies.exportMyData()).resolves.toMatchObject({
      email: 'novo.medico@clinica.com',
      emailVerificado: true,
    })
    expect(requestLog.at(-1)).toBe('POST /me/data-export')
  })

  it('senha errada na exclusao nao derruba a sessao', async () => {
    const dependencies = await signedIn()
    let expired = false
    dependencies.tokens.onExpired(() => {
      expired = true
    })
    await expect(dependencies.deleteAccount('errada')).rejects.toMatchObject({ kind: 'unauthorized' })
    expect(expired).toBe(false)
    expect(dependencies.tokens.get()).not.toBeNull()
  })

  it('senha certa exclui a conta e o login deixa de funcionar', async () => {
    const dependencies = await signedIn()
    const draft = validProfessionalDraft()
    await dependencies.deleteAccount(draft.password)
    expect(requestLog.at(-1)).toBe('DELETE /me')
    await expect(dependencies.login(draft.email, draft.password)).rejects.toMatchObject({
      kind: 'unauthorized',
    })
  })

  it('senha vazia nem sai do navegador', async () => {
    const dependencies = await signedIn()
    await expect(dependencies.deleteAccount('')).rejects.toMatchObject({ code: 'passwordRequired' })
    expect(requestLog.at(-1)).toBe('GET /user/me')
  })
})
