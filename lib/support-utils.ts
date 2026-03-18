import type { Ticket, TicketRaw, CategoryStats, ResponsavelStats, HourlyData, DailyData, TimeDistribution, KPIData, PeriodFilter, GroupFilter, Categoria } from "./support-types"

// SLA target in minutes
const SLA_TARGET = 120

// Stop words to remove from word cloud
const STOP_WORDS = new Set([
  "bom", "boa", "dia", "tarde", "por", "favor", "gentileza",
  "podem", "preciso", "solicito", "obrigado", "obrigada", "tudo",
  "bem", "oi", "olá", "ola", "att", "please", "buen", "buenos",
  "de", "da", "do", "dos", "das", "que", "para", "com", "uma",
  "um", "os", "as", "no", "na", "nos", "nas", "ao", "aos", "em",
  "se", "ou", "e", "a", "o", "é", "está", "ser", "ter", "foi",
  "the", "and", "is", "to", "of", "in", "it", "on", "for", "at"
])

// Categorize ticket based on description
export function categorizeTicket(descricao: string): Categoria {
  const desc = descricao.toLowerCase()
  
  if (desc.includes("sync") || desc.includes("sincroniz")) {
    return "Sync / Sincronização"
  }
  if (desc.includes("tablet") || desc.includes("série") || desc.includes("serie") || desc.includes("inativ")) {
    return "Tablet"
  }
  if (desc.includes("login") || desc.includes("acesso") || desc.includes("usuário") || 
      desc.includes("usuario") || desc.includes("senha") || desc.includes("criação de login") || 
      desc.includes("criar usuario") || desc.includes("optimus")) {
    return "Acesso / Login"
  }
  if (desc.includes("nota") || desc.includes("acerto") || desc.includes("acertad") || desc.includes("cobrança")) {
    return "Notas / Acerto"
  }
  if (desc.includes("pedido") || desc.includes("integr") || desc.includes("remessa")) {
    return "Pedidos / Integração"
  }
  if ((desc.includes("distribuidor") || desc.includes("distribuidora")) && !desc.includes("tablet")) {
    return "Gestão de Distribuidor"
  }
  if (desc.includes("liberação") || desc.includes("liberacao") || desc.includes("aba") || 
      desc.includes("permissão") || desc.includes("botão")) {
    return "Liberação / Permissão"
  }
  if (desc.includes("cadastro") || desc.includes("cadastr")) {
    return "Cadastro"
  }
  if (desc.includes("semana") || desc.includes("campanha") || desc.includes("week")) {
    return "Semanas / Campanha"
  }
  return "Outros"
}

// Convert UTC date to Brazil local time (UTC-3)
export function toBrazilTime(dateStr: string): Date {
  return new Date(dateStr)
}

// Calculate resolution time in minutes
export function calculateResolutionTime(abertura: string, encerrado: string | null): number | null {
  if (!encerrado) return null
  
  const start = new Date(abertura).getTime()
  const end = new Date(encerrado).getTime()
  const diffMinutes = (end - start) / (1000 * 60)
  
  // Filter out invalid data (negative or > 24h)
  if (diffMinutes < 0 || diffMinutes > 24 * 60) return null
  
  return Math.round(diffMinutes)
}

// Process raw tickets into enriched tickets
export function processTickets(rawTickets: TicketRaw[]): Ticket[] {
  return rawTickets.map(ticket => ({
    ...ticket,
    categoria: categorizeTicket(ticket.descricao),
    tempoResolucao: calculateResolutionTime(ticket.dataabertura, ticket.dataencerrado),
    dataAberturaLocal: toBrazilTime(ticket.dataabertura),
    dataEncerradoLocal: ticket.dataencerrado ? toBrazilTime(ticket.dataencerrado) : null
  }))
}

// Filter tickets by period
export function filterByPeriod(tickets: Ticket[], period: PeriodFilter): Ticket[] {
  if (period === "todos") return tickets
  
  const now = new Date()
  const brazilNow = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  
  const startOfDay = new Date(brazilNow)
  startOfDay.setHours(0, 0, 0, 0)
  
  const startOfWeek = new Date(brazilNow)
  const dayOfWeek = brazilNow.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday as start
  startOfWeek.setDate(brazilNow.getDate() - diff)
  startOfWeek.setHours(0, 0, 0, 0)
  
  const startOfMonth = new Date(brazilNow.getFullYear(), brazilNow.getMonth(), 1)
  
  return tickets.filter(ticket => {
    const ticketDate = ticket.dataAberturaLocal
    switch (period) {
      case "hoje":
        return ticketDate >= startOfDay
      case "semana":
        return ticketDate >= startOfWeek
      case "mes":
        return ticketDate >= startOfMonth
      default:
        return true
    }
  })
}

