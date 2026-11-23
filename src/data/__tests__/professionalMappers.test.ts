import { describe, expect, it } from 'vitest'
import {
  catalogFromDTO,
  fromWireEnum,
  nameFromEmail,
  pendingVerificationFromDTO,
  profileFromWire,
  sessionFromDTO,
  signUpDraftToDTO,
  toWireEnum,
  registrationFromMe,
} from '@/data/mappers'
import {
  decisionToDTO,
  draftFromManagedOpportunity,
  draftToDTO,
  managedOpportunityFromDTO,
  questionFromDTO,
  questionToDTO,
  receivedRequestFromDTO,
  requestDetailFromDTO,
  requestMessageFromDTO,
  triageFromDTO,
} from '@/data/professionalMappers'
import type { CatalogosDTO } from '@/data/dto'
import type { InscricaoDTO, OportunidadeDTO, PerguntaDTO } from '@/data/professionalDto'
import { loadFixture } from '@/data/network/mockBackend'
import {
  ACCESS_MODES,
  AUDIENCES,
  CARE_MODALITIES,
  CONTACT_METHODS,
  SERVICE_TYPES,
} from '@/domain/professional'
import {
  DEFAULT_QUESTIONS,
  addDocument,
  applyTriageMode,
  saveQuestion,
  newQuestion,
} from '@/domain/opportunityDraft'
import { validOpportunityDraft, validProfessionalDraft } from '@/test/factories'

/** O formulario padrao exatamente como esta na secao 6 do contrato. */
const CONTRACT_DEFAULT_FORM: PerguntaDTO[] = [
  { id: 'motivo', rotulo: 'Qual o motivo principal?', tipo: 'TEXTO_LONGO', obrigatoria: true, minCaracteres: 10, maxCaracteres: 300 },
  { id: 'tempo', rotulo: 'Há quanto tempo?', tipo: 'MULTIPLA', obrigatoria: true, opcoes: ['Menos de 1 semana', 'De 1 a 4 semanas', 'De 1 a 6 meses', 'Mais de 6 meses'] },
  { id: 'diagnostico', rotulo: 'Já tem diagnóstico?', tipo: 'SIM_NAO', obrigatoria: true },
  { id: 'qual-diagnostico', rotulo: 'Qual diagnóstico?', tipo: 'TEXTO_CURTO', obrigatoria: true, dependeDe: { perguntaId: 'diagnostico', resposta: 'Sim' } },
  { id: 'medicacao', rotulo: 'Usa medicação contínua?', tipo: 'SIM_NAO', obrigatoria: true },
  { id: 'quais-medicacoes', rotulo: 'Quais medicações?', tipo: 'TEXTO_CURTO', obrigatoria: true, dependeDe: { perguntaId: 'medicacao', resposta: 'Sim' } },
  { id: 'urgencia', rotulo: 'Urgência percebida', tipo: 'MULTIPLA', obrigatoria: true, opcoes: ['Baixa', 'Média', 'Alta'], ajuda: 'Alta: atrapalha suas atividades do dia a dia.' },
  { id: 'horario', rotulo: 'Melhor horário', tipo: 'MULTIPLA', obrigatoria: false, opcoes: ['Manhã', 'Tarde', 'Noite'], permiteVarias: true },
]

const opportunities = () => loadFixture<OportunidadeDTO[]>('oportunidades_profissional')
const requests = () => loadFixture<InscricaoDTO[]>('inscricoes')

