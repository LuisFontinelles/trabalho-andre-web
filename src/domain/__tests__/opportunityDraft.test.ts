import { describe, expect, it } from 'vitest'
import {
  DRAFT_STEPS,
  DraftError,
  applyAccessMode,
  applyModality,
  emptyOpportunityDraft,
  nextStep,
  parsePrice,
  parseVacancies,
  previousStep,
  validateAccess,
  validateBasics,
  validateStep,
  validateTriage,
  type DraftErrorCode,
} from '@/domain/opportunityDraft'
import { allowsPrice } from '@/domain/professional'
import { validOpportunityDraft } from '@/test/factories'

function codeOf(run: () => void): DraftErrorCode {
  try {
    run()
  } catch (error) {
    if (error instanceof DraftError) return error.code
    throw error
  }
  throw new Error('esperava um DraftError e nada foi lancado')
}

describe('Passos', () => {
  it('a ordem e a do prototipo', () => {
    expect(DRAFT_STEPS).toEqual(['DADOS', 'ACESSO', 'TRIAGEM'])
  })

  it('avanca ate o ultimo e para', () => {
    expect(nextStep('DADOS')).toBe('ACESSO')
    expect(nextStep('ACESSO')).toBe('TRIAGEM')
    expect(nextStep('TRIAGEM')).toBeNull()
  })

  it('volta ate o primeiro e para', () => {
    expect(previousStep('TRIAGEM')).toBe('ACESSO')
    expect(previousStep('ACESSO')).toBe('DADOS')
    expect(previousStep('DADOS')).toBeNull()
  })
})

describe('Passo 1, dados basicos', () => {
  it('rascunho completo passa', () => {
    expect(() => validateBasics(validOpportunityDraft())).not.toThrow()
  })

  it('o titulo nao e obrigatorio, como no prototipo', () => {
    const draft = { ...validOpportunityDraft(), title: '' }
    expect(() => validateBasics(draft)).not.toThrow()
  })

  it.each([
    ['description', 'descriptionRequired'],
    ['audience', 'audienceRequired'],
  ] as const)('%s e obrigatorio', (field, expected) => {
    const draft = { ...validOpportunityDraft(), [field]: '   ' }
    expect(codeOf(() => validateBasics(draft))).toBe(expected)
  })

  it('especialidade e obrigatoria', () => {
    const draft = { ...validOpportunityDraft(), specialtyId: null }
    expect(codeOf(() => validateBasics(draft))).toBe('specialtyRequired')
  })

  it('endereco e obrigatorio no presencial', () => {
    const draft = { ...validOpportunityDraft(), modality: 'presencial' as const, address: '' }
    expect(codeOf(() => validateBasics(draft))).toBe('addressRequired')
  })

  it('endereco nao e exigido no online', () => {
    const draft = { ...validOpportunityDraft(), modality: 'online' as const, address: '' }
    expect(() => validateBasics(draft)).not.toThrow()
  })

  it('o erro apontado e o do primeiro campo da tela', () => {
    const draft = {
      ...validOpportunityDraft(),
      description: '',
      specialtyId: null,
      audience: '',
    }
    expect(codeOf(() => validateBasics(draft))).toBe('descriptionRequired')
  })
})

describe('Passo 2, condicoes de acesso', () => {
  it('nenhuma modalidade vem marcada de inicio', () => {
    expect(emptyOpportunityDraft().accessMode).toBeNull()
  })

  it('sem escolher a modalidade o passo e rejeitado', () => {
    const draft = { ...validOpportunityDraft(), accessMode: null }
    expect(codeOf(() => validateAccess(draft))).toBe('accessModeRequired')
  })

  it('a modalidade e checada antes do preco, das vagas e das datas', () => {
    const draft = {
      ...validOpportunityDraft(),
      accessMode: null,
      totalVacancies: '',
      opensAt: '',
      closesAt: '',
    }
    expect(codeOf(() => validateAccess(draft))).toBe('accessModeRequired')
  })

  it('sem modalidade o campo de preco fica indisponivel', () => {
    expect(allowsPrice(null)).toBe(false)
  })

  it('escolher a modalidade libera o passo', () => {
    const draft = { ...validOpportunityDraft(), accessMode: null }
    expect(() => validateAccess(applyAccessMode(draft, 'gratuito'))).not.toThrow()
  })

  it('rascunho gratuito completo passa', () => {
    expect(() => validateAccess(validOpportunityDraft())).not.toThrow()
  })

  it('gratuito nao exige preco', () => {
    const draft = { ...validOpportunityDraft(), accessMode: 'gratuito' as const, price: '' }
    expect(() => validateAccess(draft)).not.toThrow()
  })

  it('pesquisa nao exige preco', () => {
    const draft = { ...validOpportunityDraft(), accessMode: 'pesquisa' as const, price: '' }
    expect(() => validateAccess(draft)).not.toThrow()
  })

  it('preco social exige preco', () => {
    const draft = { ...validOpportunityDraft(), accessMode: 'preco-social' as const, price: '' }
    expect(codeOf(() => validateAccess(draft))).toBe('priceRequired')
  })

  it.each(['0', '-10', 'abc'])('preco social rejeita o valor %s', (price) => {
    const draft = { ...validOpportunityDraft(), accessMode: 'preco-social' as const, price }
    expect(codeOf(() => validateAccess(draft))).toBe('priceInvalid')
  })

  it('preco aceita virgula como separador decimal', () => {
    const draft = {
      ...validOpportunityDraft(),
      accessMode: 'preco-social' as const,
      price: '59,90',
    }
    expect(() => validateAccess(draft)).not.toThrow()
    expect(parsePrice('59,90')).toBeCloseTo(59.9)
  })

  it('vagas sao obrigatorias', () => {
    const draft = { ...validOpportunityDraft(), totalVacancies: '' }
    expect(codeOf(() => validateAccess(draft))).toBe('vacanciesRequired')
  })

  it.each(['0', '-3', '2.5', 'muitas'])('rejeita %s vagas', (totalVacancies) => {
    const draft = { ...validOpportunityDraft(), totalVacancies }
    expect(codeOf(() => validateAccess(draft))).toBe('vacanciesInvalid')
  })

  it('datas sao obrigatorias', () => {
    expect(
      codeOf(() => validateAccess({ ...validOpportunityDraft(), opensAt: '' })),
    ).toBe('opensAtRequired')
    expect(
      codeOf(() => validateAccess({ ...validOpportunityDraft(), closesAt: '' })),
    ).toBe('closesAtRequired')
  })

  it('o encerramento nao pode vir antes do inicio', () => {
    const draft = {
      ...validOpportunityDraft(),
      opensAt: '2026-12-01',
      closesAt: '2026-11-01',
    }
    expect(codeOf(() => validateAccess(draft))).toBe('closesBeforeOpens')
  })

  it('inicio e encerramento no mesmo dia e aceito', () => {
    const draft = {
      ...validOpportunityDraft(),
      opensAt: '2026-11-01',
      closesAt: '2026-11-01',
    }
    expect(() => validateAccess(draft)).not.toThrow()
  })
})

