import { describe, expect, it } from 'vitest'
import { draftFromManagedOpportunity } from '@/data/professionalMappers'
import { authorizationLog, requestLog } from '@/data/network/mockBackend'
import { DEFAULT_QUESTIONS, emptyOpportunityDraft } from '@/domain/opportunityDraft'
import { isDecided } from '@/domain/professional'
import { testDependencies, validOpportunityDraft, validProfessionalDraft } from '@/test/factories'

const repo = () => testDependencies().professionalRepository

describe('Autenticacao das rotas do profissional', () => {
  it('toda chamada leva o token da sessao', async () => {
    const repository = repo()
    await repository.myOpportunities()
    await repository.receivedRequests()
    await repository.requestDetail('req-001')
    expect(authorizationLog).toEqual([
      'Bearer mock.profissional@teste.com',
      'Bearer mock.profissional@teste.com',
      'Bearer mock.profissional@teste.com',
    ])
  })

  it('sem sessao a rota responde 401', async () => {
    await expect(testDependencies(null).professionalRepository.myOpportunities()).rejects.toMatchObject({
      kind: 'unauthorized',
    })
  })

  it('401 numa rota do painel avisa a sessao, que encerra', async () => {
    const dependencies = testDependencies()
    dependencies.tokens.set('expired')
    let expired = false
    dependencies.tokens.onExpired(() => {
      expired = true
    })
    await expect(dependencies.professionalRepository.receivedRequests()).rejects.toMatchObject({
      kind: 'unauthorized',
    })
    expect(expired).toBe(true)
    expect(dependencies.tokens.get()).toBeNull()
  })

  it('paciente logado recebe 403, nao 401', async () => {
    await expect(
      testDependencies('paciente@teste.com').professionalRepository.myOpportunities(),
    ).rejects.toMatchObject({ kind: 'forbidden', status: 403 })
  })
})

describe('Minhas oportunidades', () => {
  it('GET /profissional-saude/oportunidades traz a lista como array', async () => {
    const items = await repo().myOpportunities()
    expect(requestLog).toEqual(['GET /profissional-saude/oportunidades'])
    expect(items).toHaveLength(6)
    expect(items[0]?.title).toBe('Cardiologia - vaga social')
  })

  it('mapeia status e modalidades do fio para o dominio', async () => {
    const items = await repo().myOpportunities()
    const draft = items.find((item) => item.id === 'op-103')
    expect(draft?.status).toBe('RASCUNHO')
    expect(draft?.accessMode).toBe('pesquisa')
    expect(draft?.price).toBeNull()
    const social = items.find((item) => item.id === 'op-104')
    expect(social?.accessMode).toBe('preco-social')
    expect(social?.modality).toBe('online')
  })

  it('preserva vagas preenchidas, total e inscricoes', async () => {
    const items = await repo().myOpportunities()
    const item = items.find((entry) => entry.id === 'op-101')
    expect(item?.filledVacancies).toBe(3)
    expect(item?.totalVacancies).toBe(5)
    expect(item?.applicationCount).toBe(4)
  })

  it('traz a triagem salva, no formulario padrao', async () => {
    const item = (await repo().myOpportunities()).find((entry) => entry.id === 'op-101')
    expect(item?.triage.mode).toBe('PADRAO')
    expect(item?.triage.questions).toEqual(DEFAULT_QUESTIONS)
    expect(item?.triage.documents).toEqual([
      { id: 'rg', label: 'RG' },
      { id: 'encaminhamento', label: 'Encaminhamento médico' },
    ])
  })
})

