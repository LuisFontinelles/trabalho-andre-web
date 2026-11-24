/**
 * DTOs do painel do profissional: oportunidade, triagem e inscricao, como a
 * API envia. Ver CONTRATO-API-CareBridge.md (versao 2), secoes 2, 5, 6 e 7.
 * Os valores fechados vao em MAIUSCULAS; o mapper traduz para o dominio.
 */

export interface OfertanteDTO {
  id: string
  nome: string
  conselho: string | null
  uf: string | null
  numeroRegistro: string | null
  ondeAtende: string | null
  verificado: boolean
}

export interface DependenciaDTO {
  perguntaId: string
  resposta: string
}

/** `Pergunta`. Os campos opcionais so vao quando fazem sentido para o tipo. */
export interface PerguntaDTO {
  id: string
  rotulo: string
  /** TEXTO_CURTO, TEXTO_LONGO, SIM_NAO, MULTIPLA */
  tipo: string
  obrigatoria: boolean
  opcoes?: string[]
  permiteVarias?: boolean
  minCaracteres?: number
  maxCaracteres?: number
  ajuda?: string
  dependeDe?: DependenciaDTO
}

export interface DocumentoExigidoDTO {
  id: string
  rotulo: string
}

export interface TriagemDTO {
  /** PADRAO ou PERSONALIZADO */
  modo: string
  perguntas: PerguntaDTO[]
  documentosExigidos: DocumentoExigidoDTO[]
}

/** `Oportunidade`. */
export interface OportunidadeDTO {
  id: string
  titulo: string
  descricao: string | null
  tipoServico: string | null
  especialidade: string | null
  modalidade: string | null
  modalidadeAcesso: string | null
  preco: number | null
  publicoAlvo: string[] | null
  publicoAlvoObservacao: string | null
  vagasTotais: number | null
  vagasPreenchidas: number
  cep: string | null
  endereco: string | null
  cidade: string | null
  uf: string | null
  distanciaKm: number | null
  inscricoesDe: string | null
  inscricoesAte: string | null
  criteriosElegibilidade: string | null
  semRestricoes: boolean
  formaContato: string | null
  prazoRespostaDias: number | null
  /** RASCUNHO, ATIVA, ENCERRADA */
  status: string
  ultimaAtualizacao: string
  ofertante: OfertanteDTO
  triagem: TriagemDTO | null
  /** So nas rotas do profissional dono; nulo na busca publica. */
  totalInscricoes: number | null
}

/**
 * Corpo de POST /oportunidades e PUT /oportunidades/{id}: a Oportunidade sem
 * id, ofertante, vagasPreenchidas, distanciaKm, ultimaAtualizacao e
 * totalInscricoes. Rascunho aceita campos vazios.
 */
export type OportunidadeRequestDTO = Omit<
  OportunidadeDTO,
  'id' | 'ofertante' | 'vagasPreenchidas' | 'distanciaKm' | 'ultimaAtualizacao' | 'totalInscricoes'
>

export interface RespostaTriagemDTO {
  perguntaId: string
  pergunta: string
  resposta: string
}

export interface DocumentoInscricaoDTO {
  id: string
  documentoId: string
  nomeArquivo: string
  tamanhoBytes: number
  enviadoEm: string
}

export interface MensagemDTO {
  id: string
  /** PACIENTE ou PROFISSIONAL_SAUDE */
  autor: string
  nomeAutor: string
  texto: string
  enviadaEm: string
}

export interface CombinadoDTO {
  quando: string
  onde: string
  levar: string
}

export interface PedidoInformacaoDTO {
  texto: string
  prazo: string
}

/** `Inscricao`. O mesmo objeto atende paciente e profissional. */
export interface InscricaoDTO {
  id: string
  protocolo: string
  /** RECEBIDA, EM_ANALISE, AGUARDANDO_INFORMACOES, APROVADA, RECUSADA, CANCELADA */
  status: string
  oportunidade: { id: string; titulo: string; especialidade: string | null }
  ofertante: { nome: string; ondeAtende: string | null }
  paciente: { nome: string }
  dataInscricao: string
  prazoResposta: string | null
  decididaEm: string | null
  motivoDecisao: string | null
  pedidoInformacao: PedidoInformacaoDTO | null
  combinado: CombinadoDTO | null
  respostasTriagem: RespostaTriagemDTO[]
  documentos: DocumentoInscricaoDTO[]
  consentimentoDadosSaudeEm: string | null
  mensagensNaoLidas: number
  ultimaMensagem: MensagemDTO | null
  podeTrocarMensagens: boolean
  /** Lista so no detalhe; nula nas listas. */
  mensagens: MensagemDTO[] | null
}

/** POST /profissional-saude/inscricoes/{id}/decisao */
export interface DecisaoRequestDTO {
  status: 'APROVADA' | 'RECUSADA'
  motivo: string | null
  combinado: CombinadoDTO | null
}

/** POST .../pedido-informacao e POST .../mensagens */
export interface TextoRequestDTO {
  texto: string
}
