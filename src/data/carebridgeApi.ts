import type { HttpClient } from '@/data/network/httpClient'
import {
  WrongProfileError,
  type PendingVerification,
  type ProfessionalCatalog,
  type Session,
  type SignUpDraft,
  type User,
  type UserProfile,
} from '@/domain/entities'
import type { AuthRepository } from '@/domain/repositories'

/**
 * Adaptador para a API real (carebridge-api, Spring). Ela nao segue o
 * CONTRATO-API-CareBridge.md: caminhos e campos em portugues, sem prefixo
 * /v1 e sem envelope de usuario. Aqui ficam so login e cadastro do
 * profissional; o resto do app continua no backend de fixtures.
 */

/** POST /user/login */
export interface ApiLoginResponseDTO {
  token: string
  autenticado: boolean
  tipoPerfil: string
  validadoInstitucionalmente: boolean
}

/** Parte `dados` do POST /profissional-saude/cadastro (multipart). */
export interface ApiProfessionalSignUpDTO {
  usuarioDto: {
    email: string
    senha: string
    tipoPerfil: 'PROFISSIONAL_SAUDE'
  }
  nome: string
  documentosRegistro: string[]
  biografiaOuDescricao: string | null
}

export function apiProfileFrom(raw: string): UserProfile {
  if (raw === 'PROFISSIONAL_SAUDE') return 'PROFISSIONAL'
  if (raw === 'PACIENTE') return 'PACIENTE'
  return 'DESCONHECIDO'
}

/**
 * O login nao devolve nome. Enquanto a API nao incluir esse dado, o nome sai
 * da parte local do e-mail ("ana.souza@..." vira "Ana Souza") para a
 * sidebar nao ficar vazia.
 */
export function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  const words = local
    .split(/[._-]+/)
    .filter((word) => word !== '')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
  return words.length > 0 ? words.join(' ') : email
}

export function sessionFromApiLogin(dto: ApiLoginResponseDTO, email: string): Session {
  const user: User = {
    // O subject do JWT e o e-mail; a API nao expoe outro identificador.
    id: email,
    name: nameFromEmail(email),
    email,
    profile: apiProfileFrom(dto.tipoPerfil),
    city: null,
  }
  return { token: dto.token, user, isVerified: dto.validadoInstitucionalmente }
}

/**
 * "CRM-DF 123456". A API guarda o registro como texto livre, entao o formato
 * segue o exemplo do Swagger.
 */
export function registrationText(draft: SignUpDraft): string {
  const { councilId, stateId, number } = draft.professional
  return `${councilId ?? ''}-${stateId ?? ''} ${number}`.trim()
}

export function professionalSignUpToApi(draft: SignUpDraft): ApiProfessionalSignUpDTO {
  return {
    usuarioDto: {
      email: draft.email,
      senha: draft.password,
      tipoPerfil: 'PROFISSIONAL_SAUDE',
    },
    nome: draft.name,
    documentosRegistro: [registrationText(draft)],
    biografiaOuDescricao: null,
  }
}

/** Monta o multipart: o JSON vai como parte `dados`, com tipo application/json. */
export function professionalSignUpForm(draft: SignUpDraft): FormData {
  const form = new FormData()
  form.append(
    'dados',
    new Blob([JSON.stringify(professionalSignUpToApi(draft))], { type: 'application/json' }),
  )
  return form
}

/**
 * Login e cadastro vao para a API real. Codigo por e-mail, Google, nova senha
 * e catalogo de conselhos nao existem la e continuam no `fallback`.
 */
export function createCareBridgeAuthRepository(
  client: HttpClient,
  fallback: AuthRepository,
): AuthRepository {
  return {
    async login(email, password): Promise<Session> {
      const dto = await client.send<ApiLoginResponseDTO>({
        path: 'user/login',
        method: 'POST',
        body: { email, password },
      })
      const session = sessionFromApiLogin(dto, email)
      // O painel e so do profissional; paciente e admin usam outros apps.
      if (session.user.profile !== 'PROFISSIONAL') throw new WrongProfileError(session.user.profile)
      return session
    },

    async signUp(draft): Promise<PendingVerification> {
      await client.sendVoid({
        path: 'profissional-saude/cadastro',
        method: 'POST',
        body: professionalSignUpForm(draft),
      })
      return { email: draft.email, profile: 'PROFISSIONAL', codeLength: 0, requiresCode: false }
    },

    loginWithGoogle: () => fallback.loginWithGoogle(),
    verify: (email, code) => fallback.verify(email, code),
    resendCode: (email) => fallback.resendCode(email),
    requestPasswordReset: (email) => fallback.requestPasswordReset(email),
    professionalCatalog: (): Promise<ProfessionalCatalog> => fallback.professionalCatalog(),
  }
}
