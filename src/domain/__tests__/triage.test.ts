import { describe, expect, it } from 'vitest'
import {
  addDocument,
  applyTriageMode,
  canEditTriage,
  DEFAULT_QUESTIONS,
  dependencyOf,
  DOCUMENT_CATALOG,
  DraftError,
  emptyOpportunityDraft,
  newQuestion,
  possibleAnswers,
  pruneDependencies,
  QUESTION_TYPE_LABEL,
  QUESTION_TYPES,
  removeDocument,
  removeQuestion,
  saveQuestion,
  selectedDocuments,
  toggleDocument,
  validateQuestion,
  validateTriage,
  withQuestionType,
  YES,
  type DraftErrorCode,
} from '@/domain/opportunityDraft'

function codeOf(run: () => void): DraftErrorCode {
  try {
    run()
  } catch (error) {
    if (error instanceof DraftError) return error.code
    throw error
  }
  throw new Error('esperava um DraftError e nada foi lancado')
}

describe('Modo da triagem', () => {
  it('o padrao nao deixa editar perguntas nem documentos', () => {
    expect(canEditTriage(emptyOpportunityDraft())).toBe(false)
  })

  it('o personalizado deixa editar', () => {
    const draft = applyTriageMode(emptyOpportunityDraft(), 'PERSONALIZADO')
    expect(canEditTriage(draft)).toBe(true)
  })

  it('voltar ao padrao devolve as perguntas originais', () => {
    let draft = applyTriageMode(emptyOpportunityDraft(), 'PERSONALIZADO')
    draft = saveQuestion(draft, { ...newQuestion(), label: 'Pergunta nova' })
    draft = saveQuestion(draft, { ...draft.questions[0]!, label: 'Pergunta trocada' })
    expect(draft.questions).toHaveLength(9)

    draft = applyTriageMode(draft, 'PADRAO')
    expect(draft.questions).toEqual(DEFAULT_QUESTIONS)
  })

  it('escolher o mesmo modo nao mexe no rascunho', () => {
    const draft = emptyOpportunityDraft()
    expect(applyTriageMode(draft, 'PADRAO')).toBe(draft)
  })
})

