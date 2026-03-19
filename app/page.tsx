"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
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
  calculateKPIs,
  calculateCategoryStats,
  getHourlyDistribution,
  getDailyData,
  getTimeDistribution,
  buildAIContext
} from "@/lib/support-utils"
import { RefreshCw, LayoutDashboard, BarChart3, Repeat, Clock, Bot, LogOut } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(res => res.json())

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [usuario, setUsuario] = useState("")
  const [senha, setSenha] = useState("")
  const [erro, setErro] = useState("")

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (usuario.toUpperCase() === "GUILHERME" && senha === "gui123") {
      localStorage.setItem("crisdulabs_auth", "1")
      onLogin()
    } else {
      setErro("Usuário ou senha incorretos.")
    }
  }

  return (
    <div
      className="min-h-screen flex bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('/wallpaper-login.jpg')" }}
    >
      {/* overlay gradiente — escurece só a direita para destacar o form */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/20 to-black/70" />

      {/* painel direito */}
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
            className="w-full h-12 rounded-xl bg-white text-slate-900 hover:bg-white/90 font-semibold text-sm tracking-wide mt-2"
          >
            Entrar
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
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    setAutenticado(localStorage.getItem("crisdulabs_auth") === "1")
  }, [])

  const { data, error, isLoading, mutate } = useSWR(
    autenticado ? "/api/support" : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  // Process raw tickets
  const allTickets = useMemo<Ticket[]>(() => {
    if (!data?.items || !Array.isArray(data.items)) return []
    return processTickets(data.items as TicketRaw[])
  }, [data?.items])

  // Apply filters
  const filteredTickets = useMemo(() => {
    let tickets = allTickets
    tickets = filterByGroup(tickets, groupFilter)
    tickets = filterByPeriod(tickets, periodFilter)
    return tickets
  }, [allTickets, periodFilter, groupFilter])

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
    if (!data?.timestamp) return null
    const date = new Date(data.timestamp)
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }, [data?.timestamp])

  const handleRefresh = useCallback(() => {
    mutate()
  }, [mutate])

  if (autenticado === null) return null
  if (!autenticado) return <LoginPage onLogin={() => setAutenticado(true)} />

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
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
            <div className="flex items-center gap-3">
              <Select value={groupFilter} onValueChange={(v) => setGroupFilter(v as GroupFilter)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="SISTEMAS">Sistemas</SelectItem>
                  <SelectItem value="CIT">CIT</SelectItem>
                </SelectContent>
              </Select>
              <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="semana">Esta Semana</SelectItem>
                  <SelectItem value="mes">Este Mes</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
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
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="font-medium text-slate-700">
                  {filteredTickets.length.toLocaleString("pt-BR")} atendimentos
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-muted-foreground">
                  Grupo: <strong>{groupFilter === "TODOS" ? "Todos" : groupFilter}</strong>
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-muted-foreground">
                  Periodo: <strong>
                    {periodFilter === "hoje" ? "Hoje" : 
                     periodFilter === "semana" ? "Esta Semana" :
                     periodFilter === "mes" ? "Este Mes" : "Todos"}
                  </strong>
                </span>
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
