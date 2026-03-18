"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts"
import type { Ticket, CategoryStats } from "@/lib/support-types"
import { formatTime, getWeekComparison, calculateResponsavelStats } from "@/lib/support-utils"
import { TrendingUp, TrendingDown, Minus, Award, Clock, AlertCircle, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface RankingTabProps {
  tickets: Ticket[]
  categoryStats: CategoryStats[]
}

const chartConfig = {
  total: {
    label: "Total",
    color: "#1a56db"
  }
}

const COLORS = [
  "#1a56db", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe",
  "#1e40af", "#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa"
]

export function RankingTab({ tickets, categoryStats }: RankingTabProps) {
  const weekComparison = useMemo(() => getWeekComparison(tickets), [tickets])
  
  const chartData = useMemo(() => {
    return categoryStats.slice(0, 10).map((cat, index) => ({
      nome: cat.nome,
      total: cat.total,
      fill: COLORS[index % COLORS.length]
    }))
  }, [categoryStats])

  const bestTMA = useMemo(() => {
    const withTMA = categoryStats.filter(c => c.tma > 0)
    return withTMA.length > 0 
      ? withTMA.reduce((min, c) => c.tma < min.tma ? c : min, withTMA[0])
      : null
  }, [categoryStats])

  const worstTMA = useMemo(() => {
    return categoryStats.length > 0 
      ? categoryStats.reduce((max, c) => c.tma > max.tma ? c : max, categoryStats[0])
      : null
  }, [categoryStats])

  const top5 = useMemo(() => categoryStats.slice(0, 5), [categoryStats])

  const responsavelStats = useMemo(() => calculateResponsavelStats(tickets), [tickets])

  return (
    <div className="space-y-6">
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
            <p className="text-2xl font-semibold">{categoryStats.length}</p>
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
                {categoryStats.map((cat) => (
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