describe('Encerrar oportunidade', () => {
  it('POST /oportunidades/{id}/encerrar muda o status para encerrada', async () => {
    const repository = repo()
    await repository.closeOpportunity('op-105')
    expect(requestLog).toContain('POST /oportunidades/op-105/encerrar')
    const after = (await repository.myOpportunities()).find((i) => i.id === 'op-105')
    expect(after?.status).toBe('ENCERRADA')
  })

  it('nao remove a oportunidade da lista', async () => {
    const repository = repo()
    await repository.closeOpportunity('op-105')
    expect(await repository.myOpportunities()).toHaveLength(6)
  })

  it('id inexistente responde 404', async () => {
    await expect(repo().closeOpportunity('op-999')).rejects.toMatchObject({ kind: 'notFound' })
  })

  it('so ativa pode ser encerrada: encerrada e rascunho dao 409', async () => {
    await expect(repo().closeOpportunity('op-101')).rejects.toMatchObject({ kind: 'conflict' })
    await expect(repo().closeOpportunity('op-103')).rejects.toMatchObject({ kind: 'conflict' })
  })
})

describe('Excluir oportunidade', () => {
  it('rascunho some da lista', async () => {
    const repository = repo()
    await repository.deleteOpportunity('op-103')
    expect(requestLog).toContain('DELETE /oportunidades/op-103')
    const items = await repository.myOpportunities()
    expect(items).toHaveLength(5)
    expect(items.some((item) => item.id === 'op-103')).toBe(false)
  })

  it.each(['op-101', 'op-105'])('%s nao e rascunho e responde 409', async (id) => {
    await expect(repo().deleteOpportunity(id)).rejects.toMatchObject({
      kind: 'conflict',
      apiMessage: 'Só rascunho pode ser excluído.',
    })
  })

  it('id inexistente responde 404', async () => {
    await expect(repo().deleteOpportunity('op-999')).rejects.toMatchObject({ kind: 'notFound' })
  })

  it('excluir duas vezes falha na segunda', async () => {
    const repository = repo()
    await repository.deleteOpportunity('op-103')
    await expect(repository.deleteOpportunity('op-103')).rejects.toMatchObject({
      kind: 'notFound',
    })
  })
})

describe('Criar oportunidade', () => {
  it('POST /oportunidades nasce ativa, sem vagas preenchidas e com o ofertante', async () => {
    const created = await repo().createOpportunity(validOpportunityDraft())
    expect(requestLog).toEqual(['POST /oportunidades'])
    expect(created.status).toBe('ATIVA')
    expect(created.filledVacancies).toBe(0)
    expect(created.applicationCount).toBe(0)
  })

  it('leva os dados do rascunho', async () => {
    const created = await repo().createOpportunity({
      ...validOpportunityDraft(),
      title: 'Psicologia infantil',
      totalVacancies: '12',
    })
    expect(created.title).toBe('Psicologia infantil')
    expect(created.totalVacancies).toBe(12)
    expect(created.specialtyId).toBe('cardiologia')
  })

  it('a triagem padrao volta igual, com os 8 ids e as dependencias', async () => {
    const created = await repo().createOpportunity(validOpportunityDraft())
    expect(created.triage.mode).toBe('PADRAO')
    expect(created.triage.questions).toEqual(DEFAULT_QUESTIONS)
  })

  it('aparece no topo da lista depois de criada', async () => {
    const repository = repo()
    const created = await repository.createOpportunity(validOpportunityDraft())
    const items = await repository.myOpportunities()
    expect(items).toHaveLength(7)
    expect(items[0]?.id).toBe(created.id)
  })

  it('preco social envia o valor; gratuito envia nulo', async () => {
    const repository = repo()
    const paid = await repository.createOpportunity({
      ...validOpportunityDraft(),
      accessMode: 'preco-social',
      price: '60,00',
    })
    expect(paid.price).toBeCloseTo(60)
    expect(paid.accessMode).toBe('preco-social')

    const free = await repository.createOpportunity({
      ...validOpportunityDraft(),
      accessMode: 'gratuito',
      price: '60',
    })
    expect(free.price).toBeNull()
  })

  it('online nao envia endereco', async () => {
    const created = await repo().createOpportunity({
      ...validOpportunityDraft(),
      modality: 'online',
      address: 'Rua das Flores, 120',
    })
    expect(created.address).toBeNull()
    expect(created.cep).toBeNull()
  })

  it('publicar com descricao curta e recusado com 400 e o motivo', async () => {
    await expect(
      repo().createOpportunity({ ...validOpportunityDraft(), description: 'Curta demais' }),
    ).rejects.toMatchObject({
      kind: 'badRequest',
      apiMessage: 'A descrição precisa ter de 40 a 600 caracteres.',
    })
  })

  it('profissional em verificacao pode salvar rascunho, mas publicar da 403', async () => {
    const dependencies = testDependencies(null)
    const draft = validProfessionalDraft()
    await dependencies.signUp(draft)
    const session = await dependencies.verifyCode(draft.email, '0000')
    dependencies.tokens.set(session!.token)
    const repository = dependencies.professionalRepository

    await expect(repository.createOpportunity(validOpportunityDraft())).rejects.toMatchObject({
      kind: 'forbidden',
      status: 403,
    })
    const saved = await repository.createOpportunity(validOpportunityDraft(), true)
    expect(saved.status).toBe('RASCUNHO')
  })
})

