"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ComposedChart, Line, Tooltip, Legend, ResponsiveContainer } from "recharts"
import type { Ticket, CategoryStats, PeriodFilter } from "@/lib/support-types"
import { formatTime, getWeekComparison, calculateResponsavelStats, getLast20WeeksComparison, filterByPeriod, calculateCategoryStats } from "@/lib/support-utils"
import { TrendingUp, TrendingDown, Minus, Award, Clock, AlertCircle, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { CHART_COLORS_BLUE, CHART_COLOR_PRIMARY, CATEGORY_CHART_LIMIT } from "@/lib/constants"

interface RankingTabProps {
  tickets: Ticket[]
  categoryStats: CategoryStats[]
}

const chartConfig = {
  total: {
    label: "Total",
    color: CHART_COLOR_PRIMARY
  }
}

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  hoje: "Hoje",
  semana: "Semana",
  mes: "Mês",
  todos: "Todos",
  personalizado: "Custom",
}

export function RankingTab({ tickets, categoryStats }: RankingTabProps) {
  const [period, setPeriod] = useState<PeriodFilter>("todos")

  const weekComparison = useMemo(() => getWeekComparison(tickets), [tickets])

  // Filtered tickets + derived category stats for the selected period
  const filteredTickets = useMemo(
    () => period === "todos" ? tickets : filterByPeriod(tickets, period),
    [tickets, period]
  )
  const filteredCategoryStats = useMemo(
    () => period === "todos" ? categoryStats : calculateCategoryStats(filteredTickets),
    [filteredTickets, categoryStats, period]
  )

  const chartData = useMemo(() => {
    return filteredCategoryStats.slice(0, CATEGORY_CHART_LIMIT).map((cat, index) => ({
      nome: cat.nome,
      total: cat.total,
      fill: CHART_COLORS_BLUE[index % CHART_COLORS_BLUE.length]
    }))
  }, [filteredCategoryStats])

  const bestTMA = useMemo(() => {
    const withTMA = filteredCategoryStats.filter(c => c.tma > 0)
    return withTMA.length > 0
      ? withTMA.reduce((min, c) => c.tma < min.tma ? c : min, withTMA[0])
      : null
  }, [filteredCategoryStats])

  const worstTMA = useMemo(() => {
    return filteredCategoryStats.length > 0
      ? filteredCategoryStats.reduce((max, c) => c.tma > max.tma ? c : max, filteredCategoryStats[0])
      : null
  }, [filteredCategoryStats])

  const top5 = useMemo(() => filteredCategoryStats.slice(0, 5), [filteredCategoryStats])

  const responsavelStats = useMemo(() => calculateResponsavelStats(tickets), [tickets])
  const weeklyData = useMemo(() => getLast20WeeksComparison(tickets), [tickets])

  return (
    <div className="space-y-6">

      {/* Period filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-muted-foreground mr-1">Período:</span>
        {(["hoje", "semana", "mes", "todos"] as PeriodFilter[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              period === p
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Week Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Semana Atual</p>
            <p className="text-2xl font-semibold">{weekComparison.current}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Semana Anterior</p>
            <p className="text-2xl font-semibold">{weekComparison.previous}</p>
          </CardContent>
        </Card>
        <Card className={cn(
          weekComparison.delta > 0 ? "bg-red-50" : weekComparison.delta < 0 ? "bg-emerald-50" : "bg-slate-50"
        )}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Variacao</p>
            <div className="flex items-center gap-2">
              {weekComparison.delta > 0 ? (
                <TrendingUp className="h-5 w-5 text-red-600" />
              ) : weekComparison.delta < 0 ? (
                <TrendingDown className="h-5 w-5 text-emerald-600" />
              ) : (
                <Minus className="h-5 w-5 text-slate-600" />
              )}
              <span className={cn(
                "text-2xl font-semibold",
                weekComparison.delta > 0 ? "text-red-700" : weekComparison.delta < 0 ? "text-emerald-700" : "text-slate-700"
              )}>
                {weekComparison.delta > 0 ? "+" : ""}{weekComparison.delta}
              </span>
              <span className="text-sm text-muted-foreground">
                ({weekComparison.percentChange > 0 ? "+" : ""}{weekComparison.percentChange}%)
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Categorias</p>
            <p className="text-2xl font-semibold">{filteredCategoryStats.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Best/Worst TMA Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bestTMA && (
          <Card className="bg-emerald-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-emerald-600" />
                <span className="text-xs text-emerald-700 uppercase tracking-wide font-medium">
                  Categoria Mais Rapida
                </span>
              </div>
              <p className="text-lg font-semibold text-emerald-800">{bestTMA.nome}</p>
              <p className="text-sm text-emerald-600">TMA: {formatTime(bestTMA.tma)}</p>
            </CardContent>
          </Card>
        )}
        {worstTMA && (
          <Card className="bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-xs text-red-700 uppercase tracking-wide font-medium">
                  Categoria Mais Lenta
                </span>
              </div>
              <p className="text-lg font-semibold text-red-800">{worstTMA.nome}</p>
              <p className="text-sm text-red-600">TMA: {formatTime(worstTMA.tma)}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Weekly trend — últimas 20 semanas + YoY */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base font-medium">Ranking por Semana</CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-blue-500" />
                Ano atual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-6 h-0.5 bg-orange-400 border-dashed" style={{ borderTop: "2px dashed #fb923c" }} />
                Ano anterior
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={weeklyData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                interval={1}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={28}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                formatter={(value: number, name: string) => [
                  value,
                  name === "anoAtual" ? "Ano atual" : "Ano anterior"
                ]}
                labelFormatter={(label) => `Semana de ${label}`}
              />
              <Bar dataKey="anoAtual" name="anoAtual" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={14} />
              <Line
                dataKey="anoAnterior"
                name="anoAnterior"
                type="monotone"
                stroke="#fb923c"
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={{ r: 3, fill: "#fb923c", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Horizontal Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Ranking por Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <BarChart 
              data={chartData} 
              layout="vertical" 
              margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis 
                type="category" 
                dataKey="nome" 
                tick={{ fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
                width={90}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Top 5 Categories */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Award className="h-4 w-4" />
            Top 5 Categorias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {top5.map((cat, index) => (
              <div key={cat.nome} className="flex items-center gap-3">
                <span className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold",
                  index === 0 ? "bg-yellow-100 text-yellow-800" :
                  index === 1 ? "bg-slate-200 text-slate-700" :
                  index === 2 ? "bg-amber-100 text-amber-800" :
                  "bg-slate-100 text-slate-600"
                )}>
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{cat.nome}</span>
                    <span className="text-sm text-muted-foreground">{cat.total}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(cat.total / top5[0].total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Detalhamento por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Encerrados</TableHead>
                  <TableHead className="text-right">Taxa Resolucao</TableHead>
                  <TableHead className="text-right">TMA</TableHead>
                  <TableHead className="text-right">Pior Caso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategoryStats.map((cat) => (
                  <TableRow key={cat.nome}>
                    <TableCell className="font-medium">{cat.nome}</TableCell>
                    <TableCell className="text-right">{cat.total}</TableCell>
                    <TableCell className="text-right">{cat.encerrados}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        cat.taxaResolucao >= 90 ? "bg-emerald-100 text-emerald-800" :
                        cat.taxaResolucao >= 70 ? "bg-amber-100 text-amber-800" :
                        "bg-red-100 text-red-800"
                      )}>
                        {cat.taxaResolucao}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {formatTime(cat.tma)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatTime(cat.piorCaso)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* Atendimentos por Responsável */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Atendimentos por Responsável
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Encerrados</TableHead>
                  <TableHead className="text-right">Em Atendimento</TableHead>
                  <TableHead className="text-right">Taxa Resolução</TableHead>
                  <TableHead className="text-right">TMA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responsavelStats.map((r) => (
                  <TableRow key={r.nome}>
                    <TableCell className="font-medium">{r.nome}</TableCell>
                    <TableCell className="text-right">{r.total}</TableCell>
                    <TableCell className="text-right">{r.encerrados}</TableCell>
                    <TableCell className="text-right">{r.emAtendimento}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        r.taxaResolucao >= 90 ? "bg-emerald-100 text-emerald-800" :
                        r.taxaResolucao >= 70 ? "bg-amber-100 text-amber-800" :
                        "bg-red-100 text-red-800"
                      )}>
                        {r.taxaResolucao}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {r.tma > 0 ? formatTime(r.tma) : "-"}
                      </div>
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
