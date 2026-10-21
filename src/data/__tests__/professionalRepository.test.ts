import { describe, expect, it } from 'vitest'
import { isDecided } from '@/domain/professional'
import { testDependencies, validOpportunityDraft } from '@/test/factories'

const repo = () => testDependencies().professionalRepository

describe('Minhas oportunidades', () => {
  it('traz a lista do profissional', async () => {
    const items = await repo().myOpportunities()
    expect(items).toHaveLength(6)
    expect(items[0]?.title).toBe('Cardiologia - vaga social')
  })

  it('mapeia o status e a modalidade de acesso', async () => {
    const items = await repo().myOpportunities()
    const draft = items.find((item) => item.id === 'op-103')
    expect(draft?.status).toBe('RASCUNHO')
    expect(draft?.accessMode).toBe('pesquisa')
    expect(draft?.price).toBeNull()
  })

  it('preserva vagas preenchidas e total separados', async () => {
    const items = await repo().myOpportunities()
    const item = items.find((entry) => entry.id === 'op-101')
    expect(item?.filledVacancies).toBe(3)
    expect(item?.totalVacancies).toBe(5)
  })
})

describe('Encerrar oportunidade', () => {
  it('muda o status para encerrada', async () => {
    const repository = repo()
    const before = (await repository.myOpportunities()).find((i) => i.id === 'op-105')
    expect(before?.status).toBe('ATIVA')

    await repository.closeOpportunity('op-105')

    const after = (await repository.myOpportunities()).find((i) => i.id === 'op-105')
    expect(after?.status).toBe('ENCERRADA')
  })

  it('nao remove a oportunidade da lista', async () => {
    const repository = repo()
    await repository.closeOpportunity('op-105')
    expect(await repository.myOpportunities()).toHaveLength(6)
  })

  it('id inexistente responde 404', async () => {
    await expect(repo().closeOpportunity('op-999')).rejects.toMatchObject({
      kind: 'notFound',
    })
  })

  it('encerrar nao deixa a oportunidade encerravel de novo', async () => {
    const repository = repo()
    await repository.closeOpportunity('op-105')
    const item = (await repository.myOpportunities()).find((i) => i.id === 'op-105')
    expect(item?.status).toBe('ENCERRADA')
  })
})

describe('Excluir oportunidade', () => {
  it('some da lista', async () => {
    const repository = repo()
    await repository.deleteOpportunity('op-101')
    const items = await repository.myOpportunities()
    expect(items).toHaveLength(5)
    expect(items.some((item) => item.id === 'op-101')).toBe(false)
  })

  it('id inexistente responde 404', async () => {
    await expect(repo().deleteOpportunity('op-999')).rejects.toMatchObject({
      kind: 'notFound',
    })
  })

  it('excluir duas vezes falha na segunda', async () => {
    const repository = repo()
    await repository.deleteOpportunity('op-101')
    await expect(repository.deleteOpportunity('op-101')).rejects.toMatchObject({
      kind: 'notFound',
    })
  })
})

describe('Criar oportunidade', () => {
  it('nasce ativa e sem vagas preenchidas', async () => {
    const created = await repo().createOpportunity(validOpportunityDraft())
    expect(created.status).toBe('ATIVA')
    expect(created.filledVacancies).toBe(0)
    expect(created.applicationCount).toBe(0)
  })

  it('leva os dados do rascunho', async () => {
    const draft = {
      ...validOpportunityDraft(),
      title: 'Psicologia infantil',
      totalVacancies: '12',
    }
    const created = await repo().createOpportunity(draft)
    expect(created.title).toBe('Psicologia infantil')
    expect(created.totalVacancies).toBe(12)
    expect(created.specialtyId).toBe('cardiologia')
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
  })
})

describe('Solicitacoes recebidas', () => {
  it('traz a lista com status mapeado', async () => {
    const items = await repo().receivedRequests()
    expect(items).toHaveLength(4)
    expect(items.map((item) => item.status)).toEqual([
      'APROVADA',
      'EM_ANALISE',
      'APROVADA',
      'RECUSADA',
    ])
  })

  it('preserva o indicador de mensagem nao lida', async () => {
    const items = await repo().receivedRequests()
    expect(items.filter((item) => item.hasUnreadMessage)).toHaveLength(2)
  })

  it('detalhe traz triagem, documentos e mensagens', async () => {
    const detail = await repo().requestDetail('req-001')
    expect(detail.patientName).toBe('Ana Souza')
    expect(detail.triage).toHaveLength(4)
    expect(detail.documents).toHaveLength(2)
    expect(detail.messages).toHaveLength(2)
  })

  it('detalhe reflete o paciente pedido, nao um fixo', async () => {
    const detail = await repo().requestDetail('req-002')
    expect(detail.id).toBe('req-002')
    expect(detail.patientName).toBe('Carlos Lima')
    expect(detail.opportunityTitle).toBe('Fisioterapia ortopedica')
  })

  it('solicitacao inexistente responde 404', async () => {
    await expect(repo().requestDetail('req-999')).rejects.toMatchObject({
      kind: 'notFound',
    })
  })
})