describe('Valores fechados no fio', () => {
  it.each([
    ['preco-social', 'PRECO_SOCIAL'],
    ['gratuito', 'GRATUITO'],
    ['hibrido', 'HIBRIDO'],
    ['criancas', 'CRIANCAS'],
    ['plataforma', 'PLATAFORMA'],
    ['consulta', 'CONSULTA'],
  ])('%s vai como %s e volta igual', (domain, wire) => {
    expect(toWireEnum(domain)).toBe(wire)
    expect(fromWireEnum(wire)).toBe(domain)
  })

  it('todo valor do dominio faz a ida e volta', () => {
    for (const value of [...ACCESS_MODES, ...CARE_MODALITIES, ...SERVICE_TYPES, ...AUDIENCES, ...CONTACT_METHODS]) {
      expect(fromWireEnum(toWireEnum(value))).toBe(value)
    }
  })

  it('nulo vira texto vazio, que o dominio trata como desconhecido', () => {
    expect(fromWireEnum(null)).toBe('')
    expect(fromWireEnum(undefined)).toBe('')
  })

  it('perfil do fio para o dominio', () => {
    expect(profileFromWire('PROFISSIONAL_SAUDE')).toBe('PROFISSIONAL')
    expect(profileFromWire('PACIENTE')).toBe('PACIENTE')
    expect(profileFromWire('ADMIN')).toBe('DESCONHECIDO')
    expect(profileFromWire(null)).toBe('DESCONHECIDO')
  })
})

describe('Acesso', () => {
  it('tira um nome legivel do e-mail quando o /me nao responde', () => {
    expect(nameFromEmail('ana.souza@exemplo.com')).toBe('Ana Souza')
    expect(nameFromEmail('MARCOS_vieira-2@x.com')).toBe('Marcos Vieira 2')
    expect(nameFromEmail('@x.com')).toBe('@x.com')
  })

  it('nome vazio no /me tambem cai no e-mail', () => {
    const login = { token: 't', autenticado: true, tipoPerfil: 'PROFISSIONAL_SAUDE', validadoInstitucionalmente: true }
    const me = { id: 'u1', email: 'ana@x.com', tipoPerfil: 'PROFISSIONAL_SAUDE', nome: '  ' }
    expect(sessionFromDTO(login, me, 'ana@x.com').user.name).toBe('Ana')
  })

  it('a parte dados do cadastro segue o contrato, sem documentosRegistro', () => {
    const dto = signUpDraftToDTO(validProfessionalDraft())
    expect(Object.keys(dto).sort()).toEqual([
      'acceptedTerms',
      'aceitouTermos',
      'biografiaOuDescricao',
      'conselho',
      'especialidade',
      'nome',
      'numeroRegistro',
      'ondeAtende',
      'tipoPerfil',
      'uf',
      'usuarioDto',
    ])
    expect(dto).toMatchObject({ conselho: 'CRM', uf: 'DF', numeroRegistro: '123456' })
  })

  it('especialidade e local vazios vao nulos', () => {
    const base = validProfessionalDraft()
    const dto = signUpDraftToDTO({
      ...base,
      professional: { ...base.professional, specialtyId: null, workplace: '   ' },
    })
    expect(dto.especialidade).toBeNull()
    expect(dto.ondeAtende).toBeNull()
  })

  it('cadastro sem codigo nao pede a tela de verificacao', () => {
    expect(
      pendingVerificationFromDTO(
        { email: 'a@b.com', tipoPerfil: 'PROFISSIONAL_SAUDE', exigeVerificacao: false },
        'a@b.com',
      ),
    ).toEqual({ email: 'a@b.com', profile: 'PROFISSIONAL', codeLength: 0, requiresCode: false })
  })

  it('codigo sem tamanho informado usa 4 digitos', () => {
    expect(
      pendingVerificationFromDTO(
        { email: 'a@b.com', tipoPerfil: 'PROFISSIONAL_SAUDE', exigeVerificacao: true },
        'a@b.com',
      ).codeLength,
    ).toBe(4)
  })

  it('catalogo: conselho pela sigla, UF como texto, especialidade com nome', () => {
    const catalog = catalogFromDTO(loadFixture<CatalogosDTO>('catalogos'))
    expect(catalog.councils[0]).toEqual({ id: 'CRM', label: 'CRM' })
    expect(catalog.states.map((item) => item.id)).toContain('DF')
    expect(catalog.specialties[0]).toEqual({ id: 'cardiologia', label: 'Cardiologia' })
  })
})

