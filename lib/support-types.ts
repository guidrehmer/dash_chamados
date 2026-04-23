// Types for support ticket data
export interface TicketRaw {
  dataabertura: string
  dataencerrado: string | null
  descricao: string
  situacao: "Encerrado" | "Em Atendimento" | "Aguardando Aprovação" | "Aberto"
  grupo: "SISTEMAS" | "CIT" | "IA"
  responsavel: string | null
  /** Timestamp da primeira interação no ticket — base de cálculo do MTTA */
  menor_historico?: string | null
}

/** Item retornado pelo endpoint /fila/ (sem responsável) */
export interface FilaItem {
  nr_chamado: string | number | null
  dataabertura: string
  descricao: string
  situacao: string
  grupo: string
}

/** Item retornado pelo endpoint /aguardando/ (em aberto/atendimento) */
export interface AguardandoItem {
  nr_chamado: string | number | null
  dataabertura: string
  dataencerrado: string | null
  descricao: string
  situacao: string
  grupo: string
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
  tempoResolucao: number | null   // MTTR em minutos
  mtta: number | null             // MTTA em minutos (menor_historico - dataabertura)
  prioridadeInferida: "Critico" | "Alto" | "Medio" | "Baixo"
  slaTargetMinutes: number        // meta SLA em minutos baseada na prioridade inferida
  dentroSLAPrioridade: boolean | null  // null = sem tempo de resolução
  dataAberturaLocal: Date
  dataEncerradoLocal: Date | null
}

export interface APIResponse {
  items: TicketRaw[]
  hasMore: boolean
  nextOffset?: number | null
}

export type PeriodFilter = "hoje" | "semana" | "mes" | "personalizado" | "todos"
export type GroupFilter = "TODOS" | "SISTEMAS" | "CIT" | "IA"

export interface KPIData {
  total: number
  hoje: number
  semana: number
  mes: number
  tma: number // tempo medio atendimento em minutos (= MTTR ITIL)
  taxaSLA: number // percentual
  tempoMaximo: number
  quickWins: number // percentual < 15min
  taxaResolucao: number
  categoriaMaisRecorrente: { nome: string; percentual: number }
  horaPico: number
  violacoesSLA: number
  criticalTickets: number // tickets que levaram mais de 24h
  semResponsavel: number  // tickets sem responsável atribuído
  // ── KPIs ITIL adicionais ───────────────────────────────────────────────────
  backlog: number          // tickets ainda não encerrados (Aberto + Em Atendimento + Aguardando)
  taxaBacklog: number      // % de tickets em aberto sobre o total
  taxaEscalacao: number    // % de tickets em "Aguardando Aprovação" (proxy de escalação)
  mediaDiariaTickets: number // média de tickets abertos por dia no período
  mtta: number             // Mean Time To Acknowledge médio em minutos
  taxaSLAPrioridade: PrioridadeStats[]  // SLA cumprido por nível de prioridade
  backlogPorIdade: BacklogIdadeFaixas   // distribuição de tickets em aberto por tempo de espera
}

/** SLA breakdown por prioridade inferida */
export interface PrioridadeStats {
  prioridade: "Critico" | "Alto" | "Medio" | "Baixo"
  total: number
  dentroPrazo: number
  taxaSLA: number         // % dentro do SLA da prioridade
  tma: number             // tempo médio para esta prioridade
  slaTarget: number       // meta em minutos
}

/** Backlog segmentado por tempo de espera */
export interface BacklogIdadeFaixas {
  menosDe4h: number
  de4hA24h: number
  de1A3dias: number
  maisDe3dias: number
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
  backlog: number
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
  // ── Novas categorias (reduzem "Outros") ───────────────────────────────────
  "Erro / Falha do Sistema",
  "Relatório / Consulta",
  "Financeiro / Faturamento",
  "Impressão / Hardware",
  "Configuração / Parametrização",
  "Dúvida / Treinamento",
  "Outros"
] as const

export type Categoria = typeof CATEGORIAS[number]
