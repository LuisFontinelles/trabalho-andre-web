import type {
  CadastroResponseDTO,
  CatalogosDTO,
  LoginResponseDTO,
  MeDTO,
} from '@/data/dto'
import {
  catalogFromDTO,
  pendingVerificationFromDTO,
  sessionFromDTO,
  signUpForm,
} from '@/data/mappers'
import { bearer, NetworkError, type HttpClient } from '@/data/network/httpClient'
import { WrongProfileError, type Session } from '@/domain/entities'
import type { AuthRepository } from '@/domain/repositories'

/**
 * GET /user/me logo depois do login, para ter o nome. A rota e nova no
 * contrato: se a API ainda nao tem (404), barra (401/403) ou nao responde,
 * o login segue com o nome tirado do e-mail.
 */
async function fetchMe(client: HttpClient, token: string): Promise<MeDTO | null> {
  try {
    return await client.send<MeDTO>({ path: 'user/me', headers: bearer(token) })
  } catch (error) {
    if (error instanceof NetworkError) return null
    throw error
  }
}

/** O painel e so do profissional; paciente e admin usam outros apps. */
function professionalOnly(session: Session): Session {
  if (session.user.profile !== 'PROFISSIONAL') throw new WrongProfileError(session.user.profile)
  return session
}

/** Acesso e catalogo, no formato do contrato v2 (secoes 3 e 4). */
export function createAuthRepository(client: HttpClient): AuthRepository {
  async function sessionFor(login: LoginResponseDTO, email: string): Promise<Session> {
    const me = await fetchMe(client, login.token)
    return professionalOnly(sessionFromDTO(login, me, email))
  }

  return {
    async login(email, password) {
      const dto = await client.send<LoginResponseDTO>({
        path: 'user/login',
        method: 'POST',
        body: { email, password },
      })
      return sessionFor(dto, email)
    },

    async signUp(draft) {
      const dto = await client.sendOptional<CadastroResponseDTO>({
        path: 'profissional-saude/cadastro',
        method: 'POST',
        body: signUpForm(draft),
      })
      return pendingVerificationFromDTO(dto, draft.email)
    },

    async verify(email, code) {
      const dto = await client.send<LoginResponseDTO>({
        path: 'user/verificacao',
        method: 'POST',
        body: { email, codigo: code },
      })
      return sessionFor(dto, email)
    },

    async resendCode(email) {
      await client.sendVoid({ path: 'user/verificacao/reenvio', method: 'POST', body: { email } })
    },

    async requestPasswordReset(email) {
      await client.sendVoid({ path: 'user/senha/recuperacao', method: 'POST', body: { email } })
    },

    async catalog() {
      return catalogFromDTO(await client.send<CatalogosDTO>({ path: 'catalogos' }))
    },
  }
}
