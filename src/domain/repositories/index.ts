import type { Catalog, PendingVerification, Session, SignUpDraft } from '@/domain/entities'

/** Protocolos que o dominio declara e a camada de dados cumpre. */

export interface AuthRepository {
  login(email: string, password: string): Promise<Session>
  signUp(draft: SignUpDraft): Promise<PendingVerification>
  /** Nulo quando o e-mail foi confirmado mas a senha nao esta mais na memoria. */
  verify(email: string, code: string): Promise<Session | null>
  resendCode(email: string): Promise<void>
  /** Envia o codigo de nova senha. Nao diz se o e-mail tem conta. */
  requestPasswordReset(email: string): Promise<void>
  resetPassword(email: string, code: string, newPassword: string): Promise<void>
  /** LGPD: tudo o que a API guarda da conta, em JSON. */
  exportMyData(): Promise<unknown>
  /** LGPD: anonimiza a conta. Pede a senha atual. */
  deleteAccount(password: string): Promise<void>
  catalog(): Promise<Catalog>
}
