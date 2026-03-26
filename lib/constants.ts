// ─── SLA / ITIL KPIs ──────────────────────────────────────────────────────────
/** MTTR — Meta de Tempo Médio de Resolução (Mean Time To Resolve) */
export const SLA_TARGET_MINUTES = 120
export const MTTR_TARGET_MINUTES = 120  // alias semântico ITIL

/** Taxa de cumprimento de SLA — metas verde / amarelo / vermelho */
export const SLA_RATE_TARGET  = 85  // % ≥ este valor: verde
export const SLA_RATE_WARNING = 70  // % ≥ este valor: amarelo; abaixo: vermelho

/** TMA — faixas de cor (verde / amarelo / vermelho) */
export const TMA_GREEN_MAX  = 60   // minutos — TMA ≤ 60 min: verde
export const TMA_YELLOW_MAX = 120  // minutos — TMA 61-120 min: amarelo; >120: vermelho

/** MTTA — Mean Time To Acknowledge (primeira interação no ticket) */
export const MTTA_TARGET_MINUTES  = 30   // ≤ 30 min: verde
export const MTTA_WARNING_MINUTES = 60   // 31–60 min: amarelo; > 60 min: vermelho

/** FCR — First Call Resolution: meta percentual */
export const FCR_TARGET = 80       // % de tickets resolvidos sem reabertura (referência ITIL)

/** Backlog — limite de alerta para tickets em aberto */
export const BACKLOG_WARNING_COUNT = 30  // acima deste número emite alerta amarelo
export const BACKLOG_CRITICAL_COUNT = 60 // acima deste número emite alerta vermelho

/** Quick Wins & Críticos */
export const QUICK_WIN_THRESHOLD = 15  // minutos — atendimentos "quick win"
export const CRITICAL_HOURS = 24       // horas — atendimentos críticos (+24h abertos)

/** Tempo máximo válido para considerar uma resolução (em dias) */
export const MAX_RESOLUTION_DAYS = 30

/** SLA por prioridade inferida (em minutos) */
export const SLA_POR_PRIORIDADE: Record<string, number> = {
  Critico: 4  * 60,   // 240 min
  Alto:    8  * 60,   // 480 min
  Medio:   24 * 60,   // 1440 min
  Baixo:   72 * 60,   // 4320 min
}

/** Mapeamento de categoria → prioridade inferida */
export const PRIORIDADE_POR_CATEGORIA: Record<string, "Critico" | "Alto" | "Medio" | "Baixo"> = {
  "Erro / Falha do Sistema":       "Critico",
  "Sync / Sincronização":          "Critico",
  "Acesso / Login":                "Alto",
  "Pedidos / Integração":          "Alto",
  "Notas / Acerto":                "Alto",
  "Tablet":                        "Medio",
  "Cadastro":                      "Medio",
  "Gestão de Distribuidor":        "Medio",
  "Liberação / Permissão":         "Medio",
  "Financeiro / Faturamento":      "Medio",
  "Configuração / Parametrização": "Medio",
  "Semanas / Campanha":            "Baixo",
  "Impressão / Hardware":          "Baixo",
  "Relatório / Consulta":          "Baixo",
  "Dúvida / Treinamento":          "Baixo",
  "Outros":                        "Baixo",
}

/** Cores de cada prioridade */
export const PRIORIDADE_COLORS: Record<string, string> = {
  Critico: "#ef4444",
  Alto:    "#f97316",
  Medio:   "#f59e0b",
  Baixo:   "#3b82f6",
}

/** Polling interval para endpoints de tempo real (ms) */
export const LIVE_POLL_INTERVAL_MS = 60_000   // 1 minuto

// ─── Paginação / limites de tabela ───────────────────────────────────────────
export const VIOLATIONS_PER_PAGE = 20
export const CATEGORY_EXAMPLES_PER_PAGE = 4
export const CATEGORY_CHART_LIMIT = 10  // categorias exibidas no gráfico de ranking
export const RECENT_TICKETS_LIMIT = 20  // últimos encerrados na visão geral
export const KEYWORD_MIN_COUNT = 3      // mínimo de ocorrências para aparecer na nuvem

// ─── Cores de status ─────────────────────────────────────────────────────────
export const STATUS_COLORS = {
  "Encerrado":            "#10b981",
  "Em Atendimento":       "#3b82f6",
  "Aguardando Aprovação": "#f59e0b",
  "Aberto":               "#6b7280",
} as const

// ─── Paleta de cores para gráficos ───────────────────────────────────────────
/** Paleta variada — usada em pie charts e categorias */
export const CHART_COLORS = [
  "#1a56db", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe",
  "#f59e0b", "#10b981", "#6366f1", "#ec4899", "#8b5cf6",
] as const

/** Paleta em tons de azul — usada em bar charts de ranking */
export const CHART_COLORS_BLUE = [
  "#1a56db", "#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa",
  "#93c5fd", "#bfdbfe", "#1e40af", "#1e3a8a", "#172554",
] as const

/** Cor única para barras/linhas simples */
export const CHART_COLOR_PRIMARY = "#1a56db"
export const CHART_COLOR_SECONDARY = "#f59e0b"

// ─── Toasts ───────────────────────────────────────────────────────────────────
export const TOAST_DURATION_MS = 5000  // 5 segundos

// ─── Background fetch ─────────────────────────────────────────────────────────
export const FETCH_MAX_RETRIES = 3
export const FETCH_RETRY_BASE_MS = 1000  // base para backoff exponencial