describe('Pergunta', () => {
  it('o formulario padrao do dominio sai igual ao da secao 6 do contrato', () => {
    expect(DEFAULT_QUESTIONS.map(questionToDTO)).toEqual(CONTRACT_DEFAULT_FORM)
  })

  it('e o da secao 6 volta igual ao do dominio', () => {
    expect(CONTRACT_DEFAULT_FORM.map(questionFromDTO)).toEqual(DEFAULT_QUESTIONS)
  })

  it('opcoes so vao na multipla escolha, e limites so nas de texto', () => {
    const yesNo = questionToDTO({
      ...newQuestion(),
      label: 'Fuma?',
      type: 'SIM_NAO',
      options: ['sobra'],
      minLength: 3,
      allowsMultiple: true,
    })
    expect(yesNo).toEqual({ id: yesNo.id, rotulo: 'Fuma?', tipo: 'SIM_NAO', obrigatoria: true })
  })

  it('tipo desconhecido vira texto curto, sem opcoes', () => {
    const question = questionFromDTO({ id: 'x', rotulo: 'Data', tipo: 'DATA', obrigatoria: false, opcoes: ['a'] })
    expect(question.type).toBe('TEXTO_CURTO')
    expect(question.options).toEqual([])
  })

  it('pergunta escrita no personalizado faz a ida e volta', () => {
    const custom = {
      ...newQuestion(),
      id: 'turno',
      label: 'Qual turno prefere?',
      type: 'MULTIPLA' as const,
      options: ['Manhã', 'Tarde'],
      isRequired: false,
    }
    expect(questionFromDTO(questionToDTO(custom))).toEqual(custom)
  })

  it('triagem ausente cai no padrao com RG', () => {
    expect(triageFromDTO(null)).toEqual({
      mode: 'PADRAO',
      questions: DEFAULT_QUESTIONS,
      documents: [{ id: 'rg', label: 'RG' }],
    })
  })
})

