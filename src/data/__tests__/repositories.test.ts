import { describe, expect, it } from 'vitest'
import { emptyCriteria } from '@/domain/entities'
import { ValidationError } from '@/domain/useCases'
import { DEBUG_VERIFICATION_CODE } from '@/data/network/mockBackend'
import { testDependencies, validPatientDraft, validProfessionalDraft } from '@/test/factories'

describe('Login', () => {
  it('conta de teste do paciente entra', async () => {
    const session = await testDependencies().login('paciente@teste.com', 'Paciente@2026')
    expect(session.user.profile).toBe('PACIENTE')
    expect(session.user.email).toBe('paciente@teste.com')
    expect(session.token).not.toBe('')
  })

  it('conta de teste do profissional entra', async () => {
    const session = await testDependencies().login('profissional@teste.com', 'Profissa@2026')
    expect(session.user.profile).toBe('PROFISSIONAL')
  })

  it('e-mail e normalizado antes de bater no servidor', async () => {
    const session = await testDependencies().login('  PACIENTE@TESTE.COM ', 'qualquer')
    expect(session.user.profile).toBe('PACIENTE')
  })

  it('conta fora da lista e recusada com 401', async () => {
    await expect(
      testDependencies().login('ninguem@teste.com', 'Senha@2026'),
    ).rejects.toMatchObject({ kind: 'unauthorized' })
  })

  it('o caso de uso valida antes de chamar a rede', async () => {
    const deps = testDependencies()
    await expect(deps.login('sem-arroba', 'Senha@2026')).rejects.toBeInstanceOf(
      ValidationError,
    )
    await expect(deps.login('paciente@teste.com', '')).rejects.toBeInstanceOf(
      ValidationError,
    )
  })
})

describe('Cadastro e verificacao', () => {
  it('cadastro devolve o desafio de verificacao', async () => {
    const pending = await testDependencies().signUp(validProfessionalDraft())
    expect(pending.email).toBe('profissional@teste.com')
    expect(pending.profile).toBe('PROFISSIONAL')
    expect(pending.codeLength).toBe(4)
  })

  it('o caso de uso normaliza o e-mail antes de enviar', async () => {
    const draft = { ...validPatientDraft(), email: '  Novo.Paciente@Teste.COM ' }
    const pending = await testDependencies().signUp(draft)
    expect(pending.email).toBe('novo.paciente@teste.com')
  })

  it('sem aceitar os termos o caso de uso nem chega na rede', async () => {
    const draft = { ...validPatientDraft(), acceptedTerms: false }
    await expect(testDependencies().signUp(draft)).rejects.toBeInstanceOf(ValidationError)
  })

  it('o codigo de depuracao conclui a verificacao', async () => {
    const deps = testDependencies()
    const pending = await deps.signUp(validPatientDraft())
    const session = await deps.verifyCode(pending.email, DEBUG_VERIFICATION_CODE)
    expect(session.user.email).toBe('paciente@teste.com')
  })

  it('verificacao devolve o perfil de quem se cadastrou', async () => {
    const deps = testDependencies()
    const draft = {
      ...validProfessionalDraft(),
      email: 'novo.medico@clinica.com',
      name: 'Helena Souza',
    }
    const pending = await deps.signUp(draft)
    const session = await deps.verifyCode(pending.email, '0000')
    expect(session.user.profile).toBe('PROFISSIONAL')
    expect(session.user.email).toBe('novo.medico@clinica.com')
    expect(session.user.name).toBe('Helena Souza')
  })

  it.each(['1234', '0001', '9999'])('codigo errado %s devolve 401', async (code) => {
    await expect(
      testDependencies().verifyCode('paciente@teste.com', code),
    ).rejects.toMatchObject({ kind: 'unauthorized' })
  })

  it.each(['', '0', '00', '000'])(
    'codigo incompleto %s para no caso de uso',
    async (code) => {
      await expect(
        testDependencies().verifyCode('paciente@teste.com', code),
      ).rejects.toBeInstanceOf(ValidationError)
    },
  )

  it('caracteres nao numericos sao descartados antes de contar', async () => {
    const session = await testDependencies().verifyCode('paciente@teste.com', '0-0 0a0')
    expect(session.user.profile).toBe('PACIENTE')
  })

  it('reenvio de codigo responde sem corpo', async () => {
    await expect(
      testDependencies().resendCode('paciente@teste.com'),
    ).resolves.toBeUndefined()
  })

  it('catalogo profissional traz conselhos e UFs', async () => {
    const catalog = await testDependencies().loadProfessionalCatalog()
    expect(catalog.councils.map((item) => item.id)).toEqual([
      'CRM',
      'COREN',
      'CRO',
      'CRP',
      'CREFITO',
      'CREF',
    ])
    expect(catalog.states.length).toBeGreaterThan(0)
  })
})

