// Types for support ticket data
export interface TicketRaw {
  dataabertura: string
  dataencerrado: string | null
  descricao: string
  situacao: "Encerrado" | "Em Atendimento" | "Aguardando Aprovação" | "Aberto"
  grupo: "SISTEMAS" | "CIT"
  responsavel: string | null
}

export interface ResponsavelStats {
  nome: string
  total: number
  encerrados: number
  emAtendimento: number
  taxaResolucao: number
  tma: number
}

export interface Ticket extends TicketRaw {
  categoria: string
  tempoResolucao: number | null // in minutes
  dataAberturaLocal: Date
  dataEncerradoLocal: Date | null
}

export interface APIResponse {
  items: TicketRaw[]
  hasMore: boolean
}

export type PeriodFilter = "hoje" | "semana" | "mes" | "todos"
export type GroupFilter = "TODOS" | "SISTEMAS" | "CIT"

export interface KPIData {
  total: number
  hoje: number
  semana: number
  mes: number
  tma: number // tempo medio atendimento em minutos
  taxaSLA: number // percentual
  tempoMaximo: number
  quickWins: number // percentual < 15min
  taxaResolucao: number
  categoriaMaisRecorrente: { nome: string; percentual: number }
  horaPico: number
  violacoesSLA: number
}

export interface CategoryStats {
  nome: string
  total: number
  encerrados: number
  taxaResolucao: number
  tma: number
  piorCaso: number
}

export interface HourlyData {
  hora: number
  quantidade: number
}

export interface DailyData {
  data: string
  quantidade: number
  tma: number
}

export interface TimeDistribution {
  faixa: string
  quantidade: number
  dentroSLA: boolean
}

export const CATEGORIAS = [
  "Sync / Sincronização",
  "Tablet",
  "Acesso / Login",
  "Notas / Acerto",
  "Pedidos / Integração",
  "Gestão de Distribuidor",
  "Liberação / Permissão",
  "Cadastro",
  "Semanas / Campanha",
  "Outros"
] as const

export type Categoria = typeof CATEGORIAS[number]
