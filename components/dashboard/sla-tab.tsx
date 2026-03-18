"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Cell, ComposedChart, Legend } from "recharts"
import { KPICard } from "./kpi-card"
import type { Ticket, KPIData, DailyData, TimeDistribution } from "@/lib/support-types"
import { formatTime, truncateText, getSLAColor, getSLAViolations } from "@/lib/support-utils"
import { Clock, Target, AlertTriangle, Zap, TrendingUp } from "lucide-react"

interface SLATabProps {
  tickets: Ticket[]
  kpis: KPIData
  dailyData: DailyData[]
  timeDistribution: TimeDistribution[]
}

const chartConfig = {
  quantidade: {
    label: "Quantidade",
    color: "#1a56db"
  },
  tma: {
    label: "TMA (min)",
    color: "#f59e0b"
  }
}

export function SLATab({ tickets, kpis, dailyData, timeDistribution }: SLATabProps) {
  const violations = useMemo(() => getSLAViolations(tickets), [tickets])

  const dailyTMAData = useMemo(() => {
    return dailyData.map(d => ({
      ...d,
      tma: d.tma || 0
    }))
  }, [dailyData])

  const distributionWithColors = useMemo(() => {
    return timeDistribution.map(d => ({
      ...d,
      fill: d.dentroSLA ? "#10b981" : "#ef4444"
    }))
  }, [timeDistribution])

  return (
    <div className="space-y-6">
      {/* SLA KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          title="Tempo Maximo"
          value={formatTime(kpis.tempoMaximo)}
          subtitle="Pior caso registrado"
          icon={<AlertTriangle className="h-4 w-4" />}
          status={kpis.tempoMaximo > 240 ? "red" : kpis.tempoMaximo > 120 ? "yellow" : "green"}
        />
        <KPICard
          title="Quick Wins"
          value={`${kpis.quickWins}%`}
          subtitle="Resolvidos em < 15min"
          icon={<Zap className="h-4 w-4" />}
          status={kpis.quickWins >= 30 ? "green" : kpis.quickWins >= 15 ? "yellow" : "red"}
        />
      </div>

      {/* TMA por Dia */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            TMA Medio por Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <LineChart data={dailyTMAData} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="data" 
                tick={{ fontSize: 11 }} 
                interval="preserveStartEnd"
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value) => [`${value} min`, "TMA"]}
              />
              <Line 
                type="monotone" 
                dataKey="tma" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ fill: "#f59e0b", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Time Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Distribuicao por Faixa de Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={distributionWithColors} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="faixa" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="quantidade" radius={[4, 4, 0, 0]}>
                {distributionWithColors.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span>Dentro do SLA</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-red-500" />
              <span>Fora do SLA</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Volume vs TMA */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Volume de Atendimentos vs TMA</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <ComposedChart data={dailyTMAData} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="data" 
                tick={{ fontSize: 11 }} 
                interval="preserveStartEnd"
                tickLine={false}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 11 }} 
                tickLine={false} 
                axisLine={false}
                label={{ value: "Qtd", angle: -90, position: "insideLeft", fontSize: 11 }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }} 
                tickLine={false} 
                axisLine={false}
                label={{ value: "TMA (min)", angle: 90, position: "insideRight", fontSize: 11 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="quantidade" 
                fill="#1a56db" 
                radius={[4, 4, 0, 0]}
                name="Volume"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="tma" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ fill: "#f59e0b", r: 3 }}
                name="TMA"
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* SLA Violations Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            Violacoes de SLA ({violations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {violations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma violacao de SLA encontrada no periodo
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Data Abertura</TableHead>
                    <TableHead className="w-[160px]">Categoria</TableHead>
                    <TableHead className="w-[100px] text-right">Tempo Total</TableHead>
                    <TableHead>Descricao</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {violations.slice(0, 50).map((ticket, index) => (
                    <TableRow key={index} className="bg-red-50/50">
                      <TableCell className="text-sm">
                        {ticket.dataAberturaLocal.toLocaleDateString("pt-BR")}{" "}
                        <span className="text-muted-foreground">
                          {ticket.dataAberturaLocal.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{ticket.categoria}</TableCell>
                      <TableCell className="text-right font-semibold text-red-700">
                        {ticket.tempoResolucao !== null ? formatTime(ticket.tempoResolucao) : "-"}
                      </TableCell>
                      <TableCell 
                        className="text-sm text-muted-foreground max-w-[400px]"
                        title={ticket.descricao}
                      >
                        {truncateText(ticket.descricao, 100)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