describe('Solicitacoes recebidas', () => {
  it('GET /profissional-saude/inscricoes traz as 7, das mais recentes para as mais antigas', async () => {
    const items = await repo().receivedRequests()
    expect(requestLog).toEqual(['GET /profissional-saude/inscricoes'])
    expect(items.map((item) => item.patientName)).toEqual([
      'Ana Souza',
      'Paulo Mendes',
      'Carlos Lima',
      'Luiza Fernandes',
      'Rafael Costa',
      'Beatriz Alves',
      'João Santos',
    ])
  })

  it('a lista cobre os 6 estados do contrato', async () => {
    const statuses = new Set((await repo().receivedRequests()).map((item) => item.status))
    expect([...statuses].sort()).toEqual([
      'AGUARDANDO_INFORMACOES',
      'APROVADA',
      'CANCELADA',
      'EM_ANALISE',
      'RECEBIDA',
      'RECUSADA',
    ])
  })

  it('?status= filtra no servidor', async () => {
    const items = await repo().receivedRequests('APROVADA')
    expect(requestLog).toEqual(['GET /profissional-saude/inscricoes?status=APROVADA'])
    expect(items.map((item) => item.patientName)).toEqual(['Ana Souza', 'Beatriz Alves'])
  })

  it('protocolo, prazo, nao lidas e permissao de mensagem vem da inscricao', async () => {
    const items = await repo().receivedRequests()
    const ana = items.find((item) => item.id === 'req-001')!
    expect(ana.protocol).toBe('20418')
    expect(ana.hasUnreadMessage).toBe(true)
    expect(ana.canMessage).toBe(true)
    expect(ana.deadline).not.toBeNull()
    expect(items.filter((item) => item.canMessage).map((item) => item.id)).toEqual([
      'req-001',
      'req-003',
    ])
  })

  it('detalhe traz triagem com o id da pergunta, documentos e mensagens', async () => {
    const detail = await repo().requestDetail('req-001')
    expect(detail.patientName).toBe('Ana Souza')
    expect(detail.triage).toHaveLength(8)
    expect(detail.triage[0]).toEqual({
      questionId: 'motivo',
      question: 'Qual o motivo principal?',
      answer: 'Dor no peito ao esforço',
    })
    expect(detail.documents.map((item) => [item.documentId, item.name, item.sizeKb])).toEqual([
      ['rg', 'RG_frente.jpg', 420],
      ['encaminhamento', 'Encaminhamento.pdf', 128],
    ])
    expect(detail.messages.map((item) => [item.author, item.authorName])).toEqual([
      ['PACIENTE', 'Ana Souza'],
      ['PROFISSIONAL', 'Marcos Vieira'],
    ])
    expect(detail.agreement?.when).toBe('A combinar')
  })

  it('detalhe reflete o paciente pedido, nao um fixo', async () => {
    const detail = await repo().requestDetail('req-002')
    expect(detail.id).toBe('req-002')
    expect(detail.patientName).toBe('Carlos Lima')
    expect(detail.opportunityTitle).toBe('Fisioterapia ortopédica')
    expect(detail.messages).toEqual([])
  })

  it('aguardando informacoes traz o pedido e o prazo', async () => {
    const detail = await repo().requestDetail('req-006')
    expect(detail.status).toBe('AGUARDANDO_INFORMACOES')
    expect(detail.infoRequest?.text).toBe(
      'Pode enviar a foto do Cartão do SUS? O arquivo veio cortado.',
    )
    expect(detail.infoRequest?.deadline).not.toBeNull()
  })

  it('cancelada nao tem respostas nem documentos', async () => {
    const detail = await repo().requestDetail('req-007')
    expect(detail.status).toBe('CANCELADA')
    expect(detail.triage).toEqual([])
    expect(detail.documents).toEqual([])
    expect(isDecided(detail.status)).toBe(true)
  })

  it('recusada traz o motivo', async () => {
    const detail = await repo().requestDetail('req-004')
    expect(detail.decisionReason).toBe('As vagas desta turma são para recuperação pós-cirúrgica.')
  })

  it('solicitacao inexistente responde 404', async () => {
    await expect(repo().requestDetail('req-999')).rejects.toMatchObject({ kind: 'notFound' })
  })
})