describe('Perguntas', () => {
  const custom = () => applyTriageMode(emptyOpportunityDraft(), 'PERSONALIZADO')

  it('o padrao comeca com as oito perguntas do formulario do contrato', () => {
    expect(emptyOpportunityDraft().questions.map((item) => item.label)).toEqual([
      'Qual o motivo principal?',
      'Há quanto tempo?',
      'Já tem diagnóstico?',
      'Qual diagnóstico?',
      'Usa medicação contínua?',
      'Quais medicações?',
      'Urgência percebida',
      'Melhor horário',
    ])
  })

  it('pergunta nova nasce em branco, de texto curto e obrigatoria', () => {
    const question = newQuestion()
    expect(question.label).toBe('')
    expect(question.type).toBe('TEXTO_CURTO')
    expect(question.isRequired).toBe(true)
  })

  it('salvar pergunta nova entra no fim', () => {
    const draft = saveQuestion(custom(), { ...newQuestion(), label: '  Tem alergia?  ' })
    expect(draft.questions).toHaveLength(9)
    expect(draft.questions[8]?.label).toBe('Tem alergia?')
  })

  it('cada pergunta nova recebe um id proprio', () => {
    expect(newQuestion().id).not.toBe(newQuestion().id)
  })

  it('salvar pergunta existente troca so ela, no mesmo lugar', () => {
    const draft = custom()
    const target = draft.questions[1]!
    const after = saveQuestion(draft, { ...target, label: 'Ha quanto tempo sente dor?' })
    expect(after.questions).toHaveLength(8)
    expect(after.questions[1]?.label).toBe('Ha quanto tempo sente dor?')
    expect(after.questions[0]).toEqual(draft.questions[0])
  })

  it('salvar descarta as opcoes em branco', () => {
    const question = {
      ...newQuestion(),
      label: 'Qual o turno?',
      type: 'MULTIPLA' as const,
      options: ['Manha', '  ', 'Tarde ', ''],
    }
    expect(saveQuestion(custom(), question).questions[8]?.options).toEqual(['Manha', 'Tarde'])
  })

  it('remover tira so a pergunta pedida', () => {
    const draft = custom()
    const target = draft.questions[1]!
    const after = removeQuestion(draft, target.id)
    expect(after.questions).toHaveLength(7)
    expect(after.questions.some((item) => item.id === target.id)).toBe(false)
  })

  it('remover id inexistente nao muda nada', () => {
    const draft = custom()
    expect(removeQuestion(draft, 'nao-existe').questions).toHaveLength(8)
  })

  it('a pergunta precisa de texto', () => {
    expect(codeOf(() => validateQuestion(newQuestion()))).toBe('questionLabelRequired')
  })

  it('multipla escolha precisa de duas opcoes preenchidas', () => {
    const question = { ...newQuestion(), label: 'Qual o turno?', type: 'MULTIPLA' as const }
    expect(codeOf(() => validateQuestion({ ...question, options: ['Manha', ' '] }))).toBe(
      'questionOptionsRequired',
    )
    expect(() => validateQuestion({ ...question, options: ['Manha', 'Tarde'] })).not.toThrow()
  })

  it('trocar o tipo para longe da multipla escolha descarta as opcoes', () => {
    const question = { ...newQuestion(), type: 'MULTIPLA' as const, options: ['A', 'B'] }
    expect(withQuestionType(question, 'SIM_NAO').options).toEqual([])
    expect(withQuestionType(question, 'MULTIPLA').options).toEqual(['A', 'B'])
  })

  it('trocar o tipo descarta o que so valia para o anterior', () => {
    const multiple = { ...newQuestion(), type: 'MULTIPLA' as const, options: ['A', 'B'], allowsMultiple: true }
    expect(withQuestionType(multiple, 'TEXTO_CURTO').allowsMultiple).toBeUndefined()
    expect(withQuestionType(multiple, 'MULTIPLA').allowsMultiple).toBe(true)

    const text = { ...newQuestion(), type: 'TEXTO_LONGO' as const, minLength: 10, maxLength: 300 }
    expect(withQuestionType(text, 'TEXTO_CURTO')).toMatchObject({ minLength: 10, maxLength: 300 })
    const yesNo = withQuestionType(text, 'SIM_NAO')
    expect(yesNo.minLength).toBeUndefined()
    expect(yesNo.maxLength).toBeUndefined()
  })

  it('a ajuda e a condicao sobrevivem a troca de tipo', () => {
    const question = {
      ...newQuestion(),
      help: 'Linha de apoio',
      dependsOn: { questionId: 'diagnostico', answer: 'Sim' },
    }
    expect(withQuestionType(question, 'TEXTO_LONGO')).toMatchObject({
      help: 'Linha de apoio',
      dependsOn: { questionId: 'diagnostico', answer: 'Sim' },
    })
  })

  it('todo tipo de resposta tem rotulo', () => {
    expect(QUESTION_TYPES.map((type) => QUESTION_TYPE_LABEL[type])).toEqual([
      'Texto curto',
      'Texto longo',
      'Múltipla escolha',
      'Sim ou não',
    ])
  })
})

