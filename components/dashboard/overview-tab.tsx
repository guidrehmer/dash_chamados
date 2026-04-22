"use client"

import { useMemo, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts"
import { KPICard } from "./kpi-card"
import { StatusBadge } from "./status-badge"
import type { Ticket, KPIData, HourlyData, DailyData, FilaItem } from "@/lib/support-types"
import { formatTime, getSLAColor } from "@/lib/support-utils"
import { Clock, TrendingUp, AlertTriangle, Zap, BarChart3, Users, Target, Activity, UserX, ShieldAlert, AlertCircle, Inbox, ChevronDown, ChevronUp } from "lucide-react"
import { STATUS_COLORS, CHART_COLOR_PRIMARY, RECENT_TICKETS_LIMIT } from "@/lib/constants"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface AtendimentoDia {
  dataabertura: string
  dataencerrado: string | null
  titulo: string
  descricao: string
  situacao: string
  usuario: string
  grupo: string
  responsavel: string | null
}

async function fetchAtendimentosHoje(): Promise<AtendimentoDia[]> {
  const BASE = "https://sistema.romancemoda.com.br/apex/romance/aisten/atendimentos/"
  const all: AtendimentoDia[] = []
  let offset = 0
  let hasMore = true
  while (hasMore) {
    const url = offset === 0 ? `${BASE}?filtro=HOJE` : `${BASE}?filtro=HOJE&offset=${offset}`
    const res = await fetch(url, { headers: { Accept: "application/json" } })
    const data = await res.json()
    if (data.items) all.push(...data.items)
    hasMore = data.hasMore === true
    offset += 25
    if (offset > 10000) break
  }
  // Filter by opening date (consistent with KPI "Abertos Hoje")
  const hoje = new Date().toLocaleDateString("en-CA") // YYYY-MM-DD local date
  return all.filter(item => item.dataabertura && item.dataabertura.slice(0, 10) === hoje)
}

function ExpandableText({ text, limit = 50 }: { text: string; limit?: number }) {
  if (text.length <= limit) return <span>{text}</span>
  return (
    <span>
      {text.substring(0, limit)}
      <Popover>
        <PopoverTrigger asChild>
          <button className="ml-1 text-primary hover:underline text-xs font-medium whitespace-nowrap">
            ...ver mais
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 text-sm text-slate-700 leading-relaxed">
          {text}
        </PopoverContent>
      </Popover>
    </span>
  )
}

interface OverviewTabProps {
  tickets: Ticket[]
  kpis: KPIData
  hourlyData: HourlyData[]
  dailyData: DailyData[]
  filaCount?: number
  filaItems?: FilaItem[]
  aguardandoCount?: number
}

const chartConfig = {
  quantidade: {
    label: "Quantidade",
    color: CHART_COLOR_PRIMARY
  },
  encerrado: {
    label: "Encerrado",
    color: "#10b981"
  },
  emAtendimento: {
    label: "Em Atendimento",
    color: "#3b82f6"
  },
  aguardando: {
    label: "Aguardando",
    color: "#f59e0b"
  },
  aberto: {
    label: "Aberto",
    color: "#6b7280"
  }
}

export function OverviewTab({ tickets, kpis, hourlyData, dailyData, filaCount = 0, filaItems = [], aguardandoCount = 0 }: OverviewTabProps) {
  const [filaExpanded, setFilaExpanded] = useState(false)
  const [hojeOpen, setHojeOpen] = useState(false)
  const [hojeLoading, setHojeLoading] = useState(false)
  const [hojeData, setHojeData] = useState<AtendimentoDia[]>([])

  const handleHojeClick = useCallback(async () => {
    setHojeOpen(true)
    setHojeLoading(true)
    try {
      const data = await fetchAtendimentosHoje()
      setHojeData(data)
    } finally {
      setHojeLoading(false)
    }
  }, [])

  const peakHour = useMemo(() => {
    return hourlyData.reduce((max, h) => h.quantidade > max.quantidade ? h : max, hourlyData[0])?.hora ?? 0
  }, [hourlyData])

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    tickets.forEach(t => {
      counts[t.situacao] = (counts[t.situacao] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      fill: STATUS_COLORS[name as keyof typeof STATUS_COLORS] || "#6b7280"
    }))
  }, [tickets])

  const recentTickets = useMemo(() => {
    return [...tickets]
      .filter(t => t.dataEncerradoLocal !== null)
      .sort((a, b) => b.dataEncerradoLocal!.getTime() - a.dataEncerradoLocal!.getTime())
      .slice(0, RECENT_TICKETS_LIMIT)
  }, [tickets])

  const hourlyChartData = useMemo(() => {
    return hourlyData.map(h => ({
      ...h,
      fill: h.hora === peakHour ? "#ea580c" : "#1a56db"
    }))
  }, [hourlyData, peakHour])

  return (
    <div className="space-y-6">

      {/* Alerta ao vivo: fila sem responsável */}
      {filaCount > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 overflow-hidden">
          {/* Cabeçalho clicável */}
          <button
            onClick={() => setFilaExpanded(v => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-100/60 transition-colors text-left"
          >
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">
                {filaCount} ticket{filaCount > 1 ? "s" : ""} na fila sem responsável atribuído
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                {filaExpanded ? "Clique para recolher" : "Clique para ver os detalhes"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-red-600 font-medium">Ao vivo</span>
              {filaExpanded
                ? <ChevronUp className="h-4 w-4 text-red-500" />
                : <ChevronDown className="h-4 w-4 text-red-500" />
              }
            </div>
          </button>

          {/* Widget expandido: cards lado a lado */}
          {filaExpanded && (
            <div className="border-t border-red-200 px-4 py-3 bg-white/60">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {filaItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-1 rounded-md border border-red-100 bg-white px-3 py-2.5 shadow-sm"
                  >
                    {item.nr_chamado != null && (
                      <span className="text-xs font-mono font-bold text-red-600">
                        #{item.nr_chamado}
                      </span>
                    )}
                    <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">
                      {item.descricao || <em className="text-slate-400">Sem descrição</em>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Situação atual (backlog ao vivo) */}
      {aguardandoCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <Inbox className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {aguardandoCount} ticket{aguardandoCount > 1 ? "s" : ""} em aberto / em atendimento agora
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Backlog atual — dados atualizados a cada minuto
            </p>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total de Atendimentos"
          value={kpis.total.toLocaleString("pt-BR")}
          icon={<BarChart3 className="h-4 w-4" />}
          status="neutral"
        />
        <div onClick={handleHojeClick} className="cursor-pointer">
          <KPICard
            title="Abertos Hoje"
            value={kpis.hoje}
            icon={<Activity className="h-4 w-4" />}
            status="neutral"
          />
        </div>

        <Dialog open={hojeOpen} onOpenChange={setHojeOpen}>
          <DialogContent
            className="flex flex-col p-0 gap-0"
            style={{ width: "92vw", maxWidth: "920px", height: "85vh", maxHeight: "85vh" }}
          >
            {/* ── Cabeçalho ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b bg-white shrink-0">
              <div>
                <DialogTitle className="text-base font-semibold text-slate-800">
                  Abertos Hoje
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                </p>
              </div>
            </div>

            {hojeLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <div className="h-7 w-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                <p className="text-sm">Carregando atendimentos...</p>
              </div>
            ) : (
              <>
                {/* ── Mini-stats ── */}
                <div className="grid grid-cols-4 divide-x border-b bg-slate-50/70 shrink-0">
                  {[
                    { label: "Total", value: hojeData.length, color: "text-slate-800" },
                    { label: "Encerrados",     value: hojeData.filter(d => d.situacao === "Encerrado").length,       color: "text-emerald-600" },
                    { label: "Em Atendimento", value: hojeData.filter(d => d.situacao === "Em Atendimento").length,  color: "text-blue-600" },
                    { label: "Pendentes",      value: hojeData.filter(d => d.situacao !== "Encerrado" && d.situacao !== "Em Atendimento").length, color: "text-amber-600" },
                  ].map(s => (
                    <div key={s.label} className="flex flex-col items-center py-2.5 px-3">
                      <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{s.label}</span>
                    </div>
                  ))}
                </div>

                {/* ── Lista de cards ── */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                  {hojeData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                      <Activity className="h-8 w-8 text-slate-300" />
                      <p className="text-sm">Nenhum atendimento aberto hoje.</p>
                    </div>
                  ) : hojeData.map((item, i) => {
                    const statusColor = STATUS_COLORS[item.situacao as keyof typeof STATUS_COLORS] ?? "#6b7280"
                    const abertura = new Date(item.dataabertura)
                    const horaAbertura = abertura.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                    const durMin = item.dataencerrado
                      ? Math.round((new Date(item.dataencerrado).getTime() - abertura.getTime()) / 60000)
                      : null
                    return (
                      <div
                        key={i}
                        className="flex gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
                        style={{ borderLeftWidth: 3, borderLeftColor: statusColor }}
                      >
                        {/* Conteúdo principal */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate leading-snug">
                            {item.titulo || item.descricao || "Sem título"}
                          </p>
                          {item.titulo && item.descricao && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                              {item.descricao}
                            </p>
                          )}
                          {/* Tags */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                              {item.grupo}
                            </span>
                            {item.responsavel ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700">
                                {item.responsavel}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-500 italic">
                                Sem responsável
                              </span>
                            )}
                            {item.usuario && (
                              <span className="text-[10px] text-slate-400">via {item.usuario}</span>
                            )}
                          </div>
                        </div>

                        {/* Lado direito: hora + status + duração */}
                        <div className="flex flex-col items-end justify-between shrink-0 gap-1">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ backgroundColor: statusColor + "18", color: statusColor }}
                          >
                            {item.situacao}
                          </span>
                          <div className="text-right">
                            <p className="text-xs font-medium text-slate-600">{horaAbertura}</p>
                            {durMin !== null && (
                              <p className="text-[10px] text-muted-foreground">
                                {durMin < 60
                                  ? `${durMin}min`
                                  : `${Math.floor(durMin / 60)}h${durMin % 60 > 0 ? ` ${durMin % 60}min` : ""}`
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
        <KPICard
          title="Esta Semana"
          value={kpis.semana}
          icon={<TrendingUp className="h-4 w-4" />}
          status="neutral"
        />
        <KPICard
          title="Este Mes"
          value={kpis.mes}
          icon={<Users className="h-4 w-4" />}
          status="neutral"
        />
        <KPICard
          title="Tempo Medio (TMA)"
          value={formatTime(kpis.tma)}
          subtitle="Meta: 120min"
          icon={<Clock className="h-4 w-4" />}
          status={getSLAColor(kpis.tma, "tma")}
        />
        <KPICard
          title="Taxa de SLA"
          value={`${kpis.taxaSLA}%`}
          subtitle="Meta: 85%"
          icon={<Target className="h-4 w-4" />}
          status={getSLAColor(kpis.taxaSLA, "taxa")}
        />
        <KPICard
          title="Violacoes SLA"
          value={kpis.violacoesSLA}
          subtitle="> 120 minutos"
          icon={<AlertTriangle className="h-4 w-4" />}
          status={kpis.violacoesSLA > 10 ? "red" : kpis.violacoesSLA > 5 ? "yellow" : "green"}
        />
        <KPICard
          title="Quick Wins"
          value={`${kpis.quickWins}%`}
          subtitle="< 15 minutos"
          icon={<Zap className="h-4 w-4" />}
          status={kpis.quickWins >= 30 ? "green" : kpis.quickWins >= 15 ? "yellow" : "red"}
        />
        <KPICard
          title="Sem Responsável"
          value={filaCount}
          subtitle="Ao vivo · sem atribuição"
          icon={<UserX className="h-4 w-4" />}
          status={filaCount === 0 ? "green" : filaCount <= 5 ? "yellow" : "red"}
        />
        <KPICard
          title="Casos Críticos"
          value={kpis.criticalTickets}
          subtitle="> 24 horas"
          icon={<ShieldAlert className="h-4 w-4" />}
          status={kpis.criticalTickets === 0 ? "green" : kpis.criticalTickets <= 3 ? "yellow" : "red"}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Atendimentos por Dia (Ultimos 30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="data" 
                  tick={{ fontSize: 11 }} 
                  interval="preserveStartEnd"
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="quantidade" fill="#1a56db" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Distribuicao por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Atendimentos por Hora do Dia 
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (Pico: {peakHour}h)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="hora" 
                tick={{ fontSize: 11 }} 
                tickFormatter={(v) => `${v}h`}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value) => [value, "Atendimentos"]}
              />
              <Bar dataKey="quantidade" radius={[4, 4, 0, 0]}>
                {hourlyChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Recent Tickets Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Ultimos 20 Atendimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Data Abertura</TableHead>
                  <TableHead className="w-[140px]">Data Encerramento</TableHead>
                  <TableHead className="w-[160px]">Categoria</TableHead>
                  <TableHead className="w-[140px]">Responsável</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[100px] text-right">Tempo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTickets.map((ticket, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-sm">
                      {ticket.dataAberturaLocal.toLocaleDateString("pt-BR")}{" "}
                      <span className="text-muted-foreground">
                        {ticket.dataAberturaLocal.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {ticket.dataEncerradoLocal ? (
                        <>
                          {ticket.dataEncerradoLocal.toLocaleDateString("pt-BR")}{" "}
                          <span className="text-muted-foreground">
                            {ticket.dataEncerradoLocal.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{ticket.categoria}</TableCell>
                    <TableCell className="text-sm">{ticket.responsavel || "-"}</TableCell>
                    <TableCell className="text-sm max-w-[300px]">
                      <ExpandableText text={ticket.descricao} limit={40} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.situacao} />
                    </TableCell>
                    <TableCell className="text-sm text-right">
                      {ticket.tempoResolucao !== null ? formatTime(ticket.tempoResolucao) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
