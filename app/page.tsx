"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import useSWR from "swr"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { OverviewTab } from "@/components/dashboard/overview-tab"
import { RankingTab } from "@/components/dashboard/ranking-tab"
import { RecurrentTab } from "@/components/dashboard/recurrent-tab"
import { SLATab } from "@/components/dashboard/sla-tab"
import { AITab } from "@/components/dashboard/ai-tab"
import type { TicketRaw, Ticket, PeriodFilter, GroupFilter } from "@/lib/support-types"
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
  buildAIContext
} from "@/lib/support-utils"
import { RefreshCw, LayoutDashboard, BarChart3, Repeat, Clock, Bot, LogOut, Download, Loader2 } from "lucide-react"

const BASE_API = "https://sistema.romancemoda.com.br/apex/romance/company/suporte/"

async function fetchAllTickets(): Promise<{ items: TicketRaw[] }> {
  const allItems: TicketRaw[] = []
  let offset = 0
  let hasMore = true

  while (hasMore && offset <= 10000) {
    const url = offset === 0 ? BASE_API : `${BASE_API}?offset=${offset}`
    const res = await fetch(url, { headers: { Accept: "application/json" } })
    if (!res.ok) throw new Error(`Erro ${res.status}`)
    const data = await res.json()
    if (data.items) allItems.push(...data.items)
    hasMore = data.hasMore === true
    offset += 25
  }

  return { items: allItems }
}

const fetcher = () => fetchAllTickets()

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

