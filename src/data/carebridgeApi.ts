import type { AuthRepository } from '@/domain/repositories'

/**
 * Qual rota de acesso vai para a API real (carebridge-api, Spring) e qual
 * continua no servidor simulado. Os dois falam o mesmo contrato v2, entao a
 * diferenca e so o cliente HTTP de cada repositorio.
 *
 * Na API real ja existem login e cadastro do profissional. Codigo por
 * e-mail, recuperar senha e catalogo sao rotas novas (etapas 2 e 4 do
 * contrato) e seguem no simulado ate o backend responder igual.
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
    catalog: () => fallback.catalog(),
  }
}
