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
import type { Session } from '@/domain/entities'
import type { AuthRepository } from '@/domain/repositories'

export const PROFESSIONAL_SIGNUP_URL = 'http://localhost:8080/profissional-saude/cadastro'
export const USER_LOGIN_URL = 'http://localhost:8080/user/login'

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

/** Acesso (/auth/*) e catalogo da carebridge-api. */
export function createAuthRepository(client: HttpClient): AuthRepository {
  async function sessionFor(login: LoginResponseDTO, email: string): Promise<Session> {
    const me = await fetchMe(client, login.token)
    return sessionFromDTO(login, me, email)
  }

  // /auth/verify so confirma o e-mail e nao devolve token. A senha do cadastro
  // fica so na memoria para entrar logo depois; recarregar a pagina a perde.
  const pendingPasswords = new Map<string, string>()

  async function login(email: string, password: string): Promise<Session> {
    const { data: dto, status } = await client.sendWithStatus<LoginResponseDTO>({
      path: USER_LOGIN_URL,
      method: 'POST',
      body: { email, password },
    })
    if (
      status !== 200 ||
      dto.autenticado !== true ||
      typeof dto.token !== 'string' ||
      dto.token.trim() === ''
    ) {
      throw new NetworkError('decoding', 'Não foi possível iniciar a sessão.', status)
    }
    return sessionFor(dto, email)
  }

  return {
    login,

    async signUp(draft, biographyOrDescription = '', documents = []) {
      const dto = await client.sendOptional<CadastroResponseDTO>({
        path: PROFESSIONAL_SIGNUP_URL,
        method: 'POST',
        body: signUpForm(draft, biographyOrDescription, documents),
      })
      const pending = pendingVerificationFromDTO(dto, draft.email)
      if (pending.requiresCode) pendingPasswords.set(pending.email, draft.password)
      return pending
    },

    async verify(email, code) {
      await client.sendVoid({ path: 'auth/verify', method: 'POST', body: { email, code } })
      const password = pendingPasswords.get(email)
      if (password === undefined) return null
      pendingPasswords.delete(email)
      return login(email, password)
    },

    async resendCode(email) {
      await client.sendVoid({ path: 'auth/resend-code', method: 'POST', body: { email } })
    },

    async requestPasswordReset(email) {
      await client.sendVoid({ path: 'auth/password-reset', method: 'POST', body: { email } })
    },

    async resetPassword(email, code, newPassword) {
      await client.sendVoid({
        path: 'auth/password-reset',
        method: 'POST',
        body: { email, code, newPassword },
      })
    },

    async exportMyData() {
      return client.send<unknown>({ path: 'me/data-export', method: 'POST', authenticated: true })
    },

    async deleteAccount(password) {
      await client.sendVoid({
        path: 'me',
        method: 'DELETE',
        body: { password },
        authenticated: true,
        checksPassword: true,
      })
    },

    async catalog() {
      return catalogFromDTO(await client.send<CatalogosDTO>({ path: 'catalogos' }))
    },
  }
}