describe('Decisao sobre a solicitacao', () => {
  it('aprovar envia o combinado e libera as mensagens', async () => {
    const repository = repo()
    const agreement = { when: 'Terça, 10h', where: 'Quadra 302, Brasília', bring: 'RG' }
    const updated = await repository.decideRequest('req-002', 'APROVADA', { agreement })
    expect(requestLog).toContain('POST /profissional-saude/inscricoes/req-002/decisao')
    expect(updated.status).toBe('APROVADA')
    expect(updated.agreement).toEqual(agreement)
    expect(updated.canMessage).toBe(true)
    expect(updated.decidedAt).not.toBeNull()
  })

  it('aprovar soma uma vaga preenchida na oportunidade', async () => {
    const repository = repo()
    await repository.decideRequest('req-002', 'APROVADA')
    const opportunity = await repository.opportunity('op-102')
    expect(opportunity.filledVacancies).toBe(9)
  })

  it('aprovar sem vagas restantes responde 409', async () => {
    const repository = repo()
    // op-105 tem 2 de 8 preenchidas; reduzir para 2 vagas a deixa lotada.
    const current = await repository.opportunity('op-105')
    await repository.updateOpportunity('op-105', {
      ...draftFromManagedOpportunity(current),
      totalVacancies: '2',
    })
    await expect(repository.decideRequest('req-005', 'APROVADA')).rejects.toMatchObject({
      kind: 'conflict',
      apiMessage: 'Não há vagas restantes nesta oportunidade.',
    })
  })

  it('recusar envia o motivo e fecha a conversa', async () => {
    const repository = repo()
    const updated = await repository.decideRequest('req-002', 'RECUSADA', {
      reason: '  Vagas so para moradores de Ceilandia.  ',
    })
    expect(updated.status).toBe('RECUSADA')
    expect(updated.decisionReason).toBe('Vagas so para moradores de Ceilandia.')
    expect(updated.canMessage).toBe(false)
    expect(updated.agreement).toBeNull()
  })

  it('recusar sem motivo responde 400', async () => {
    await expect(repo().decideRequest('req-002', 'RECUSADA', { reason: '   ' })).rejects.toMatchObject({
      kind: 'badRequest',
      apiMessage: 'Informe o motivo da recusa.',
    })
  })

  it('a decisao aparece na lista depois', async () => {
    const repository = repo()
    await repository.decideRequest('req-005', 'APROVADA')
    const item = (await repository.receivedRequests()).find((i) => i.id === 'req-005')
    expect(item?.status).toBe('APROVADA')
  })

  it.each(['req-001', 'req-004', 'req-007'])(
    'decisao final nao volta atras: %s responde 409',
    async (id) => {
      await expect(repo().decideRequest(id, 'RECUSADA', { reason: 'Mudei de ideia agora.' })).rejects.toMatchObject({
        kind: 'conflict',
        apiMessage: 'Esta solicitação já foi decidida.',
      })
    },
  )

  it('decidir duas vezes falha na segunda', async () => {
    const repository = repo()
    await repository.decideRequest('req-002', 'APROVADA')
    await expect(
      repository.decideRequest('req-002', 'RECUSADA', { reason: 'Mudei de ideia agora.' }),
    ).rejects.toMatchObject({ kind: 'conflict' })
  })

  it('quem aguarda informacoes ainda pode ser decidido', async () => {
    const updated = await repo().decideRequest('req-006', 'APROVADA')
    expect(updated.status).toBe('APROVADA')
  })

  it('solicitacao inexistente responde 404', async () => {
    await expect(repo().decideRequest('req-999', 'APROVADA')).rejects.toMatchObject({
      kind: 'notFound',
    })
  })
})

