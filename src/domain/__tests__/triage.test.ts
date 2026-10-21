import { describe, expect, it } from 'vitest'
import {
  DEFAULT_QUESTIONS,
  DOCUMENT_CATALOG,
  DraftError,
  addDocument,
  addQuestion,
  applyTriageMode,
  canEditTriage,
  emptyOpportunityDraft,
  removeDocument,
  removeQuestion,
  renameDocument,
  renameQuestion,
  selectedDocuments,
  toggleDocument,
  validateTriage,
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
    draft = addQuestion(draft)
    draft = renameQuestion(draft, draft.questions[0]!.id, 'Pergunta trocada')
    expect(draft.questions).toHaveLength(5)

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

  it('o padrao comeca com as quatro perguntas do prototipo', () => {
    expect(emptyOpportunityDraft().questions).toHaveLength(4)
  })

  it('adicionar entra no fim, com o texto do prototipo', () => {
    const draft = addQuestion(custom())
    expect(draft.questions).toHaveLength(5)
    expect(draft.questions[4]?.label).toBe('Nova pergunta')
  })

  it('cada pergunta nova recebe um id proprio', () => {
    let draft = addQuestion(custom())
    draft = addQuestion(draft)
    const ids = draft.questions.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('remover tira so a pergunta pedida', () => {
    const draft = custom()
    const target = draft.questions[1]!
    const after = removeQuestion(draft, target.id)
    expect(after.questions).toHaveLength(3)
    expect(after.questions.some((item) => item.id === target.id)).toBe(false)
  })

  it('remover id inexistente nao muda nada', () => {
    const draft = custom()
    expect(removeQuestion(draft, 'nao-existe').questions).toHaveLength(4)
  })

  it('renomear afeta so a pergunta pedida', () => {
    const draft = custom()
    const target = draft.questions[0]!
    const after = renameQuestion(draft, target.id, 'Ha quanto tempo sente dor?')
    expect(after.questions[0]?.label).toBe('Ha quanto tempo sente dor?')
    expect(after.questions[1]?.label).toBe(draft.questions[1]?.label)
  })
})

describe('Documentos exigidos', () => {
  const custom = () => applyTriageMode(emptyOpportunityDraft(), 'PERSONALIZADO')

  it('o catalogo traz os cinco do prototipo', () => {
    expect(DOCUMENT_CATALOG.map((item) => item.label)).toEqual([
      'RG',
      'CPF',
      'Encaminhamento medico',
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

  it('documento novo nasce marcado e editavel', () => {
    const draft = addDocument(custom())
    const created = draft.documents[draft.documents.length - 1]!
    expect(created.label).toBe('Novo Documento')
    expect(created.isCustom).toBe(true)
    expect(draft.selectedDocumentIds).toContain(created.id)
  })

  it('renomear documento novo nao mexe no catalogo', () => {
    let draft = addDocument(custom())
    const created = draft.documents[draft.documents.length - 1]!
    draft = renameDocument(draft, created.id, 'Carteira de vacinacao')
    expect(draft.documents[draft.documents.length - 1]?.label).toBe(
      'Carteira de vacinacao',
    )
    expect(draft.documents[0]?.label).toBe('RG')
  })

  it('remover documento tira tambem da selecao', () => {
    let draft = addDocument(custom())
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
