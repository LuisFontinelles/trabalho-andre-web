import type {
  CadastroResponseDTO,
  CatalogosDTO,
  LoginResponseDTO,
  MeDTO,
  ProfissionalCadastroDTO,
} from '@/data/dto'
import type {
  Catalog,
  PendingVerification,
  Session,
  SignUpDraft,
  User,
  UserProfile,
} from '@/domain/entities'
import { DEFAULT_CODE_LENGTH } from '@/domain/entities'

/**
 * Valor fechado do dominio para o fio: `preco-social` vira `PRECO_SOCIAL`.
 * O dominio guarda em minusculas com hifen; o contrato, como enum Java.
 */
export function toWireEnum(value: string): string {
  return value.toUpperCase().replace(/-/g, '_')
}

/** O caminho de volta: `PRECO_SOCIAL` vira `preco-social`. */
export function fromWireEnum(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/_/g, '-')
}

export function profileFromWire(raw: string | null | undefined): UserProfile {
  if (raw === 'PROFISSIONAL_SAUDE') return 'PROFISSIONAL'
  if (raw === 'PACIENTE') return 'PACIENTE'
  return 'DESCONHECIDO'
}

/**
 * Nome provisorio enquanto GET /user/me nao responde: a parte local do
 * e-mail ("ana.souza@..." vira "Ana Souza"), para a sidebar nao ficar vazia.
 */
export function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  const words = local
    .split(/[._-]+/)
    .filter((word) => word !== '')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
  return words.length > 0 ? words.join(' ') : email
}

/**
 * A sessao junta o login com GET /user/me. Sem o /me, o nome sai do e-mail
 * e o id fica sendo o e-mail, que e o subject do token.
 */
export function sessionFromDTO(
  login: LoginResponseDTO,
  me: MeDTO | null,
  email: string,
): Session {
  const user: User = {
    id: me?.id ?? email,
    name: me?.nome?.trim() ? me.nome.trim() : nameFromEmail(email),
    email: me?.email ?? email,
    profile: profileFromWire(me?.tipoPerfil ?? login.tipoPerfil),
  }
  const registration = registrationFromMe(me)
  return {
    token: login.token,
    user,
    isVerified: login.validadoInstitucionalmente,
    ...(registration === undefined ? {} : { registration }),
  }
}

/** "CRM/DF 123456" a partir do /user/me; indefinido se faltar alguma parte. */
export function registrationFromMe(me: MeDTO | null): string | undefined {
  const council = me?.conselho?.trim()
  const state = me?.uf?.trim()
  const number = me?.numeroRegistro?.trim()
  if (!council || !state || !number) return undefined
  return `${council}/${state} ${number}`
}

/** Parte `dados` do cadastro. A tela nao tem biografia; vai nula. */
export function signUpDraftToDTO(draft: SignUpDraft): ProfissionalCadastroDTO {
  const { councilId, stateId, number, specialtyId, workplace } = draft.professional
  return {
    tipoPerfil: 'PROFISSIONAL_SAUDE',
    usuarioDto: {
      email: draft.email,
      senha: draft.password,
      tipoPerfil: 'PROFISSIONAL_SAUDE',
    },
    nome: draft.name,
    conselho: councilId ?? '',
    uf: stateId ?? '',
    numeroRegistro: number,
    especialidade: specialtyId,
    ondeAtende: workplace.trim() === '' ? null : workplace.trim(),
    biografiaOuDescricao: null,
    aceitouTermos: draft.acceptedTerms,
    acceptedTerms: draft.acceptedTerms,
  }
}

/** Monta o multipart: o JSON vai como parte `dados`, com tipo application/json. */
export function signUpForm(draft: SignUpDraft): FormData {
  const form = new FormData()
  form.append(
    'dados',
    new Blob([JSON.stringify(signUpDraftToDTO(draft))], { type: 'application/json' }),
  )
  return form
}

/** 201 sem corpo e lido como conta que ja nasce ativa, sem codigo. */
export function pendingVerificationFromDTO(
  dto: CadastroResponseDTO | null,
  email: string,
): PendingVerification {
  if (dto === null) {
    return { email, profile: 'PROFISSIONAL', codeLength: 0, requiresCode: false }
  }
  return {
    email: dto.email || email,
    profile: profileFromWire(dto.tipoPerfil),
    codeLength: dto.exigeVerificacao ? (dto.tamanhoCodigo ?? DEFAULT_CODE_LENGTH) : 0,
    requiresCode: dto.exigeVerificacao,
  }
}

export function catalogFromDTO(dto: CatalogosDTO): Catalog {
  return {
    specialties: dto.especialidades.map((item) => ({ id: item.id, label: item.nome })),
    councils: dto.conselhos.map((item) => ({ id: item.sigla, label: item.sigla })),
    states: dto.ufs.map((uf) => ({ id: uf, label: uf })),
  }
}