describe('Oportunidade', () => {
  it('o corpo de criacao tem os campos do contrato e nenhum dos que o servidor calcula', () => {
    const dto = draftToDTO(validOpportunityDraft())
    expect(Object.keys(dto).sort()).toEqual(
      [
        'titulo', 'descricao', 'tipoServico', 'especialidade', 'modalidade', 'modalidadeAcesso',
        'preco', 'publicoAlvo', 'publicoAlvoObservacao', 'vagasTotais', 'cep', 'endereco', 'cidade',
        'uf', 'inscricoesDe', 'inscricoesAte', 'criteriosElegibilidade', 'semRestricoes',
        'formaContato', 'prazoRespostaDias', 'status', 'triagem',
      ].sort(),
    )
  })

  it('valores do dominio vao em MAIUSCULAS', () => {
    const dto = draftToDTO({ ...validOpportunityDraft(), accessMode: 'preco-social', price: '40', modality: 'hibrido' })
    expect(dto).toMatchObject({
      tipoServico: 'CONSULTA',
      modalidade: 'HIBRIDO',
      modalidadeAcesso: 'PRECO_SOCIAL',
      preco: 40,
      publicoAlvo: ['ADULTOS', 'IDOSOS'],
      formaContato: 'PLATAFORMA',
      status: 'ATIVA',
    })
  })

  it('a triagem padrao vai com os 8 ids e os documentos marcados', () => {
    const dto = draftToDTO(validOpportunityDraft())
    expect(dto.triagem).toEqual({
      modo: 'PADRAO',
      perguntas: CONTRACT_DEFAULT_FORM,
      documentosExigidos: [{ id: 'rg', rotulo: 'RG' }],
    })
  })

  it('documento escrito a mao vai com id outro-1', () => {
    const draft = addDocument(applyTriageMode(validOpportunityDraft(), 'PERSONALIZADO'), 'Laudo')
    expect(draftToDTO(draft).triagem?.documentosExigidos).toEqual([
      { id: 'rg', rotulo: 'RG' },
      { id: 'outro-1', rotulo: 'Laudo' },
    ])
  })

  it('online nao envia CEP nem endereco', () => {
    const dto = draftToDTO({ ...validOpportunityDraft(), modality: 'online' })
    expect(dto.cep).toBeNull()
    expect(dto.endereco).toBeNull()
  })

  it('sem restricoes nao envia o texto dos criterios', () => {
    const dto = draftToDTO({ ...validOpportunityDraft(), hasNoRestrictions: true })
    expect(dto.semRestricoes).toBe(true)
    expect(dto.criteriosElegibilidade).toBeNull()
  })

  it('rascunho vazio vai com nulos, nao com valores inventados', () => {
    const dto = draftToDTO({ ...validOpportunityDraft(), modality: null, accessMode: null, serviceType: null, specialtyId: null, totalVacancies: '', opensAt: '', description: ' ', contactMethod: null }, 'RASCUNHO')
    expect(dto).toMatchObject({
      status: 'RASCUNHO',
      modalidade: null,
      modalidadeAcesso: null,
      tipoServico: null,
      especialidade: null,
      vagasTotais: null,
      inscricoesDe: null,
      descricao: null,
      formaContato: null,
      cep: null,
      endereco: null,
    })
  })

  it.each(['op-101', 'op-102', 'op-103', 'op-104', 'op-105', 'op-106'])(
    'a fixture %s vai ao dominio, ao formulario e volta ao fio igual',
    (id) => {
      const wire = opportunities().find((item) => item.id === id)!
      const back = draftToDTO(
        draftFromManagedOpportunity(managedOpportunityFromDTO(wire)),
        wire.status === 'RASCUNHO' ? 'RASCUNHO' : 'ATIVA',
      )
      const { id: _id, ofertante: _o, vagasPreenchidas: _v, distanciaKm: _d, ultimaAtualizacao: _u, totalInscricoes: _t, ...expected } = wire
      void [_id, _o, _v, _d, _u, _t]
      expect(back).toEqual({ ...expected, status: expected.status === 'RASCUNHO' ? 'RASCUNHO' : 'ATIVA' })
    },
  )

  it('triagem personalizada salva volta para o formulario como foi escrita', () => {
    let draft = applyTriageMode(validOpportunityDraft(), 'PERSONALIZADO')
    draft = saveQuestion(draft, { ...newQuestion(), id: 'alergia', label: 'Tem alergia?' })
    draft = addDocument(draft, 'Laudo')
    const wire = { ...opportunities()[0]!, triagem: draftToDTO(draft).triagem }
    const loaded = draftFromManagedOpportunity(managedOpportunityFromDTO(wire))
    expect(loaded.triageMode).toBe('PERSONALIZADO')
    expect(loaded.questions.at(-1)?.label).toBe('Tem alergia?')
    expect(loaded.documents.at(-1)).toEqual({ id: 'outro-1', label: 'Laudo', isCustom: true })
    expect(loaded.selectedDocumentIds).toEqual(['rg', 'outro-1'])
  })

  it('totalInscricoes nulo (rota publica) vira zero', () => {
    const wire = { ...opportunities()[0]!, totalInscricoes: null }
    expect(managedOpportunityFromDTO(wire).applicationCount).toBe(0)
  })

  it('valor fechado desconhecido cai num padrao seguro', () => {
    const wire = { ...opportunities()[0]!, modalidade: 'DRIVE_THRU', modalidadeAcesso: 'PERMUTA', tipoServico: 'CIRURGIA', status: 'ARQUIVADA', publicoAlvo: ['ADULTOS', 'MARCIANOS'] }
    expect(managedOpportunityFromDTO(wire)).toMatchObject({
      modality: 'presencial',
      accessMode: 'gratuito',
      serviceType: null,
      status: 'RASCUNHO',
      audiences: ['adultos'],
    })
  })
})