describe('Pedir informacoes', () => {
  it('deixa o pedido aguardando, com o texto e prazo de 3 dias', async () => {
    const repository = repo()
    const before = Date.now()
    const updated = await repository.requestInfo('req-002', '  Pode enviar o raio X mais recente?  ')
    expect(requestLog).toContain('POST /profissional-saude/inscricoes/req-002/pedido-informacao')
    expect(updated.status).toBe('AGUARDANDO_INFORMACOES')
    expect(updated.infoRequest?.text).toBe('Pode enviar o raio X mais recente?')
    const days = (Date.parse(updated.infoRequest!.deadline!) - before) / (24 * 3600 * 1000)
    expect(days).toBeGreaterThanOrEqual(2.99)
    expect(days).toBeLessThan(3.01)
    const listed = (await repository.receivedRequests()).find((i) => i.id === 'req-002')
    expect(listed?.status).toBe('AGUARDANDO_INFORMACOES')
  })

  it('pedido vazio e rejeitado com 400', async () => {
    await expect(repo().requestInfo('req-002', '   ')).rejects.toMatchObject({ kind: 'badRequest' })
  })

  it('pedido ja decidido responde 409', async () => {
    await expect(repo().requestInfo('req-004', 'Falta o RG.')).rejects.toMatchObject({
      kind: 'conflict',
    })
  })

  it('solicitacao inexistente da 404', async () => {
    await expect(repo().requestInfo('req-999', 'Falta o RG.')).rejects.toMatchObject({
      kind: 'notFound',
    })
  })
})

describe('Mensagens', () => {
  it('a resposta volta como do profissional, com o nome dele', async () => {
    const message = await repo().sendMessage('req-001', 'Bom dia, pode sim!')
    expect(requestLog).toContain('POST /profissional-saude/inscricoes/req-001/mensagens')
    expect(message.author).toBe('PROFISSIONAL')
    expect(message.authorName).toBe('Marcos Vieira')
    expect(message.text).toBe('Bom dia, pode sim!')
    expect(message.id).not.toBe('')
  })

  it('a mensagem fica no detalhe depois', async () => {
    const repository = repo()
    await repository.sendMessage('req-001', 'Até terça.')
    const detail = await repository.requestDetail('req-001')
    expect(detail.messages.at(-1)?.text).toBe('Até terça.')
    expect(detail.messages).toHaveLength(3)
  })

  it.each(['', '   '])('mensagem vazia e recusada com 400', async (text) => {
    await expect(repo().sendMessage('req-001', text)).rejects.toMatchObject({ kind: 'badRequest' })
  })

  it.each(['req-002', 'req-004', 'req-007'])('fora de APROVADA (%s) responde 409', async (id) => {
    await expect(repo().sendMessage(id, 'Oi')).rejects.toMatchObject({ kind: 'conflict' })
  })

  it('mensagens em sequencia recebem ids diferentes', async () => {
    const repository = repo()
    const first = await repository.sendMessage('req-001', 'Primeira')
    const second = await repository.sendMessage('req-001', 'Segunda')
    expect(first.id).not.toBe(second.id)
  })
})

