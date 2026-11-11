import { describe, expect, it } from 'vitest'
import {
  addDocument,
  applyTriageMode,
  canEditTriage,
  DEFAULT_QUESTIONS,
  DOCUMENT_CATALOG,
  DraftError,
  emptyOpportunityDraft,
  newQuestion,
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
    expect(draft.questions).toHaveLength(6)

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

  it('o padrao comeca com as cinco perguntas do prototipo', () => {
    expect(emptyOpportunityDraft().questions.map((item) => item.label)).toEqual([
      'Qual o motivo principal?',
      'Há quanto tempo?',
      'Já possui diagnóstico?',
      'Usa medicação contínua?',
      'Qual a urgência percebida?',
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
    expect(draft.questions).toHaveLength(6)
    expect(draft.questions[5]?.label).toBe('Tem alergia?')
  })

  it('cada pergunta nova recebe um id proprio', () => {
    expect(newQuestion().id).not.toBe(newQuestion().id)
  })

  it('salvar pergunta existente troca so ela, no mesmo lugar', () => {
    const draft = custom()
    const target = draft.questions[1]!
    const after = saveQuestion(draft, { ...target, label: 'Ha quanto tempo sente dor?' })
    expect(after.questions).toHaveLength(5)
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
    expect(saveQuestion(custom(), question).questions[5]?.options).toEqual(['Manha', 'Tarde'])
  })

  it('remover tira so a pergunta pedida', () => {
    const draft = custom()
    const target = draft.questions[1]!
    const after = removeQuestion(draft, target.id)
    expect(after.questions).toHaveLength(4)
    expect(after.questions.some((item) => item.id === target.id)).toBe(false)
  })

  it('remover id inexistente nao muda nada', () => {
    const draft = custom()
    expect(removeQuestion(draft, 'nao-existe').questions).toHaveLength(5)
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
    expect(created.label).toBe('Carteira de vacinacao')
    expect(created.isCustom).toBe(true)
    expect(draft.selectedDocumentIds).toContain(created.id)
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