// Filter tickets by group
export function filterByGroup(tickets: Ticket[], group: GroupFilter): Ticket[] {
  if (group === "TODOS") return tickets
  return tickets.filter(t => t.grupo === group)
}

// Calculate KPIs
export function calculateKPIs(tickets: Ticket[]): KPIData {
  const now = new Date()
  const brazilNow = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  
  const startOfDay = new Date(brazilNow)
  startOfDay.setHours(0, 0, 0, 0)
  
  const startOfWeek = new Date(brazilNow)
  const dayOfWeek = brazilNow.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  startOfWeek.setDate(brazilNow.getDate() - diff)
  startOfWeek.setHours(0, 0, 0, 0)
  
  const startOfMonth = new Date(brazilNow.getFullYear(), brazilNow.getMonth(), 1)
  
  const hoje = tickets.filter(t => t.dataAberturaLocal >= startOfDay).length
  const semana = tickets.filter(t => t.dataAberturaLocal >= startOfWeek).length
  const mes = tickets.filter(t => t.dataAberturaLocal >= startOfMonth).length
  
  // Time calculations (only for tickets with valid resolution time)
  const ticketsWithTime = tickets.filter(t => t.tempoResolucao !== null)
  const times = ticketsWithTime.map(t => t.tempoResolucao as number)
  
  const tma = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0
  const tempoMaximo = times.length > 0 ? Math.max(...times) : 0
  const quickWins = times.length > 0 
    ? Math.round((times.filter(t => t < 15).length / times.length) * 100)
    : 0
  const taxaSLA = times.length > 0
    ? Math.round((times.filter(t => t <= SLA_TARGET).length / times.length) * 100)
    : 0
  const violacoesSLA = times.filter(t => t > SLA_TARGET).length
  
  // Resolution rate
  const encerrados = tickets.filter(t => t.situacao === "Encerrado").length
  const taxaResolucao = tickets.length > 0 ? Math.round((encerrados / tickets.length) * 100) : 0
  
  // Most common category
  const categoryCount: Record<string, number> = {}
  tickets.forEach(t => {
    categoryCount[t.categoria] = (categoryCount[t.categoria] || 0) + 1
  })
  const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]
  const categoriaMaisRecorrente = topCategory 
    ? { nome: topCategory[0], percentual: Math.round((topCategory[1] / tickets.length) * 100) }
    : { nome: "-", percentual: 0 }
  
  // Peak hour
  const hourCount: Record<number, number> = {}
  tickets.forEach(t => {
    const hour = t.dataAberturaLocal.getHours()
    hourCount[hour] = (hourCount[hour] || 0) + 1
  })
  const topHour = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0]
  const horaPico = topHour ? parseInt(topHour[0]) : 0
  
  return {
    total: tickets.length,
    hoje,
    semana,
    mes,
    tma,
    taxaSLA,
    tempoMaximo,
    quickWins,
    taxaResolucao,
    categoriaMaisRecorrente,
    horaPico,
    violacoesSLA
  }
}

// Calculate stats per category
export function calculateCategoryStats(tickets: Ticket[]): CategoryStats[] {
  const categories: Record<string, Ticket[]> = {}
  
  tickets.forEach(t => {
    if (!categories[t.categoria]) {
      categories[t.categoria] = []
    }
    categories[t.categoria].push(t)
  })
  
  return Object.entries(categories)
    .map(([nome, categoryTickets]) => {
      const encerrados = categoryTickets.filter(t => t.situacao === "Encerrado").length
      const ticketsWithTime = categoryTickets.filter(t => t.tempoResolucao !== null)
      const times = ticketsWithTime.map(t => t.tempoResolucao as number)
      
      return {
        nome,
        total: categoryTickets.length,
        encerrados,
        taxaResolucao: categoryTickets.length > 0 
          ? Math.round((encerrados / categoryTickets.length) * 100) 
          : 0,
        tma: times.length > 0 
          ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
          : 0,
        piorCaso: times.length > 0 ? Math.max(...times) : 0
      }
    })
    .sort((a, b) => b.total - a.total)
}

