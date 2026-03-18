"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts"
import { KPICard } from "./kpi-card"
import { StatusBadge } from "./status-badge"
import type { Ticket, KPIData, HourlyData, DailyData } from "@/lib/support-types"
import { formatTime, getSLAColor } from "@/lib/support-utils"
import { Clock, TrendingUp, AlertTriangle, Zap, BarChart3, Users, Target, Activity } from "lucide-react"

function ExpandableText({ text, limit = 50 }: { text: string; limit?: number }) {
  const [expanded, setExpanded] = useState(false)
  if (text.length <= limit) return <span>{text}</span>
  return (
    <span>
      {expanded ? text : text.substring(0, limit)}
      <button
        onClick={() => setExpanded(v => !v)}
        className="ml-1 text-primary hover:underline text-xs font-medium whitespace-nowrap"
      >
        {expanded ? "menos" : "...ver mais"}
      </button>
    </span>
  )
}

interface OverviewTabProps {
  tickets: Ticket[]
  kpis: KPIData
  hourlyData: HourlyData[]
  dailyData: DailyData[]
}

const STATUS_COLORS = {
  "Encerrado": "#10b981",
  "Em Atendimento": "#3b82f6",
  "Aguardando Aprovação": "#f59e0b",
  "Aberto": "#6b7280"
}

const chartConfig = {
  quantidade: {
    label: "Quantidade",
    color: "#1a56db"
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

export function OverviewTab({ tickets, kpis, hourlyData, dailyData }: OverviewTabProps) {
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
      .slice(0, 20)
  }, [tickets])

  const hourlyChartData = useMemo(() => {
    return hourlyData.map(h => ({
      ...h,
      fill: h.hora === peakHour ? "#ea580c" : "#1a56db"
    }))
  }, [hourlyData, peakHour])

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total de Atendimentos"
          value={kpis.total.toLocaleString("pt-BR")}
          icon={<BarChart3 className="h-4 w-4" />}
          status="neutral"
        />
        <KPICard
          title="Atendimentos Hoje"
          value={kpis.hoje}
          icon={<Activity className="h-4 w-4" />}
          status="neutral"
        />
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
                formatter={(value, name) => [value, "Atendimentos"]}
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
                    <TableCell 
                      className="text-sm max-w-[300px]"
                      title={ticket.descricao}
                    >
                      <ExpandableText text={ticket.descricao} limit={50} />
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