export default function DashboardPage() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("todos")
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("TODOS")
  const [responsavelFilter, setResponsavelFilter] = useState<string>("TODOS")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    setAutenticado(localStorage.getItem("crisdulabs_auth") === "1")
  }, [])

  const { data, error, isLoading, mutate } = useSWR(
    autenticado ? "support-tickets" : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  // Progressive background loading
  const [accumulatedItems, setAccumulatedItems] = useState<TicketRaw[]>([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const sessionRef = useRef(0) // cancela fetches obsoletos ao atualizar

  useEffect(() => {
    if (!data?.success || !data.items) return

    // Nova carga (inicial ou refresh) — reinicia os itens acumulados
    const sessionId = ++sessionRef.current
    setAccumulatedItems(data.items as TicketRaw[])

    if (!data.hasMore || !data.nextOffset) {
      setIsLoadingMore(false)
      return
    }

    // Inicia busca em background para os lotes restantes
    setIsLoadingMore(true)
    let offset: number = data.nextOffset

    const fetchMore = async () => {
      while (true) {
        if (sessionRef.current !== sessionId) break // refresh chamado, para
        try {
          const res = await fetch(`/api/support?offset=${offset}`)
          const batch = await res.json()
          if (sessionRef.current !== sessionId) break
          if (batch.success && batch.items?.length > 0) {
            setAccumulatedItems(prev => [...prev, ...(batch.items as TicketRaw[])])
          }
          if (batch.hasMore && batch.nextOffset) {
            offset = batch.nextOffset
          } else {
            break
          }
        } catch {
          break
        }
      }
      if (sessionRef.current === sessionId) setIsLoadingMore(false)
    }

    fetchMore()
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  // Process raw tickets
  const allTickets = useMemo<Ticket[]>(() => {
    if (!accumulatedItems.length) return []
    return processTickets(accumulatedItems)
  }, [accumulatedItems])

  // Responsáveis list (from all tickets, unfiltered)
  const responsaveis = useMemo(() => getResponsaveis(allTickets), [allTickets])

  // Apply filters
  const filteredTickets = useMemo(() => {
    let tickets = allTickets
    tickets = filterByGroup(tickets, groupFilter)
    if (responsavelFilter !== "TODOS") {
      tickets = filterByResponsavel(tickets, responsavelFilter)
    }
    if (periodFilter === "personalizado") {
      if (dateFrom && dateTo) {
        tickets = filterByDateRange(tickets, new Date(dateFrom), new Date(dateTo))
      }
    } else {
      tickets = filterByPeriod(tickets, periodFilter)
    }
    return tickets
  }, [allTickets, periodFilter, groupFilter, responsavelFilter, dateFrom, dateTo])

  // Calculate metrics
  const kpis = useMemo(() => calculateKPIs(filteredTickets), [filteredTickets])
  const categoryStats = useMemo(() => calculateCategoryStats(filteredTickets), [filteredTickets])
  const hourlyData = useMemo(() => getHourlyDistribution(filteredTickets), [filteredTickets])
  const dailyData = useMemo(() => getDailyData(filteredTickets, 30), [filteredTickets])
  const timeDistribution = useMemo(() => getTimeDistribution(filteredTickets), [filteredTickets])

  // AI context
  const aiContext = useMemo(() => {
    return buildAIContext(filteredTickets, kpis, categoryStats, hourlyData)
  }, [filteredTickets, kpis, categoryStats, hourlyData])

  // Format timestamp
  const lastUpdate = useMemo(() => {
    if (!data) return null
    return new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }, [data])

  const handleRefresh = useCallback(() => {
    sessionRef.current++ // cancela qualquer fetch em background
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
    // Reset date range when switching away from personalizado
    if (value !== "personalizado") {
      setDateFrom("")
      setDateTo("")
    }
  }

  const periodLabel = useMemo(() => {
    switch (periodFilter) {
      case "hoje": return "Hoje"
      case "semana": return "Esta Semana"
      case "mes": return "Este Mês"
      case "personalizado": return dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : "Personalizado"
      default: return "Todos"
    }
  }, [periodFilter, dateFrom, dateTo])

  if (autenticado === null) return null
  if (!autenticado) return <LoginPage onLogin={() => setAutenticado(true)} />

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-3">
            {/* Row 1: title + controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  Dashboard de Suporte - CrisduLabs
                </h1>
                {lastUpdate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Ultima atualizacao: {lastUpdate}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Grupo */}
                <Select value={groupFilter} onValueChange={(v) => setGroupFilter(v as GroupFilter)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    <SelectItem value="SISTEMAS">Sistemas</SelectItem>
                    <SelectItem value="CIT">CIT</SelectItem>
                  </SelectContent>
                </Select>

                {/* Responsável */}
                <Select value={responsavelFilter} onValueChange={setResponsavelFilter}>
                  <SelectTrigger className="w-[160px]">
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
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hoje">Hoje</SelectItem>
                    <SelectItem value="semana">Esta Semana</SelectItem>
                    <SelectItem value="mes">Este Mês</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                    <SelectItem value="todos">Todos</SelectItem>
                  </SelectContent>
                </Select>

                {/* Export CSV */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExportCSV}
                  disabled={filteredTickets.length === 0}
                  title="Exportar CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>

                {/* Refresh */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  title="Atualizar dados"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>

                {/* Logout */}
                <Button
                  variant="ghost"
                  size="icon"
                  title="Sair"
                  onClick={() => { localStorage.removeItem("crisdulabs_auth"); setAutenticado(false) }}
                >
                  <LogOut className="h-4 w-4 text-slate-500" />
                </Button>
              </div>
            </div>

            {/* Row 2: date range inputs (only when periodFilter === "personalizado") */}
            {periodFilter === "personalizado" && (
              <div className="flex flex-wrap items-center gap-3 pb-1">
                <span className="text-sm text-muted-foreground font-medium">Intervalo:</span>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">De</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="border border-slate-200 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Até</label>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    onChange={e => setDateTo(e.target.value)}
                    className="border border-slate-200 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {(!dateFrom || !dateTo) && (
                  <span className="text-xs text-amber-600">Selecione as duas datas para filtrar</span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Loading State */}
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner className="h-10 w-10 text-primary" />
            <p className="mt-4 text-muted-foreground">Carregando dados...</p>
            <Progress value={33} className="w-64 mt-4" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">Erro ao carregar dados</p>
            <p className="text-red-600 text-sm mt-1">
              {error.message || "Falha na conexao com o servidor"}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={handleRefresh}
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Dashboard Content */}
        {data && !error && (
          <>
            {/* Summary Bar */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-medium text-slate-700 flex items-center gap-2">
                  {filteredTickets.length.toLocaleString("pt-BR")} atendimentos
                  {isLoadingMore && (
                    <span className="flex items-center gap-1 text-xs text-slate-400 font-normal">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      carregando mais...
                    </span>
                  )}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-muted-foreground">
                  Grupo: <strong>{groupFilter === "TODOS" ? "Todos" : groupFilter}</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-muted-foreground">
                  Responsável: <strong>{responsavelFilter === "TODOS" ? "Todos" : responsavelFilter}</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-muted-foreground">
                  Período: <strong>{periodLabel}</strong>
                </span>
                {kpis.semResponsavel > 0 && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span className="text-amber-600 font-medium">
                      ⚠ {kpis.semResponsavel} sem responsável
                    </span>
                  </>
                )}
                {kpis.criticalTickets > 0 && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span className="text-red-600 font-medium">
                      🔴 {kpis.criticalTickets} casos críticos (+24h)
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-white border border-slate-200 p-1">
                <TabsTrigger value="overview" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Visao Geral</span>
                </TabsTrigger>
                <TabsTrigger value="ranking" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Ranking</span>
                </TabsTrigger>
                <TabsTrigger value="recurrent" className="gap-2">
                  <Repeat className="h-4 w-4" />
                  <span className="hidden sm:inline">Recorrentes</span>
                </TabsTrigger>
                <TabsTrigger value="sla" className="gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">SLA</span>
                </TabsTrigger>
                <TabsTrigger value="ai" className="gap-2">
                  <Bot className="h-4 w-4" />
                  <span className="hidden sm:inline">IA</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <OverviewTab
                  tickets={filteredTickets}
                  kpis={kpis}
                  hourlyData={hourlyData}
                  dailyData={dailyData}
                />
              </TabsContent>

              <TabsContent value="ranking" className="mt-6">
                <RankingTab
                  tickets={filteredTickets}
                  categoryStats={categoryStats}
                />
              </TabsContent>

              <TabsContent value="recurrent" className="mt-6">
                <RecurrentTab
                  tickets={filteredTickets}
                  categoryStats={categoryStats}
                />
              </TabsContent>

              <TabsContent value="sla" className="mt-6">
                <SLATab
                  tickets={filteredTickets}
                  kpis={kpis}
                  dailyData={dailyData}
                  timeDistribution={timeDistribution}
                />
              </TabsContent>

              <TabsContent value="ai" className="mt-6">
                <AITab systemPrompt={aiContext} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-muted-foreground">
          Dashboard de Monitoramento de Suporte - CrisduLabs
        </div>
      </footer>
    </div>
  )
}