// Calculate stats per responsavel
export function calculateResponsavelStats(tickets: Ticket[]): ResponsavelStats[] {
  const map: Record<string, Ticket[]> = {}

  tickets.forEach(t => {
    const nome = t.responsavel || "Não atribuído"
    if (!map[nome]) map[nome] = []
    map[nome].push(t)
  })

  return Object.entries(map)
    .map(([nome, ts]) => {
      const encerrados = ts.filter(t => t.situacao === "Encerrado").length
      const emAtendimento = ts.filter(t => t.situacao === "Em Atendimento").length
      const times = ts.filter(t => t.tempoResolucao !== null).map(t => t.tempoResolucao as number)
      return {
        nome,
        total: ts.length,
        encerrados,
        emAtendimento,
        taxaResolucao: ts.length > 0 ? Math.round((encerrados / ts.length) * 100) : 0,
        tma: times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0
      }
    })
    .sort((a, b) => b.total - a.total)
}

// Get hourly distribution
export function getHourlyDistribution(tickets: Ticket[]): HourlyData[] {
  const hourCount: Record<number, number> = {}
  
  for (let i = 0; i < 24; i++) {
    hourCount[i] = 0
  }
  
  tickets.forEach(t => {
    const hour = t.dataAberturaLocal.getHours()
    hourCount[hour]++
  })
  
  return Object.entries(hourCount)
    .map(([hora, quantidade]) => ({
      hora: parseInt(hora),
      quantidade
    }))
    .sort((a, b) => a.hora - b.hora)
}

// Get daily data for last 30 days
export function getDailyData(tickets: Ticket[], days: number = 30): DailyData[] {
  const now = new Date()
  const brazilNow = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  
  const result: DailyData[] = []
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(brazilNow)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)
    
    const dayTickets = tickets.filter(t => 
      t.dataAberturaLocal >= date && t.dataAberturaLocal < nextDate
    )
    
    const ticketsWithTime = dayTickets.filter(t => t.tempoResolucao !== null)
    const times = ticketsWithTime.map(t => t.tempoResolucao as number)
    const tma = times.length > 0 
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : 0
    
    result.push({
      data: `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`,
      quantidade: dayTickets.length,
      tma
    })
  }
  
  return result
}

// Get time distribution by ranges
export function getTimeDistribution(tickets: Ticket[]): TimeDistribution[] {
  const ranges = [
    { label: "<15min", min: 0, max: 15, dentroSLA: true },
    { label: "15-30min", min: 15, max: 30, dentroSLA: true },
    { label: "30-60min", min: 30, max: 60, dentroSLA: true },
    { label: "1-2h", min: 60, max: 120, dentroSLA: true },
    { label: "2-4h", min: 120, max: 240, dentroSLA: false },
    { label: ">4h", min: 240, max: Infinity, dentroSLA: false }
  ]
  
  const ticketsWithTime = tickets.filter(t => t.tempoResolucao !== null)
  
  return ranges.map(range => ({
    faixa: range.label,
    quantidade: ticketsWithTime.filter(t => {
      const time = t.tempoResolucao as number
      return time >= range.min && time < range.max
    }).length,
    dentroSLA: range.dentroSLA
  }))
}

// Get SLA violations
export function getSLAViolations(tickets: Ticket[]): Ticket[] {
  return tickets
    .filter(t => t.tempoResolucao !== null && t.tempoResolucao > SLA_TARGET)
    .sort((a, b) => (b.tempoResolucao || 0) - (a.tempoResolucao || 0))
}

// Format time for display
export function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
}

// Extract keywords for word cloud
export function extractKeywords(tickets: Ticket[]): { word: string; count: number }[] {
  const wordCount: Record<string, number> = {}
  
  tickets.forEach(t => {
    const words = t.descricao
      .toLowerCase()
      .replace(/[^\wáéíóúàâêôãõç\s]/gi, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1
    })
  })
  
  return Object.entries(wordCount)
    .map(([word, count]) => ({ word, count }))
    .filter(w => w.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)
}

// Get examples per category
export function getCategoryExamples(tickets: Ticket[], limit: number = 3): Record<string, string[]> {
  const examples: Record<string, string[]> = {}
  
  tickets.forEach(t => {
    if (!examples[t.categoria]) {
      examples[t.categoria] = []
    }
    if (examples[t.categoria].length < limit) {
      examples[t.categoria].push(t.descricao)
    }
  })
  
  return examples
}

