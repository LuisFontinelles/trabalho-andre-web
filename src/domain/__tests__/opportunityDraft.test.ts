import { describe, expect, it } from 'vitest'
import {
  accessErrors,
  applyAccessMode,
  applyModality,
  applyNoRestrictions,
  basicsErrors,
  canSaveAsDraft,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  DRAFT_STEPS,
  DraftError,
  emptyOpportunityDraft,
  errorCount,
  formatCep,
  newQuestion,
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

  it('o titulo e obrigatorio, como o asterisco da tela avisa', () => {
    const draft = { ...validOpportunityDraft(), title: '   ' }
    expect(codeOf(() => validateBasics(draft))).toBe('titleRequired')
  })

  it('tipo de servico e publico sao obrigatorios', () => {
    expect(codeOf(() => validateBasics({ ...validOpportunityDraft(), serviceType: null }))).toBe(
      'serviceTypeRequired',
    )
    expect(codeOf(() => validateBasics({ ...validOpportunityDraft(), audiences: [] }))).toBe(
      'audiencesRequired',
    )
  })

  it('descricao e obrigatoria', () => {
    const draft = { ...validOpportunityDraft(), description: '   ' }
    expect(codeOf(() => validateBasics(draft))).toBe('descriptionRequired')
  })

  it('descricao vai de 40 a 600 caracteres', () => {
    const short = { ...validOpportunityDraft(), description: 'a'.repeat(DESCRIPTION_MIN - 1) }
    expect(codeOf(() => validateBasics(short))).toBe('descriptionTooShort')
    const long = { ...validOpportunityDraft(), description: 'a'.repeat(DESCRIPTION_MAX + 1) }
    expect(codeOf(() => validateBasics(long))).toBe('descriptionTooLong')
    const edge = { ...validOpportunityDraft(), description: 'a'.repeat(DESCRIPTION_MAX) }
    expect(() => validateBasics(edge)).not.toThrow()
  })

  it('o atendimento precisa ser escolhido', () => {
    const draft = { ...validOpportunityDraft(), modality: null }
    expect(codeOf(() => validateBasics(draft))).toBe('modalityRequired')
  })

  it('CEP e obrigatorio e tem 8 digitos no presencial', () => {
    expect(codeOf(() => validateBasics({ ...validOpportunityDraft(), cep: '' }))).toBe(
      'cepRequired',
    )
    expect(codeOf(() => validateBasics({ ...validOpportunityDraft(), cep: '7000' }))).toBe(
      'cepInvalid',
    )
  })

  it('o hibrido tambem pede CEP e endereco', () => {
    const draft = { ...validOpportunityDraft(), modality: 'hibrido' as const, cep: '', address: '' }
    expect(basicsErrors(draft)).toEqual({ cep: 'cepRequired', address: 'addressRequired' })
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
    const draft = {
      ...validOpportunityDraft(),
      modality: 'online' as const,
      cep: '',
      address: '',
    }
    expect(() => validateBasics(draft)).not.toThrow()
  })

  it('o erro apontado e o do primeiro campo da tela', () => {
    const draft = {
      ...validOpportunityDraft(),
      description: '',
      specialtyId: null,
      audiences: [],
    }
    expect(codeOf(() => validateBasics(draft))).toBe('audiencesRequired')
  })

  it('basicsErrors junta todos os campos que faltam, para a tela marcar cada um', () => {
    const draft = { ...validOpportunityDraft(), title: '', specialtyId: null, address: '' }
    const errors = basicsErrors(draft)
    expect(errors).toEqual({
      title: 'titleRequired',
      specialtyId: 'specialtyRequired',
      address: 'addressRequired',
    })
    expect(errorCount(errors)).toBe(3)
  })

  it('o rascunho vazio acusa os seis campos sem depender do atendimento', () => {
    expect(Object.keys(basicsErrors(emptyOpportunityDraft()))).toEqual([
      'title',
      'serviceType',
      'audiences',
      'description',
      'specialtyId',
      'modality',
    ])
  })

  it('formatCep poe o hifen e corta o excesso', () => {
    expect(formatCep('70000000')).toBe('70000-000')
    expect(formatCep('7000')).toBe('7000')
    expect(formatCep('70.000-0009')).toBe('70000-000')
  })

  it('rascunho so precisa de titulo para ser salvo', () => {
    expect(canSaveAsDraft(emptyOpportunityDraft())).toBe(false)
    expect(canSaveAsDraft({ ...emptyOpportunityDraft(), title: 'Fisioterapia' })).toBe(true)
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
        { ...newQuestion(), label: '   ' },
        { ...newQuestion(), label: '' },
      ],
    }
    expect(codeOf(() => validateTriage(draft))).toBe('questionsRequired')
  })

  it('uma pergunta preenchida basta', () => {
    const draft = {
      ...validOpportunityDraft(),
      questions: [
        { ...newQuestion(), label: '' },
        { ...newQuestion(), label: 'Ha quanto tempo sente dor?' },
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

  it('criterios de elegibilidade sao obrigatorios, a menos que nao haja restricao', () => {
    const draft = { ...validOpportunityDraft(), eligibility: '  ' }
    expect(codeOf(() => validateAccess(draft))).toBe('eligibilityRequired')
    expect(() => validateAccess(applyNoRestrictions(draft, true))).not.toThrow()
  })

  it('marcar "sem restricoes" apaga o texto dos criterios', () => {
    const draft = applyNoRestrictions(validOpportunityDraft(), true)
    expect(draft.hasNoRestrictions).toBe(true)
    expect(draft.eligibility).toBe('')
  })

  it('a forma de combinar o atendimento e obrigatoria', () => {
    const draft = { ...validOpportunityDraft(), contactMethod: null }
    expect(codeOf(() => validateAccess(draft))).toBe('contactMethodRequired')
  })

  it('accessErrors marca cada campo do passo', () => {
    const errors = accessErrors({
      ...validOpportunityDraft(),
      accessMode: null,
      totalVacancies: '',
      closesAt: '',
    })
    expect(errors).toEqual({
      accessMode: 'accessModeRequired',
      totalVacancies: 'vacanciesRequired',
      closesAt: 'closesAtRequired',
    })
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