describe('Isolamento entre testes', () => {
  it('a lista volta ao estado original a cada teste', async () => {
    const items = await repo().myOpportunities()
    expect(items).toHaveLength(6)
    expect(items.some((item) => item.id === 'op-103')).toBe(true)
  })

  it('as solicitacoes tambem voltam', async () => {
    const items = await repo().receivedRequests()
    expect(items.find((item) => item.id === 'req-002')?.status).toBe('EM_ANALISE')
  })
})

describe('Carregar uma oportunidade para edicao', () => {
  it('GET /oportunidades/{id} traz a oportunidade pedida', async () => {
    const item = await repo().opportunity('op-105')
    expect(requestLog).toEqual(['GET /oportunidades/op-105'])
    expect(item.id).toBe('op-105')
    expect(item.title).toBe('Psicologia adulto')
    expect(item.status).toBe('ATIVA')
  })

  it('rascunho so aparece para o dono', async () => {
    await expect(repo().opportunity('op-103')).resolves.toMatchObject({ status: 'RASCUNHO' })
    await expect(
      testDependencies(null).professionalRepository.opportunity('op-103'),
    ).rejects.toMatchObject({ kind: 'notFound' })
  })

  it('id inexistente responde 404', async () => {
    await expect(repo().opportunity('op-999')).rejects.toMatchObject({ kind: 'notFound' })
  })
})

describe('Editar oportunidade', () => {
  it('PUT /oportunidades/{id} salva o que mudou', async () => {
    const updated = await repo().updateOpportunity('op-105', {
      ...validOpportunityDraft(),
      title: 'Psicologia adulto e adolescente',
      totalVacancies: '15',
    })
    expect(requestLog).toEqual(['PUT /oportunidades/op-105'])
    expect(updated.title).toBe('Psicologia adulto e adolescente')
    expect(updated.totalVacancies).toBe(15)
  })

  it('a mudanca aparece na lista', async () => {
    const repository = repo()
    await repository.updateOpportunity('op-105', { ...validOpportunityDraft(), title: 'Titulo novo' })
    const item = (await repository.myOpportunities()).find((i) => i.id === 'op-105')
    expect(item?.title).toBe('Titulo novo')
  })

  it('editar nao cria uma oportunidade a mais', async () => {
    const repository = repo()
    await repository.updateOpportunity('op-105', validOpportunityDraft())
    expect(await repository.myOpportunities()).toHaveLength(6)
  })

  it('preserva as vagas ja preenchidas e as inscricoes', async () => {
    const repository = repo()
    const before = await repository.opportunity('op-105')
    const updated = await repository.updateOpportunity('op-105', {
      ...validOpportunityDraft(),
      totalVacancies: '20',
    })
    expect(updated.filledVacancies).toBe(before.filledVacancies)
    expect(updated.applicationCount).toBe(before.applicationCount)
  })

  it('editar pelo formulario devolve cidade e UF que a tela nao mostra', async () => {
    const repository = repo()
    const before = await repository.opportunity('op-106')
    const updated = await repository.updateOpportunity('op-106', {
      ...draftFromManagedOpportunity(before),
      title: 'Avaliação odontológica infantil',
    })
    expect(updated.city).toBe('Brasília')
    expect(updated.state).toBe('DF')
    expect(updated.triage.documents.map((item) => item.id)).toEqual(['rg', 'sus'])
  })

  it('oportunidade encerrada nao pode ser editada: 409', async () => {
    await expect(repo().updateOpportunity('op-101', validOpportunityDraft())).rejects.toMatchObject({
      kind: 'conflict',
      apiMessage: 'Oportunidade encerrada não pode ser editada.',
    })
  })

  it('encerrar e depois tentar editar tambem e barrado', async () => {
    const repository = repo()
    await repository.closeOpportunity('op-105')
    await expect(repository.updateOpportunity('op-105', validOpportunityDraft())).rejects.toMatchObject({
      kind: 'conflict',
    })
  })

  it('id inexistente responde 404', async () => {
    await expect(repo().updateOpportunity('op-999', validOpportunityDraft())).rejects.toMatchObject({
      kind: 'notFound',
    })
  })

  it('rascunho pode ser editado', async () => {
    const updated = await repo().updateOpportunity('op-103', {
      ...validOpportunityDraft(),
      title: 'Estudo revisado',
    })
    expect(updated.title).toBe('Estudo revisado')
  })
})