// Get week comparison data
export function getWeekComparison(tickets: Ticket[]): { current: number; previous: number; delta: number; percentChange: number } {
  const now = new Date()
  const brazilNow = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  
  const startOfCurrentWeek = new Date(brazilNow)
  const dayOfWeek = brazilNow.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  startOfCurrentWeek.setDate(brazilNow.getDate() - diff)
  startOfCurrentWeek.setHours(0, 0, 0, 0)
  
  const startOfPreviousWeek = new Date(startOfCurrentWeek)
  startOfPreviousWeek.setDate(startOfPreviousWeek.getDate() - 7)
  
  const current = tickets.filter(t => t.dataAberturaLocal >= startOfCurrentWeek).length
  const previous = tickets.filter(t => 
    t.dataAberturaLocal >= startOfPreviousWeek && t.dataAberturaLocal < startOfCurrentWeek
  ).length
  
  const delta = current - previous
  const percentChange = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0
  
  return { current, previous, delta, percentChange }
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + "..."
}

// Get SLA status color
export function getSLAColor(value: number, type: "tma" | "taxa"): "green" | "yellow" | "red" {
  if (type === "tma") {
    if (value <= 60) return "green"
    if (value <= 120) return "yellow"
    return "red"
  }
  // taxa
  if (value >= 85) return "green"
  if (value >= 60) return "yellow"
  return "red"
}

// Build AI context from data
export function buildAIContext(tickets: Ticket[], kpis: KPIData, categoryStats: CategoryStats[], hourlyData: HourlyData[]): string {
  const sortedByDate = [...tickets].sort((a, b) => 
    b.dataAberturaLocal.getTime() - a.dataAberturaLocal.getTime()
  )
  
  const dataRange = tickets.length > 0 
    ? `${sortedByDate[sortedByDate.length - 1].dataAberturaLocal.toLocaleDateString("pt-BR")} a ${sortedByDate[0].dataAberturaLocal.toLocaleDateString("pt-BR")}`
    : "N/A"
  
  const categoriesJson = JSON.stringify(categoryStats.reduce((acc, c) => {
    acc[c.nome] = { total: c.total, tma: c.tma, taxaSLA: c.taxaResolucao }
    return acc
  }, {} as Record<string, { total: number; tma: number; taxaSLA: number }>))
  
  const hoursJson = JSON.stringify(hourlyData.reduce((acc, h) => {
    acc[`${h.hora}h`] = h.quantidade
    return acc
  }, {} as Record<string, number>))
  
  const tmaCategoriesJson = JSON.stringify(categoryStats.reduce((acc, c) => {
    acc[c.nome] = c.tma
    return acc
  }, {} as Record<string, number>))
  
  const last15 = sortedByDate.slice(0, 15).map(t => ({
    data: t.dataAberturaLocal.toLocaleDateString("pt-BR"),
    categoria: t.categoria,
    tempo: t.tempoResolucao ? formatTime(t.tempoResolucao) : "N/A",
    descricao: truncateText(t.descricao, 100)
  }))
  
  return `Você é um especialista em análise de suporte de TI e sistemas. 
Analise os dados abaixo e responda em português brasileiro de forma objetiva, 
direta e acionável, com bullet points e destaques em negrito quando relevante.

RESUMO DOS DADOS DO SUPORTE — CrisduLabs
- Total de atendimentos: ${kpis.total}
- Período dos dados: ${dataRange}
- Atendimentos hoje: ${kpis.hoje} | esta semana: ${kpis.semana} | este mês: ${kpis.mes}
- Tempo Médio de Atendimento (TMA): ${kpis.tma} minutos
- Taxa de cumprimento SLA (meta 2h): ${kpis.taxaSLA}%
- Total violações de SLA: ${kpis.violacoesSLA}
- Categoria mais frequente: ${kpis.categoriaMaisRecorrente.nome} (${kpis.categoriaMaisRecorrente.percentual}%)
- Distribuição por categoria: ${categoriesJson}
- Distribuição por hora do dia: ${hoursJson}
- TMA por categoria: ${tmaCategoriesJson}
- Últimos 15 atendimentos: ${JSON.stringify(last15)}`
}
