"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { Sidebar, NAV_LABELS, type NavSection } from "@/components/layout/sidebar"
import { OverviewTab } from "@/components/dashboard/overview-tab"
import { RankingTab } from "@/components/dashboard/ranking-tab"
import { RecurrentTab } from "@/components/dashboard/recurrent-tab"
import { SLATab } from "@/components/dashboard/sla-tab"
import { AITab } from "@/components/dashboard/ai-tab"
import { AnalysisTab } from "@/components/dashboard/analysis-tab"
import { FilaTab } from "@/components/dashboard/fila-tab"
import type { TicketRaw, Ticket, PeriodFilter, GroupFilter, FilaItem, AguardandoItem } from "@/lib/support-types"
import {
  processTickets,
  filterByPeriod,
  filterByGroup,
  filterByResponsavel,
  filterByDateRange,
  getResponsaveis,
  exportToCSV,
  calculateKPIs,
  calculateCategoryStats,
  getHourlyDistribution,
  getDailyData,
  getTimeDistribution,
  buildAIContext,
} from "@/lib/support-utils"
import {
  RefreshCw,
  LogOut,
  Download,
  Loader2,
  Menu,
  AlertCircle,
  ChevronDown,
} from "lucide-react"
import { FETCH_MAX_RETRIES, FETCH_RETRY_BASE_MS, LIVE_POLL_INTERVAL_MS } from "@/lib/constants"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => fetch(url).then(res => res.json())