describe('Rascunho', () => {
  it('salvar como rascunho nao publica e aceita campos vazios', async () => {
    const created = await repo().createOpportunity(
      { ...emptyOpportunityDraft(), title: 'Nutricao clinica' },
      true,
    )
    expect(created.status).toBe('RASCUNHO')
    expect(created.title).toBe('Nutricao clinica')
    expect(created.totalVacancies).toBe(0)
  })

  it('rascunho sem titulo e recusado com 400', async () => {
    await expect(repo().createOpportunity(emptyOpportunityDraft(), true)).rejects.toMatchObject({
      kind: 'badRequest',
    })
  })

  it('rascunho pela metade volta para o formulario como foi salvo', async () => {
    const repository = repo()
    const created = await repository.createOpportunity(
      { ...emptyOpportunityDraft(), title: 'Nutricao clinica', serviceType: 'consulta' },
      true,
    )
    const draft = draftFromManagedOpportunity(await repository.opportunity(created.id))
    expect(draft.title).toBe('Nutricao clinica')
    expect(draft.serviceType).toBe('consulta')
    expect(draft.specialtyId).toBeNull()
    expect(draft.modality).toBe('presencial')
    expect(draft.totalVacancies).toBe('')
    expect(draft.opensAt).toBe('')
  })

  it('salvar de novo como rascunho continua rascunho', async () => {
    const updated = await repo().updateOpportunity('op-103', validOpportunityDraft(), true)
    expect(updated.status).toBe('RASCUNHO')
  })

  it('publicar um rascunho o deixa ativo', async () => {
    const updated = await repo().updateOpportunity('op-103', validOpportunityDraft())
    expect(updated.status).toBe('ATIVA')
  })

  it('salvar alteracoes de uma ativa nao a transforma em rascunho', async () => {
    const updated = await repo().updateOpportunity('op-105', validOpportunityDraft(), true)
    expect(updated.status).toBe('ATIVA')
  })
})

describe('Campos do formulario', () => {
  it('a oportunidade criada guarda tipo, publico, CEP, criterios e contato', async () => {
    const created = await repo().createOpportunity({
      ...validOpportunityDraft(),
      modality: 'hibrido',
      accessMode: 'sus',
    })
    expect(created.serviceType).toBe('consulta')
    expect(created.audiences).toEqual(['adultos', 'idosos'])
    expect(created.modality).toBe('hibrido')
    expect(created.accessMode).toBe('sus')
    expect(created.cep).toBe('70000-000')
    expect(created.eligibility).toBe('Adultos sem convenio, moradores do DF.')
    expect(created.contactMethod).toBe('plataforma')
  })

  it('a fixture traz os campos para a edicao', async () => {
    const draft = draftFromManagedOpportunity(await repo().opportunity('op-105'))
    expect(draft.serviceType).toBe('terapia')
    expect(draft.audiences).toEqual(['adultos'])
    expect(draft.hasNoRestrictions).toBe(true)
    expect(draft.contactMethod).toBe('plataforma')
    expect(draft.triageMode).toBe('PADRAO')
    expect(draft.selectedDocumentIds).toEqual(['rg'])
  })
})