describe('Documentos exigidos', () => {
  const custom = () => applyTriageMode(emptyOpportunityDraft(), 'PERSONALIZADO')

  it('o catalogo traz os sete do prototipo', () => {
    expect(DOCUMENT_CATALOG.map((item) => item.label)).toEqual([
      'RG',
      'CPF',
      'Cartão do SUS',
      'Encaminhamento médico',
      'Comprovante de residência',
      'Comprovante de renda',
      'Exames anteriores',
    ])
  })

  it('RG ja vem marcado', () => {
    const draft = emptyOpportunityDraft()
    expect(draft.selectedDocumentIds).toEqual(['rg'])
    expect(selectedDocuments(draft).map((item) => item.label)).toEqual(['RG'])
  })

  it('marcar e desmarcar alterna o mesmo documento', () => {
    let draft = custom()
    draft = toggleDocument(draft, 'cpf')
    expect(draft.selectedDocumentIds).toContain('cpf')
    draft = toggleDocument(draft, 'cpf')
    expect(draft.selectedDocumentIds).not.toContain('cpf')
  })

  it('desmarcar um nao mexe nos outros', () => {
    let draft = toggleDocument(custom(), 'cpf')
    draft = toggleDocument(draft, 'rg')
    expect(draft.selectedDocumentIds).toEqual(['cpf'])
  })

  it('documento novo nasce marcado, com o nome informado', () => {
    const draft = addDocument(custom(), '  Carteira de vacinacao ')
    const created = draft.documents[draft.documents.length - 1]!
    expect(created.id).toBe('outro-1')
    expect(created.label).toBe('Carteira de vacinacao')
    expect(created.isCustom).toBe(true)
    expect(draft.selectedDocumentIds).toContain(created.id)
  })

  it('documentos escritos a mao seguem outro-1, outro-2, sem repetir id', () => {
    let draft = addDocument(custom(), 'Carteira de vacinacao')
    draft = addDocument(draft, 'Laudo')
    expect(draft.documents.slice(-2).map((item) => item.id)).toEqual(['outro-1', 'outro-2'])
    draft = removeDocument(draft, 'outro-1')
    draft = addDocument(draft, 'Receita')
    expect(draft.documents.slice(-2).map((item) => item.id)).toEqual(['outro-2', 'outro-1'])
  })

  it('documento sem nome nao e criado', () => {
    const draft = custom()
    expect(addDocument(draft, '   ')).toBe(draft)
  })

  it('documento novo nao mexe no catalogo', () => {
    const draft = addDocument(custom(), 'Carteira de vacinacao')
    expect(draft.documents[0]?.label).toBe('RG')
    expect(draft.documents).toHaveLength(DOCUMENT_CATALOG.length + 1)
  })

  it('remover documento tira tambem da selecao', () => {
    let draft = addDocument(custom(), 'Carteira de vacinacao')
    const created = draft.documents[draft.documents.length - 1]!
    draft = removeDocument(draft, created.id)
    expect(draft.documents.some((item) => item.id === created.id)).toBe(false)
    expect(draft.selectedDocumentIds).not.toContain(created.id)
  })
})

describe('Validacao do passo de triagem', () => {
  it('o padrao ja passa', () => {
    expect(() => validateTriage(emptyOpportunityDraft())).not.toThrow()
  })

  it('sem nenhuma pergunta e rejeitado', () => {
    const draft = { ...emptyOpportunityDraft(), questions: [] }
    expect(codeOf(() => validateTriage(draft))).toBe('questionsRequired')
  })

  it('sem nenhum documento marcado e rejeitado', () => {
    const draft = { ...emptyOpportunityDraft(), selectedDocumentIds: [] }
    expect(codeOf(() => validateTriage(draft))).toBe('documentsRequired')
  })

  it('a pergunta e checada antes do documento', () => {
    const draft = {
      ...emptyOpportunityDraft(),
      questions: [],
      selectedDocumentIds: [],
    }
    expect(codeOf(() => validateTriage(draft))).toBe('questionsRequired')
  })

  it('desmarcar todos os documentos um a um chega ao erro', () => {
    let draft = applyTriageMode(emptyOpportunityDraft(), 'PERSONALIZADO')
    for (const id of [...draft.selectedDocumentIds]) {
      draft = toggleDocument(draft, id)
    }
    expect(codeOf(() => validateTriage(draft))).toBe('documentsRequired')
  })
})

describe('Formulario padrao do contrato', () => {
  const byId = (id: string) => DEFAULT_QUESTIONS.find((item) => item.id === id)!

  it('usa os 8 ids exatos da secao 6', () => {
    expect(DEFAULT_QUESTIONS.map((item) => item.id)).toEqual([
      'motivo',
      'tempo',
      'diagnostico',
      'qual-diagnostico',
      'medicacao',
      'quais-medicacoes',
      'urgencia',
      'horario',
    ])
  })

  it('qual diagnostico e quais medicacoes dependem de um Sim', () => {
    expect(byId('qual-diagnostico').dependsOn).toEqual({ questionId: 'diagnostico', answer: YES })
    expect(byId('quais-medicacoes').dependsOn).toEqual({ questionId: 'medicacao', answer: YES })
    expect(DEFAULT_QUESTIONS.filter((item) => item.dependsOn !== undefined)).toHaveLength(2)
  })

  it('motivo tem limite de caracteres; urgencia tem ajuda; horario aceita varias', () => {
    expect(byId('motivo')).toMatchObject({ type: 'TEXTO_LONGO', minLength: 10, maxLength: 300 })
    expect(byId('urgencia').help).toBe('Alta: atrapalha suas atividades do dia a dia.')
    expect(byId('horario')).toMatchObject({
      isRequired: false,
      allowsMultiple: true,
      options: ['Manhã', 'Tarde', 'Noite'],
    })
  })

  it('toda dependencia aponta para uma pergunta anterior que admite a resposta', () => {
    DEFAULT_QUESTIONS.forEach((question, index) => {
      if (question.dependsOn === undefined) return
      const target = DEFAULT_QUESTIONS.findIndex((item) => item.id === question.dependsOn?.questionId)
      expect(target).toBeGreaterThanOrEqual(0)
      expect(target).toBeLessThan(index)
      expect(possibleAnswers(DEFAULT_QUESTIONS[target]!)).toContain(question.dependsOn.answer)
    })
  })

  it('sim ou nao responde Sim ou Não; multipla responde uma das opcoes', () => {
    expect(possibleAnswers(byId('diagnostico'))).toEqual(['Sim', 'Não'])
    expect(possibleAnswers(byId('urgencia'))).toEqual(['Baixa', 'Média', 'Alta'])
    expect(possibleAnswers(byId('motivo'))).toBeNull()
  })

  it('a tela encontra de qual pergunta a condicional depende', () => {
    const dependency = dependencyOf(byId('qual-diagnostico'), DEFAULT_QUESTIONS)
    expect(dependency?.question.id).toBe('diagnostico')
    expect(dependency?.answer).toBe('Sim')
    expect(dependencyOf(byId('motivo'), DEFAULT_QUESTIONS)).toBeNull()
  })
})

