import type { AuthRepository } from '@/domain/repositories'

/**
 * Qual rota de acesso vai para a API real (carebridge-api, Spring) e qual
 * continua no servidor simulado. Os dois falam o mesmo contrato v2, entao a
 * diferenca e so o cliente HTTP de cada repositorio.
 *
 * Codigo por e-mail e recuperar senha sao a etapa 4 do contrato e seguem no
 * simulado ate o backend responder igual. O resto vai para a API real.
 */
export function createCareBridgeAuthRepository(
  real: AuthRepository,
  fallback: AuthRepository,
): AuthRepository {
  return {
    login: (email, password) => real.login(email, password),
    signUp: (draft) => real.signUp(draft),
    verify: (email, code) => fallback.verify(email, code),
    resendCode: (email) => fallback.resendCode(email),
    requestPasswordReset: (email) => fallback.requestPasswordReset(email),
    catalog: () => real.catalog(),
  }
}