describe('Inscricao', () => {
  it('a lista le paciente, oportunidade, prazo e mensagens nao lidas', () => {
    const item = receivedRequestFromDTO(requests()[0]!)
    expect(item).toEqual({
      id: 'req-001',
      protocol: '20418',
      patientName: 'Ana Souza',
      opportunityId: 'op-101',
      opportunityTitle: 'Cardiologia - vaga social',
      receivedAt: '2026-10-21T09:12:00Z',
      deadline: '2026-11-05T09:12:00Z',
      status: 'APROVADA',
      hasUnreadMessage: true,
      canMessage: true,
    })
  })

  it('o detalhe le combinado, pedido de informacao, respostas e documentos', () => {
    const waiting = requestDetailFromDTO(requests().find((item) => item.id === 'req-006')!)
    expect(waiting.infoRequest).toEqual({
      text: 'Pode enviar a foto do Cartão do SUS? O arquivo veio cortado.',
      deadline: '2026-10-23T23:59:00Z',
    })
    expect(waiting.documents[1]).toEqual({
      id: 'doc-20423-2',
      documentId: 'sus',
      name: 'Cartao_SUS.jpg',
      sizeKb: 95,
      sentAt: '2026-10-20T10:30:00Z',
    })
    const approved = requestDetailFromDTO(requests()[0]!)
    expect(approved.agreement).toEqual({
      when: 'A combinar',
      where: 'Rua das Flores, 120, Brasília',
      bring: 'RG, Encaminhamento médico',
    })
  })

  it('mensagens nulas (lista) viram lista vazia', () => {
    expect(requestDetailFromDTO({ ...requests()[0]!, mensagens: null }).messages).toEqual([])
  })

  it('o autor PROFISSIONAL_SAUDE vira PROFISSIONAL no dominio', () => {
    expect(
      requestMessageFromDTO({ id: 'm', autor: 'PROFISSIONAL_SAUDE', nomeAutor: 'Marcos', texto: 'oi', enviadaEm: 'x' }),
    ).toEqual({ id: 'm', author: 'PROFISSIONAL', authorName: 'Marcos', text: 'oi', sentAt: 'x' })
    expect(
      requestMessageFromDTO({ id: 'm', autor: 'PACIENTE', nomeAutor: 'Ana', texto: 'oi', enviadaEm: 'x' }).author,
    ).toBe('PACIENTE')
  })

  it('aprovar manda o combinado; sem ele, tudo a combinar', () => {
    expect(
      decisionToDTO('APROVADA', { agreement: { when: 'Terça', where: 'Online', bring: 'RG' } }),
    ).toEqual({ status: 'APROVADA', motivo: null, combinado: { quando: 'Terça', onde: 'Online', levar: 'RG' } })
    expect(decisionToDTO('APROVADA')).toEqual({
      status: 'APROVADA',
      motivo: null,
      combinado: { quando: 'A combinar', onde: 'A combinar', levar: '' },
    })
  })

  it('recusar manda o motivo aparado e nenhum combinado', () => {
    expect(decisionToDTO('RECUSADA', { reason: '  Sem vagas para o bairro.  ' })).toEqual({
      status: 'RECUSADA',
      motivo: 'Sem vagas para o bairro.',
      combinado: null,
    })
  })
})

describe('registro profissional no /user/me', () => {
  const login = { token: 't', autenticado: true, tipoPerfil: 'PROFISSIONAL_SAUDE', validadoInstitucionalmente: true }
  const me = {
    id: 'us-1',
    email: 'mariana@clinica.com',
    tipoPerfil: 'PROFISSIONAL_SAUDE',
    nome: 'Mariana Costa',
    situacaoRegistro: 'VERIFICADO',
    conselho: 'CRM',
    uf: 'DF',
    numeroRegistro: '123456',
  }

  it('monta o registro como o painel mostra', () => {
    expect(registrationFromMe(me)).toBe('CRM/DF 123456')
    expect(sessionFromDTO(login, me, me.email).registration).toBe('CRM/DF 123456')
  })

  it('sem uma das partes, o registro fica indefinido', () => {
    expect(registrationFromMe({ ...me, numeroRegistro: null })).toBeUndefined()
    expect(registrationFromMe(null)).toBeUndefined()
    expect('registration' in sessionFromDTO(login, null, me.email)).toBe(false)
  })
})