// ─── Login page ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [usuario, setUsuario] = useState("")
  const [senha, setSenha] = useState("")
  const [erro, setErro] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro("")
    setLoading(true)
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: usuario.toUpperCase(), senha }),
      })
      const data = await res.json()
      if (data.ok) {
        localStorage.setItem("crisdulabs_auth", "1")
        onLogin()
      } else {
        setErro(data.mensagem || "Usuário ou senha incorretos.")
      }
    } catch {
      setErro("Erro ao conectar com o servidor.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('/wallpaper-login.jpg')" }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/20 to-black/70" />
      <div className="relative z-10 ml-auto flex flex-col justify-center px-16 py-12 w-full max-w-md min-h-screen">
        <div className="mb-8">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-2">Dashboard de Suporte</p>
          <h1 className="text-3xl font-bold text-white">Bem-vindo</h1>
          <p className="text-white/60 text-sm mt-1">Faça login para continuar</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wider block mb-2">
              Usuário
            </label>
            <Input
              value={usuario}
              onChange={e => { setUsuario(e.target.value); setErro("") }}
              placeholder="Digite seu usuário"
              autoFocus
              className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/50 focus:bg-white/15 h-12 rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wider block mb-2">
              Senha
            </label>
            <Input
              type="password"
              value={senha}
              onChange={e => { setSenha(e.target.value); setErro("") }}
              placeholder="Digite sua senha"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/50 focus:bg-white/15 h-12 rounded-xl"
            />
          </div>
          {erro && (
            <p className="text-red-400 text-sm flex items-center gap-2">
              <span>⚠</span> {erro}
            </p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-white text-slate-900 hover:bg-white/90 font-semibold text-sm tracking-wide mt-2 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <p className="text-white/20 text-xs text-center mt-12">
          CrisduLabs © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null)

  // ── Layout state ────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<NavSection>("overview")
  const [collapsed, setCollapsed]         = useState(false)
  const [mobileOpen, setMobileOpen]       = useState(false)

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [periodFilter, setPeriodFilter]           = useState<PeriodFilter>("todos")
  const [groupFilter, setGroupFilter]             = useState<GroupFilter>("TODOS")
  const [responsavelFilter, setResponsavelFilter] = useState<string>("TODOS")
  const [dateFrom, setDateFrom]                   = useState<string>("")
  const [dateTo, setDateTo]                       = useState<string>("")

  // Restore auth + sidebar preference
  useEffect(() => {
    setAutenticado(localStorage.getItem("crisdulabs_auth") === "1")
    const saved = localStorage.getItem("sidebar_collapsed")
    if (saved !== null) setCollapsed(saved === "true")
  }, [])

  const handleToggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem("sidebar_collapsed", String(next))
      return next
    })
  }, [])

  // ── Data: historical tickets ─────────────────────────────────────────────────
  const { data, error, isLoading, mutate } = useSWR(
    autenticado ? "/api/support" : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  // ── Live streams ─────────────────────────────────────────────────────────────
  const { data: filaData } = useSWR<{ items: FilaItem[]; total: number }>(
    autenticado ? "/api/fila" : null,
    fetcher,
    { refreshInterval: LIVE_POLL_INTERVAL_MS, revalidateOnFocus: false }
  )
  const { data: aguardandoData } = useSWR<{ items: AguardandoItem[]; total: number }>(
    autenticado ? "/api/aguardando" : null,
    fetcher,
    { refreshInterval: LIVE_POLL_INTERVAL_MS, revalidateOnFocus: false }
  )
  const filaCount      = filaData?.total     ?? 0
  const aguardandoCount = aguardandoData?.total ?? 0

  // ── Progressive background loading ──────────────────────────────────────────
  const [accumulatedItems, setAccumulatedItems] = useState<TicketRaw[]>([])
  const [isLoadingMore, setIsLoadingMore]       = useState(false)
  const sessionRef = useRef(0)
  const abortRef   = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!data?.items || !Array.isArray(data.items)) return

    const sessionId = ++sessionRef.current
    setAccumulatedItems(data.items as TicketRaw[])

    if (!data.hasMore || !data.nextOffset) {
      setIsLoadingMore(false)
      return
    }

    setIsLoadingMore(true)
    let offset: number = data.nextOffset

    const fetchMore = async () => {
      let retries = 0
      while (true) {
        if (sessionRef.current !== sessionId) break
        const controller = new AbortController()
        abortRef.current = controller
        try {
          const res   = await fetch(`/api/support?offset=${offset}`, { signal: controller.signal })
          if (sessionRef.current !== sessionId) break
          const batch = await res.json()
          retries = 0
          if (batch.items?.length > 0) {
            setAccumulatedItems(prev => [...prev, ...(batch.items as TicketRaw[])])
          }
          if (batch.hasMore && batch.nextOffset) {
            offset = batch.nextOffset
          } else {
            break
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") break
          retries++
          if (retries >= FETCH_MAX_RETRIES) break
          await new Promise(r => setTimeout(r, FETCH_RETRY_BASE_MS * retries))
        }
      }
      if (sessionRef.current === sessionId) setIsLoadingMore(false)
    }

    fetchMore()
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Process & filter ─────────────────────────────────────────────────────────
  const allTickets = useMemo<Ticket[]>(() => {
    if (!accumulatedItems.length) return []
    return processTickets(accumulatedItems)
  }, [accumulatedItems])

  const responsaveis = useMemo(() => getResponsaveis(allTickets), [allTickets])

  const filteredTickets = useMemo(() => {
    let tickets = allTickets
    tickets = filterByGroup(tickets, groupFilter)
    if (responsavelFilter !== "TODOS") tickets = filterByResponsavel(tickets, responsavelFilter)
    if (periodFilter === "personalizado") {
      if (dateFrom && dateTo) tickets = filterByDateRange(tickets, new Date(dateFrom), new Date(dateTo))
    } else {
      tickets = filterByPeriod(tickets, periodFilter)
    }
    return tickets
  }, [allTickets, periodFilter, groupFilter, responsavelFilter, dateFrom, dateTo])

  // ── Metrics ──────────────────────────────────────────────────────────────────
  const kpis             = useMemo(() => calculateKPIs(filteredTickets), [filteredTickets])
  const categoryStats    = useMemo(() => calculateCategoryStats(filteredTickets), [filteredTickets])
  const hourlyData       = useMemo(() => getHourlyDistribution(filteredTickets), [filteredTickets])
  const dailyData        = useMemo(() => getDailyData(filteredTickets, 30), [filteredTickets])
  const timeDistribution = useMemo(() => getTimeDistribution(filteredTickets), [filteredTickets])
  const aiContext        = useMemo(
    () => buildAIContext(filteredTickets, kpis, categoryStats, hourlyData),
    [filteredTickets, kpis, categoryStats, hourlyData]
  )

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const lastUpdate = useMemo(() => {
    if (!data?.timestamp) return null
    return new Date(data.timestamp).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
  }, [data?.timestamp])

  const handleRefresh = useCallback(() => {
    sessionRef.current++
    abortRef.current?.abort()
    setAccumulatedItems([])
    setIsLoadingMore(false)
    mutate()
  }, [mutate])

  const handleExportCSV = useCallback(() => {
    const now = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")
    exportToCSV(filteredTickets, `atendimentos_${now}.csv`)
  }, [filteredTickets])

  const handlePeriodChange = (value: string) => {
    setPeriodFilter(value as PeriodFilter)
    if (value !== "personalizado") { setDateFrom(""); setDateTo("") }
  }

  const periodLabel = useMemo(() => {
    switch (periodFilter) {
      case "hoje":          return "Hoje"
      case "semana":        return "Esta Semana"
      case "mes":           return "Este Mês"
      case "personalizado": return dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : "Personalizado"
      default:              return "Todos"
    }
  }, [periodFilter, dateFrom, dateTo])

  // Sidebar offset classes
  const sidebarOffset = collapsed ? "md:pl-[64px]" : "md:pl-[240px]"

  // ── Guards ────────────────────────────────────────────────────────────────────
  if (autenticado === null) return null
  if (!autenticado)         return <LoginPage onLogin={() => setAutenticado(true)} />

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Sidebar ── */}
      <Sidebar
        active={activeSection}
        onNavigate={setActiveSection}
        collapsed={collapsed}
        onToggle={handleToggleCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        filaCount={filaCount}
      />

      {/* ── Main area (shifts right to accommodate sidebar) ── */}
      <div className={cn("flex flex-col min-h-screen transition-all duration-200", sidebarOffset)}>

        {/* ── Sticky top header ──────────────────────────────────────────────── */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
          <div className="px-4 sm:px-6">

            {/* Row 1: hamburger + title + actions */}
            <div className="flex items-center gap-3 h-16">
              {/* Mobile hamburger */}
              <button
                className="md:hidden p-2 rounded-md text-slate-500 hover:bg-slate-100"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Page title */}
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-semibold text-slate-900 truncate">
                  {NAV_LABELS[activeSection]}
                </h1>
                {lastUpdate && (
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    Atualizado: {lastUpdate}
                    {isLoadingMore && (
                      <span className="ml-2 inline-flex items-center gap-1 text-slate-400">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        carregando mais...
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExportCSV}
                  disabled={filteredTickets.length === 0}
                  title="Exportar CSV"
                  className="h-8 w-8"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  title="Atualizar dados"
                  className="h-8 w-8"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Sair"
                  className="h-8 w-8"
                  onClick={() => { localStorage.removeItem("crisdulabs_auth"); setAutenticado(false) }}
                >
                  <LogOut className="h-3.5 w-3.5 text-slate-500" />
                </Button>
              </div>
            </div>

            {/* Row 2: filters */}
            <div className="flex flex-wrap items-center gap-2 pb-3">
              {/* Grupo */}
              <Select value={groupFilter} onValueChange={(v) => setGroupFilter(v as GroupFilter)}>
                <SelectTrigger className="h-8 w-[110px] text-xs">
                  <SelectValue placeholder="Grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="SISTEMAS">Sistemas</SelectItem>
                  <SelectItem value="CIT">CIT</SelectItem>
                  <SelectItem value="IA">IA</SelectItem>
                </SelectContent>
              </Select>

              {/* Responsável */}
              <Select value={responsavelFilter} onValueChange={setResponsavelFilter}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos responsáveis</SelectItem>
                  {responsaveis.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Período */}
              <Select value={periodFilter} onValueChange={handlePeriodChange}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="semana">Esta Semana</SelectItem>
                  <SelectItem value="mes">Este Mês</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>

              {/* Date range inputs */}
              {periodFilter === "personalizado" && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="border border-slate-200 rounded-md px-2 py-1 text-xs bg-white h-8 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-xs text-muted-foreground">até</span>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    onChange={e => setDateTo(e.target.value)}
                    className="border border-slate-200 rounded-md px-2 py-1 text-xs bg-white h-8 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              {/* Summary pill */}
              <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-slate-700">
                  {filteredTickets.length.toLocaleString("pt-BR")} atendimentos
                </span>
                {kpis.semResponsavel > 0 && (
                  <span className="text-amber-600 font-medium">
                    ⚠ {kpis.semResponsavel} sem resp.
                  </span>
                )}
                {kpis.criticalTickets > 0 && (
                  <span className="text-red-600 font-medium">
                    🔴 {kpis.criticalTickets} críticos
                  </span>
                )}
                {filaCount > 0 && (
                  <span className="flex items-center gap-1 text-red-700 font-semibold animate-pulse">
                    <AlertCircle className="h-3 w-3" />
                    {filaCount} na fila
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ── Main content ───────────────────────────────────────────────────── */}
        <main className="flex-1 px-4 sm:px-6 py-6">

          {/* Loading */}
          {isLoading && !data && (
            <div className="flex flex-col items-center justify-center py-20">
              <Spinner className="h-10 w-10 text-primary" />
              <p className="mt-4 text-muted-foreground">Carregando dados...</p>
              <Progress value={33} className="w-64 mt-4" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-800 font-medium">Erro ao carregar dados</p>
              <p className="text-red-600 text-sm mt-1">
                {error.message || "Falha na conexão com o servidor"}
              </p>
              <Button variant="outline" className="mt-4" onClick={handleRefresh}>
                Tentar novamente
              </Button>
            </div>
          )}

          {/* Fila por Usuário — uses live data, renders independently */}
          {activeSection === "fila" && (
            <FilaTab
              items={aguardandoData?.items ?? []}
              isLoading={!aguardandoData}
              lastUpdate={aguardandoData ? new Date().toLocaleString("pt-BR") : null}
            />
          )}

          {/* Content per section */}
          {activeSection !== "fila" && data && !error && (
            <>
              {activeSection === "overview" && (
                <OverviewTab
                  tickets={filteredTickets}
                  kpis={kpis}
                  hourlyData={hourlyData}
                  dailyData={dailyData}
                  filaCount={filaCount}
                  filaItems={filaData?.items ?? []}
                  aguardandoCount={aguardandoCount}
                />
              )}
              {activeSection === "sla" && (
                <SLATab
                  tickets={filteredTickets}
                  kpis={kpis}
                  dailyData={dailyData}
                  timeDistribution={timeDistribution}
                />
              )}
              {activeSection === "ranking" && (
                <RankingTab
                  tickets={filteredTickets}
                  categoryStats={categoryStats}
                />
              )}
              {activeSection === "recurrent" && (
                <RecurrentTab
                  tickets={filteredTickets}
                  categoryStats={categoryStats}
                />
              )}
              {activeSection === "ai" && (
                <AITab systemPrompt={aiContext} />
              )}
              {activeSection === "analysis" && (
                <AnalysisTab />
              )}
            </>
          )}
        </main>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <footer className="border-t border-slate-200 bg-white py-3 mt-auto">
          <p className="text-center text-xs text-muted-foreground">
            Dashboard de Monitoramento de Suporte · CrisduLabs © {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  )
}