describe('Busca de oportunidades', () => {
  it('busca sem filtro traz a primeira pagina', async () => {
    const page = await testDependencies().searchOpportunities(emptyCriteria())
    expect(page.page).toBe(1)
    expect(page.items).toHaveLength(6)
    expect(page.totalItems).toBe(14)
    expect(page.totalPages).toBe(3)
  })

  it('a ultima pagina traz o resto', async () => {
    const page = await testDependencies().searchOpportunities({
      ...emptyCriteria(),
      page: 3,
    })
    expect(page.items).toHaveLength(2)
  })

  it('pagina fora do intervalo e presa no limite', async () => {
    const page = await testDependencies().searchOpportunities({
      ...emptyCriteria(),
      page: 99,
    })
    expect(page.page).toBe(3)
  })

  it('paginas nao repetem itens', async () => {
    const deps = testDependencies()
    const first = await deps.searchOpportunities({ ...emptyCriteria(), page: 1 })
    const second = await deps.searchOpportunities({ ...emptyCriteria(), page: 2 })
    const ids = new Set(first.items.map((item) => item.id))
    expect(second.items.every((item) => !ids.has(item.id))).toBe(true)
  })

  it('filtro de especialidade reduz o resultado', async () => {
    const page = await testDependencies().searchOpportunities({
      ...emptyCriteria(),
      specialties: ['psicologia'],
    })
    expect(page.totalItems).toBe(3)
    expect(page.items.every((item) => item.specialtyId === 'psicologia')).toBe(true)
  })

  it('filtros se somam em vez de se substituir', async () => {
    const deps = testDependencies()
    const wide = await deps.searchOpportunities({
      ...emptyCriteria(),
      specialties: ['psicologia'],
    })
    const narrow = await deps.searchOpportunities({
      ...emptyCriteria(),
      specialties: ['psicologia'],
      modalities: ['online'],
    })
    expect(narrow.totalItems).toBeLessThanOrEqual(wide.totalItems)
    expect(narrow.totalItems).toBeGreaterThan(0)
  })

  it.each(['PSICOLOGIA', 'psicologia', 'Psicología'])(
    'busca por %s ignora acento e caixa',
    async (term) => {
      const page = await testDependencies().searchOpportunities({
        ...emptyCriteria(),
        term,
      })
      expect(page.items.length).toBeGreaterThan(0)
    },
  )

  it('termo sem resultado devolve pagina vazia', async () => {
    const page = await testDependencies().searchOpportunities({
      ...emptyCriteria(),
      term: 'zzzzz-nao-existe',
    })
    expect(page.items).toHaveLength(0)
    expect(page.totalItems).toBe(0)
  })

  it('filtro de distancia respeita o limite', async () => {
    const page = await testDependencies().searchOpportunities({
      ...emptyCriteria(),
      distance: '5',
    })
    expect(page.items.every((item) => (item.distanceKm ?? 0) <= 5)).toBe(true)
  })
})

describe('Detalhe, filtros e candidatura', () => {
  it('detalhe devolve a oportunidade pedida, nao a da fixture fixa', async () => {
    const deps = testDependencies()
    const listed = await deps.searchOpportunities(emptyCriteria())
    const target = listed.items.at(-1)
    expect(target).toBeDefined()
    const detail = await deps.loadOpportunityDetail(target!.id)
    expect(detail.id).toBe(target!.id)
    expect(detail.title).toBe(target!.title)
  })

  it('catalogo de filtros vem completo', async () => {
    const catalog = await testDependencies().loadFilters()
    expect(catalog.specialties.length).toBeGreaterThan(0)
    expect(catalog.modalities).toHaveLength(2)
    expect(catalog.offerTypes).toHaveLength(3)
  })

  it('status da candidatura traz a linha do tempo', async () => {
    const application = await testDependencies().loadApplicationStatus('app-20418')
    expect(application.protocolNumber).toBe('20418')
    expect(application.steps.length).toBeGreaterThanOrEqual(2)
    expect(application.steps[0]?.isDone).toBe(true)
  })
})