describe('Passo 3, triagem', () => {
  it('o formulario padrao ja vem valido', () => {
    expect(() => validateTriage(emptyOpportunityDraft())).not.toThrow()
  })

  it('nenhuma pergunta e rejeitado', () => {
    const draft = { ...validOpportunityDraft(), questions: [] }
    expect(codeOf(() => validateTriage(draft))).toBe('questionsRequired')
  })

  it('perguntas em branco contam como nenhuma', () => {
    const draft = {
      ...validOpportunityDraft(),
      questions: [
        { id: 'q1', label: '   ' },
        { id: 'q2', label: '' },
      ],
    }
    expect(codeOf(() => validateTriage(draft))).toBe('questionsRequired')
  })

  it('uma pergunta preenchida basta', () => {
    const draft = {
      ...validOpportunityDraft(),
      questions: [
        { id: 'q1', label: '' },
        { id: 'q2', label: 'Ha quanto tempo sente dor?' },
      ],
    }
    expect(() => validateTriage(draft)).not.toThrow()
  })
})

describe('validateStep encaminha para o passo certo', () => {
  it('passo de dados nao reclama de vagas', () => {
    const draft = { ...validOpportunityDraft(), totalVacancies: '' }
    expect(() => validateStep(draft, 'DADOS')).not.toThrow()
    expect(codeOf(() => validateStep(draft, 'ACESSO'))).toBe('vacanciesRequired')
  })

  it('passo de acesso nao reclama de descricao', () => {
    const draft = { ...validOpportunityDraft(), description: '' }
    expect(() => validateStep(draft, 'ACESSO')).not.toThrow()
    expect(codeOf(() => validateStep(draft, 'DADOS'))).toBe('descriptionRequired')
  })
})

describe('Mudancas de campo que limpam outro', () => {
  it('sair do preco social limpa o preco digitado', () => {
    const draft = { ...validOpportunityDraft(), accessMode: 'preco-social' as const, price: '60' }
    expect(applyAccessMode(draft, 'gratuito').price).toBe('')
    expect(applyAccessMode(draft, 'pesquisa').price).toBe('')
  })

  it('continuar no preco social preserva o preco', () => {
    const draft = { ...validOpportunityDraft(), accessMode: 'gratuito' as const, price: '60' }
    expect(applyAccessMode(draft, 'preco-social').price).toBe('60')
  })

  it('trocar para online limpa o endereco', () => {
    const draft = { ...validOpportunityDraft(), address: 'Rua das Flores, 120' }
    expect(applyModality(draft, 'online').address).toBe('')
  })

  it('continuar presencial preserva o endereco', () => {
    const draft = { ...validOpportunityDraft(), address: 'Rua das Flores, 120' }
    expect(applyModality(draft, 'presencial').address).toBe('Rua das Flores, 120')
  })
})

describe('Conversao de numero', () => {
  it.each([
    ['5', 5],
    [' 12 ', 12],
    ['0', 0],
  ])('vagas %s viram %i', (raw, expected) => {
    expect(parseVacancies(raw)).toBe(expected)
  })

  it.each(['2.5', 'abc', ''])('vagas %s nao sao inteiro valido', (raw) => {
    const parsed = parseVacancies(raw)
    expect(parsed === null || !Number.isInteger(parsed) || raw === '').toBeTruthy()
  })

  it('preco aceita ponto e virgula', () => {
    expect(parsePrice('59.90')).toBeCloseTo(59.9)
    expect(parsePrice('59,90')).toBeCloseTo(59.9)
  })
})
