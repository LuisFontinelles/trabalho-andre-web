import { describe, expect, it } from 'vitest'
import {
  activeFilterCount,
  emptyCriteria,
  firstName,
  hasVacancies,
  isFiltered,
  modalityFrom,
  offerTypeFrom,
  opportunitySubtitle,
  queryItems,
  requiresProfessionalData,
  userProfileFrom,
  vacancyLevel,
} from '@/domain/entities'
import { makeOpportunity, validPatientDraft, validProfessionalDraft } from '@/test/factories'

describe('Oportunidade', () => {
  it('sem vagas quando o contador zera', () => {
    const item = makeOpportunity({ vacancies: 0 })
    expect(hasVacancies(item)).toBe(false)
    expect(vacancyLevel(item)).toBe('none')
  })

  it.each([1, 3, 5])('ate cinco vagas conta como pouco: %i', (count) => {
    expect(vacancyLevel(makeOpportunity({ vacancies: count }))).toBe('low')
  })

  it.each([6, 8, 20])('acima de cinco conta como bastante: %i', (count) => {
    expect(vacancyLevel(makeOpportunity({ vacancies: count }))).toBe('plenty')
  })

  it('subtitulo usa a distancia quando ela existe', () => {
    const item = makeOpportunity({
      distanceKm: 12.3,
      provider: { id: 'pr', name: 'Faculdade Ensine', isVerified: false },
    })
    expect(opportunitySubtitle(item)).toBe('Faculdade Ensine · 12,3 km')
  })

  it('subtitulo cai na modalidade quando nao ha distancia', () => {
    expect(opportunitySubtitle(makeOpportunity({ modality: 'online' }))).toBe(
      'Clinica Saude · Online',
    )
    expect(opportunitySubtitle(makeOpportunity({ modality: 'presencial' }))).toBe(
      'Clinica Saude · Presencial',
    )
  })

  it('distancia e formatada com uma casa e virgula', () => {
    expect(opportunitySubtitle(makeOpportunity({ distanceKm: 1 }))).toContain('1,0 km')
    expect(opportunitySubtitle(makeOpportunity({ distanceKm: 8.26 }))).toContain('8,3 km')
  })

  it('valores desconhecidos caem em um padrao seguro', () => {
    expect(modalityFrom('hibrido')).toBe('presencial')
    expect(offerTypeFrom('permuta')).toBe('gratuita')
  })
})

describe('Criterios de busca', () => {
  it('criterio vazio nao conta filtros', () => {
    const criteria = emptyCriteria()
    expect(activeFilterCount(criteria)).toBe(0)
    expect(isFiltered(criteria)).toBe(false)
    expect(queryItems(criteria)).toEqual({ page: '1' })
  })

  it('conta cada dimensao de filtro uma vez', () => {
    const criteria = {
      ...emptyCriteria(),
      specialties: ['psicologia', 'cardiologia'],
      modalities: ['online'],
      offerTypes: ['gratuita'],
      distance: '5',
    }
    expect(activeFilterCount(criteria)).toBe(5)
  })

  it('termo sozinho torna a busca filtrada mas nao entra na contagem', () => {
    const criteria = { ...emptyCriteria(), term: 'psico' }
    expect(activeFilterCount(criteria)).toBe(0)
    expect(isFiltered(criteria)).toBe(true)
  })

  it('query envia listas ordenadas e separadas por virgula', () => {
    const criteria = {
      ...emptyCriteria(),
      term: 'psico',
      specialties: ['psicologia', 'cardiologia'],
      page: 2,
    }
    const query = queryItems(criteria)
    expect(query.q).toBe('psico')
    expect(query.specialty).toBe('cardiologia,psicologia')
    expect(query.page).toBe('2')
    expect(query.modality).toBeUndefined()
  })
})

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
      city: 'Brasilia',
    }
    expect(firstName(user)).toBe('Ana')
  })

  it('so o perfil profissional pede dados de conselho', () => {
    expect(requiresProfessionalData(validPatientDraft())).toBe(false)
    expect(requiresProfessionalData(validProfessionalDraft())).toBe(true)
  })
})