describe('Dependencias no formulario personalizado', () => {
  const custom = () => applyTriageMode(emptyOpportunityDraft(), 'PERSONALIZADO')
  const find = (questions: readonly { id: string }[], id: string) =>
    questions.find((item) => item.id === id) as (typeof DEFAULT_QUESTIONS)[number] | undefined

  it('remover a pergunta de origem tira a condicao da dependente, que continua na lista', () => {
    const after = removeQuestion(custom(), 'diagnostico')
    const dependent = find(after.questions, 'qual-diagnostico')
    expect(dependent).toBeDefined()
    expect(dependent?.dependsOn).toBeUndefined()
    expect(find(after.questions, 'quais-medicacoes')?.dependsOn).toEqual({
      questionId: 'medicacao',
      answer: 'Sim',
    })
  })

  it('trocar a origem para um tipo que nao admite a resposta tira a condicao', () => {
    const draft = custom()
    const origin = find(draft.questions, 'medicacao')!
    const after = saveQuestion(draft, withQuestionType(origin, 'TEXTO_CURTO'))
    expect(find(after.questions, 'quais-medicacoes')?.dependsOn).toBeUndefined()
  })

  it('editar so o texto da origem mantem a condicao', () => {
    const draft = custom()
    const origin = find(draft.questions, 'diagnostico')!
    const after = saveQuestion(draft, { ...origin, label: 'Você já tem um diagnóstico?' })
    expect(find(after.questions, 'qual-diagnostico')?.dependsOn).toEqual({
      questionId: 'diagnostico',
      answer: 'Sim',
    })
  })

  it('editar a dependente pelo modal preserva condicao, ajuda e limites', () => {
    const draft = custom()
    const motivo = find(draft.questions, 'motivo')!
    const after = saveQuestion(draft, { ...motivo, label: 'Motivo da consulta' })
    expect(find(after.questions, 'motivo')).toMatchObject({
      label: 'Motivo da consulta',
      minLength: 10,
      maxLength: 300,
    })
  })

  it('multipla que perde a opcao da condicao derruba a condicao', () => {
    let draft = custom()
    draft = saveQuestion(draft, {
      ...newQuestion(),
      id: 'turno',
      label: 'Turno',
      type: 'MULTIPLA',
      options: ['Manhã', 'Tarde'],
    })
    draft = saveQuestion(draft, {
      ...newQuestion(),
      id: 'qual-manha',
      label: 'Que horas de manhã?',
      dependsOn: { questionId: 'turno', answer: 'Manhã' },
    })
    expect(find(draft.questions, 'qual-manha')?.dependsOn).toBeDefined()
    draft = saveQuestion(draft, { ...find(draft.questions, 'turno')!, options: ['Tarde', 'Noite'] })
    expect(find(draft.questions, 'qual-manha')?.dependsOn).toBeUndefined()
  })

  it('pruneDependencies nao mexe em quem nao tem condicao', () => {
    expect(pruneDependencies(DEFAULT_QUESTIONS)).toEqual(DEFAULT_QUESTIONS)
  })
})