describe('Decisao sobre a solicitacao', () => {
  it.each(['APROVADA', 'RECUSADA', 'EM_ANALISE'] as const)(
    'registra o status %s',
    async (status) => {
      const updated = await repo().decideRequest('req-002', status)
      expect(updated.status).toBe(status)
    },
  )

  it('a decisao aparece na lista depois', async () => {
    const repository = repo()
    await repository.decideRequest('req-002', 'APROVADA')
    const item = (await repository.receivedRequests()).find((i) => i.id === 'req-002')
    expect(item?.status).toBe('APROVADA')
    expect(isDecided(item!.status)).toBe(true)
  })

  it('aprovar libera a conversa com o paciente', async () => {
    const repository = repo()
    const before = (await repository.receivedRequests()).find((i) => i.id === 'req-004')
    expect(before?.canMessage).toBe(false)

    await repository.decideRequest('req-004', 'APROVADA')

    const after = (await repository.receivedRequests()).find((i) => i.id === 'req-004')
    expect(after?.canMessage).toBe(true)
  })

  it('recusar fecha a conversa', async () => {
    const repository = repo()
    await repository.decideRequest('req-001', 'RECUSADA')
    const item = (await repository.receivedRequests()).find((i) => i.id === 'req-001')
    expect(item?.canMessage).toBe(false)
  })

  it('a decisao pode ser revista', async () => {
    const repository = repo()
    await repository.decideRequest('req-002', 'APROVADA')
    const updated = await repository.decideRequest('req-002', 'RECUSADA')
    expect(updated.status).toBe('RECUSADA')
  })

  it('solicitacao inexistente responde 404', async () => {
    await expect(repo().decideRequest('req-999', 'APROVADA')).rejects.toMatchObject({
      kind: 'notFound',
    })
  })
})

describe('Mensagens', () => {
  it('a resposta volta como do profissional', async () => {
    const message = await repo().sendMessage('req-001', 'Bom dia, pode sim!')
    expect(message.author).toBe('PROFISSIONAL')
    expect(message.text).toBe('Bom dia, pode sim!')
    expect(message.id).not.toBe('')
  })

  it.each(['', '   '])('mensagem vazia e recusada com 422', async (text) => {
    await expect(repo().sendMessage('req-001', text)).rejects.toMatchObject({
      status: 422,
    })
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
    expect(items.some((item) => item.id === 'op-101')).toBe(true)
  })

  it('as solicitacoes tambem voltam', async () => {
    const items = await repo().receivedRequests()
    expect(items.find((item) => item.id === 'req-002')?.status).toBe('EM_ANALISE')
  })
})

describe('Carregar uma oportunidade para edicao', () => {
  it('traz a oportunidade pedida', async () => {
    const item = await repo().opportunity('op-105')
    expect(item.id).toBe('op-105')
    expect(item.title).toBe('Psicologia adulto')
    expect(item.status).toBe('ATIVA')
  })

  it('id inexistente responde 404', async () => {
    await expect(repo().opportunity('op-999')).rejects.toMatchObject({
      kind: 'notFound',
    })
  })
})

describe('Editar oportunidade', () => {
  it('salva o que mudou', async () => {
    const repository = repo()
    const updated = await repository.updateOpportunity('op-105', {
      ...validOpportunityDraft(),
      title: 'Psicologia adulto e adolescente',
      totalVacancies: '15',
    })
    expect(updated.title).toBe('Psicologia adulto e adolescente')
    expect(updated.totalVacancies).toBe(15)
  })

  it('a mudanca aparece na lista', async () => {
    const repository = repo()
    await repository.updateOpportunity('op-105', {
      ...validOpportunityDraft(),
      title: 'Titulo novo',
    })
    const item = (await repository.myOpportunities()).find((i) => i.id === 'op-105')
    expect(item?.title).toBe('Titulo novo')
  })

  it('editar nao cria uma oportunidade a mais', async () => {
    const repository = repo()
    await repository.updateOpportunity('op-105', validOpportunityDraft())
    expect(await repository.myOpportunities()).toHaveLength(6)
  })

  it('preserva as vagas ja preenchidas e as solicitacoes', async () => {
    const repository = repo()
    const before = await repository.opportunity('op-105')
    const updated = await repository.updateOpportunity('op-105', {
      ...validOpportunityDraft(),
      totalVacancies: '20',
    })
    expect(updated.filledVacancies).toBe(before.filledVacancies)
    expect(updated.applicationCount).toBe(before.applicationCount)
  })

  it('oportunidade encerrada nao pode ser editada', async () => {
    await expect(
      repo().updateOpportunity('op-101', validOpportunityDraft()),
    ).rejects.toMatchObject({ status: 422 })
  })

  it('encerrar e depois tentar editar tambem e barrado', async () => {
    const repository = repo()
    await repository.closeOpportunity('op-105')
    await expect(
      repository.updateOpportunity('op-105', validOpportunityDraft()),
    ).rejects.toMatchObject({ status: 422 })
  })

  it('id inexistente responde 404', async () => {
    await expect(
      repo().updateOpportunity('op-999', validOpportunityDraft()),
    ).rejects.toMatchObject({ kind: 'notFound' })
  })

  it('rascunho pode ser editado', async () => {
    const updated = await repo().updateOpportunity('op-103', {
      ...validOpportunityDraft(),
      title: 'Estudo revisado',
    })
    expect(updated.title).toBe('Estudo revisado')
  })
})
