// ─── SLA ─────────────────────────────────────────────────────────────────────
export const SLA_TARGET_MINUTES = 120
export const SLA_RATE_TARGET = 85      // % mínimo de atendimentos dentro do SLA
export const QUICK_WIN_THRESHOLD = 15  // minutos — atendimentos "quick win"
export const CRITICAL_HOURS = 24       // horas — atendimentos críticos (+24h abertos)

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
