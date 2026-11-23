import { describe, expect, it } from 'vitest'
import {
  emptySignUpDraft,
  firstName,
  requiresProfessionalData,
  userProfileFrom,
} from '@/domain/entities'
import { validPatientDraft, validProfessionalDraft } from '@/test/factories'

describe('Perfil e cadastro', () => {
  it('perfil desconhecido nao quebra o mapeamento', () => {
    expect(userProfileFrom('PACIENTE')).toBe('PACIENTE')
    expect(userProfileFrom('PROFISSIONAL')).toBe('PROFISSIONAL')
    expect(userProfileFrom('ADMIN')).toBe('DESCONHECIDO')
  })

  it('primeiro nome sai do nome completo', () => {
    const user = {
      id: '1',
      name: 'Ana Paula Ribeiro',
      email: 'a@b.com',
      profile: 'PACIENTE' as const,
    }
    expect(firstName(user)).toBe('Ana')
  })

  it('so o perfil profissional pede dados de conselho', () => {
    expect(requiresProfessionalData(validPatientDraft())).toBe(false)
    expect(requiresProfessionalData(validProfessionalDraft())).toBe(true)
  })

  it('o cadastro novo comeca sem especialidade nem local de atendimento', () => {
    const draft = emptySignUpDraft()
    expect(draft.professional.specialtyId).toBeNull()
    expect(draft.professional.workplace).toBe('')
  })
})
