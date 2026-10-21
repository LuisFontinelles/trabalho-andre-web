import { describe, expect, it } from 'vitest'
import {
  ValidationError,
  validateEmail,
  validatePassword,
  validateSignUp,
} from '@/domain/useCases'
import { validProfessionalDraft, validPatientDraft } from '@/test/factories'

describe('Validacao de e-mail', () => {
  it.each([
    'paciente@teste.com',
    'profissional@teste.com',
    'ana.paula+consulta@clinica.com.br',
    'UPPER@EXEMPLO.COM',
  ])('aceita %s', (email) => {
    expect(() => validateEmail(email)).not.toThrow()
  })

  it.each(['sem-arroba.com', 'sem@dominio', '@sodominio.com', 'espaco no@meio.com'])(
    'rejeita %s',
    (email) => {
      expect(() => validateEmail(email)).toThrow(ValidationError)
      try {
        validateEmail(email)
      } catch (error) {
        expect((error as ValidationError).code).toBe('emailInvalid')
      }
    },
  )

  it('campo vazio tem erro proprio', () => {
    try {
      validateEmail('   ')
      expect.unreachable('deveria ter lancado')
    } catch (error) {
      expect((error as ValidationError).code).toBe('emailRequired')
    }
  })

  it('ignora espacos nas pontas', () => {
    expect(() => validateEmail('  paciente@teste.com  ')).not.toThrow()
  })
})

describe('Validacao de senha', () => {
  it('no login basta nao estar vazia', () => {
    expect(() => validatePassword('123', false)).not.toThrow()
  })

  it.each([true, false])('senha vazia e rejeitada com strict=%s', (strict) => {
    try {
      validatePassword('', strict)
      expect.unreachable('deveria ter lancado')
    } catch (error) {
      expect((error as ValidationError).code).toBe('passwordRequired')
    }
  })

  it('no cadastro exige 8 caracteres, maiuscula e numero', () => {
    expect(() => validatePassword('Paciente@2026', true)).not.toThrow()
  })

  it.each(['curta1A', 'minusculas123', 'SemNumeroAqui'])(
    'rejeita a senha fraca %s',
    (password) => {
      try {
        validatePassword(password, true)
        expect.unreachable('deveria ter lancado')
      } catch (error) {
        expect((error as ValidationError).code).toBe('passwordWeak')
      }
    },
  )
})

describe('Validacao do cadastro', () => {
  it('rascunho de paciente completo passa', () => {
    expect(() => validateSignUp(validPatientDraft())).not.toThrow()
  })

  it('rascunho de profissional completo passa', () => {
    expect(() => validateSignUp(validProfessionalDraft())).not.toThrow()
  })

  it('nome e obrigatorio', () => {
    const draft = { ...validPatientDraft(), name: '   ' }
    try {
      validateSignUp(draft)
      expect.unreachable('deveria ter lancado')
    } catch (error) {
      expect((error as ValidationError).code).toBe('nameRequired')
    }
  })

  it('confirmacao precisa bater com a senha', () => {
    const draft = { ...validPatientDraft(), confirmPassword: 'Outra@2026' }
    try {
      validateSignUp(draft)
      expect.unreachable('deveria ter lancado')
    } catch (error) {
      expect((error as ValidationError).code).toBe('passwordMismatch')
    }
  })

  it('termos sao obrigatorios', () => {
    const draft = { ...validPatientDraft(), acceptedTerms: false }
    try {
      validateSignUp(draft)
      expect.unreachable('deveria ter lancado')
    } catch (error) {
      expect((error as ValidationError).code).toBe('termsNotAccepted')
    }
  })

  it('paciente nao precisa de dados profissionais', () => {
    const draft = {
      ...validPatientDraft(),
      professional: { councilId: null, stateId: null, number: '' },
    }
    expect(() => validateSignUp(draft)).not.toThrow()
  })

  it.each([
    ['councilId', 'councilRequired'],
    ['stateId', 'stateRequired'],
  ] as const)('profissional precisa de %s', (field, code) => {
    const base = validProfessionalDraft()
    const draft = { ...base, professional: { ...base.professional, [field]: null } }
    try {
      validateSignUp(draft)
      expect.unreachable('deveria ter lancado')
    } catch (error) {
      expect((error as ValidationError).code).toBe(code)
    }
  })

  it('profissional precisa do numero de registro', () => {
    const base = validProfessionalDraft()
    const draft = { ...base, professional: { ...base.professional, number: '  ' } }
    try {
      validateSignUp(draft)
      expect.unreachable('deveria ter lancado')
    } catch (error) {
      expect((error as ValidationError).code).toBe('registrationRequired')
    }
  })

  it('o erro apontado e o do primeiro campo da tela', () => {
    const base = validProfessionalDraft()
    const draft = {
      ...base,
      name: '',
      email: 'invalido',
      professional: { ...base.professional, councilId: null },
    }
    try {
      validateSignUp(draft)
      expect.unreachable('deveria ter lancado')
    } catch (error) {
      expect((error as ValidationError).code).toBe('nameRequired')
    }
  })

  it('dados profissionais sao checados antes da senha', () => {
    const base = validProfessionalDraft()
    const draft = {
      ...base,
      professional: { ...base.professional, stateId: null },
      password: 'fraca',
      confirmPassword: 'fraca',
    }
    try {
      validateSignUp(draft)
      expect.unreachable('deveria ter lancado')
    } catch (error) {
      expect((error as ValidationError).code).toBe('stateRequired')
    }
  })
})
