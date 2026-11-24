/** DTOs do contrato v2 do backend. */

export interface TriageQuestionDTO {
  id: string
  rotulo: string
  tipo: string
  obrigatoria: boolean
  opcoes?: string[] | null
  permiteVarias?: boolean | null
}

export interface OpportunityDTOv2 {
  id: string
  titulo: string
  descricao?: string | null
  tipoServico?: string | null
  especialidade: string
  modalidade: string
  modalidadeAcesso: string
  preco?: number | null
  publicoAlvo?: string[] | null
  vagasTotais: number
  vagasPreenchidas: number
  cep?: string | null
  endereco?: string | null
  cidade?: string | null
  uf?: string | null
  distanciaKm?: number | null
  inscricoesDe?: string | null
  inscricoesAte?: string | null
  criteriosElegibilidade?: string | null
  semRestricoes?: boolean | null
  formaContato?: string | null
  status: string
  ultimaAtualizacao: string
  totalInscricoes?: number | null
  ofertante?: { id: string; nome: string; verificado: boolean } | null
  triagem?: {
    modo: string
    perguntas?: TriageQuestionDTO[] | null
    documentosExigidos?: { id: string; rotulo: string }[] | null
  } | null
}

export interface CreateOpportunityRequestDTO {
  status: string
  titulo: string
  tipoServico: string | null
  publicoAlvo: string[]
  descricao: string
  especialidade: string
  modalidade: string
  cep: string | null
  endereco: string | null
  modalidadeAcesso: string
  preco: number | null
  vagasTotais: number
  inscricoesDe: string
  inscricoesAte: string
  criteriosElegibilidade: string | null
  semRestricoes: boolean
  formaContato: string | null
  triagem: {
    modo: string
    perguntas: TriageQuestionDTO[]
    documentosExigidos: { id: string; rotulo: string }[]
  }
}

export interface ApplicationDTOv2 {
  id: string
  protocolo: string
  status: string
  oportunidade: { id: string; titulo: string; especialidade?: string | null }
  paciente?: { nome: string } | null
  dataInscricao: string
  prazoResposta?: string | null
  decididaEm?: string | null
  motivoDecisao?: string | null
  respostasTriagem?: { perguntaId: string; pergunta: string; resposta: string }[] | null
  documentos?: {
    id: string
    documentoId: string
    nomeArquivo: string
    tamanhoBytes: number
    enviadoEm?: string | null
  }[] | null
  mensagensNaoLidas?: number | null
  podeTrocarMensagens?: boolean | null
  mensagens?: MessageDTOv2[] | null
}

export interface MessageDTOv2 {
  id: string
  autor: string
  nomeAutor?: string | null
  texto: string
  enviadaEm: string
}