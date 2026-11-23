/**
 * Espelham exatamente o que a API envia e recebe nas rotas de acesso e de
 * catalogo. Ver CONTRATO-API-CareBridge.md (versao 2), secoes 1, 3 e 4.
 */

/** `tipoPerfil`. */
export type TipoPerfil = 'PACIENTE' | 'PROFISSIONAL_SAUDE' | 'ADMIN'

/** `situacaoRegistro`, so do profissional. */
export type SituacaoRegistro = 'EM_VERIFICACAO' | 'VERIFICADO' | 'RECUSADO'

/** POST /auth/login */
export interface LoginRequestDTO {
  email: string
  password: string
}

/** Resposta de POST /auth/login. */
export interface LoginResponseDTO {
  token: string
  autenticado: boolean
  tipoPerfil: string
  validadoInstitucionalmente: boolean
  /** Novo na versao 2; a API real ainda pode nao mandar. */
  expiraEmSegundos?: number | null
}

/** GET /user/me */
export interface MeDTO {
  id: string
  email: string
  tipoPerfil: string
  nome: string
  dataNascimento?: string | null
  telefone?: string | null
  situacaoRegistro?: string | null
  /** Registro profissional; so do profissional. */
  conselho?: string | null
  uf?: string | null
  numeroRegistro?: string | null
  especialidade?: string | null
  ondeAtende?: string | null
}

export interface UsuarioDTO {
  email: string
  senha: string
  tipoPerfil: TipoPerfil
}

/**
 * Parte `dados` (JSON) do multipart de POST /auth/register. O `tipoPerfil` da
 * raiz escolhe o tipo do cadastro. Os termos vao nos dois nomes: a API le
 * `acceptedTerms`, e `aceitouTermos` e o nome do contrato.
 */
export interface ProfissionalCadastroDTO {
  tipoPerfil: 'PROFISSIONAL_SAUDE'
  usuarioDto: UsuarioDTO
  nome: string
  conselho: string
  uf: string
  numeroRegistro: string
  especialidade: string | null
  ondeAtende: string | null
  biografiaOuDescricao: string | null
  aceitouTermos: boolean
  acceptedTerms: boolean
}

/** Resposta 201 do cadastro. Pode vir vazia: os clientes leem como sem codigo. */
export interface CadastroResponseDTO {
  email: string
  tipoPerfil: string
  exigeVerificacao: boolean
  tamanhoCodigo?: number | null
}

/** POST /auth/verify */
export interface VerificacaoRequestDTO {
  email: string
  code: string
}

/** POST /auth/resend-code e primeiro passo de POST /auth/password-reset */
export interface EmailRequestDTO {
  email: string
}

/** Segundo passo de POST /auth/password-reset */
export interface RedefinirSenhaRequestDTO {
  email: string
  code: string
  newPassword: string
}

/** Resposta de /auth/verify e /auth/password-reset. */
export interface MensagemDTO {
  message: string
}

/** GET /catalogos */
export interface CatalogosDTO {
  especialidades: { id: string; nome: string }[]
  conselhos: { sigla: string; profissao: string }[]
  ufs: string[]
  distanciasKm: number[]
}
