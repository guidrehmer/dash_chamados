"use client"

import { useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Cell, ComposedChart, Legend, ReferenceLine } from "recharts"
import { KPICard } from "./kpi-card"
import type { Ticket, KPIData, DailyData, TimeDistribution } from "@/lib/support-types"
import { formatTime, truncateText, getSLAColor, getBacklogColor, getMTTAColor, getSLAViolations } from "@/lib/support-utils"
import { Clock, Target, AlertTriangle, Zap, TrendingUp, Inbox, GitBranch, BarChart2, Timer, ShieldCheck } from "lucide-react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { SLA_TARGET_MINUTES, SLA_RATE_TARGET, CHART_COLOR_PRIMARY, CHART_COLOR_SECONDARY, FCR_TARGET, MTTA_TARGET_MINUTES, PRIORIDADE_COLORS } from "@/lib/constants"

interface SLATabProps {
  tickets: Ticket[]
  kpis: KPIData
  dailyData: DailyData[]
  timeDistribution: TimeDistribution[]
}

const chartConfig = {
  quantidade: {
    label: "Quantidade",
    color: CHART_COLOR_PRIMARY
  },
  tma: {
    label: "TMA (min)",
    color: CHART_COLOR_SECONDARY
  }
}


export function SLATab({ tickets, kpis, dailyData, timeDistribution }: SLATabProps) {
  const violations = useMemo(() => getSLAViolations(tickets), [tickets])
  const violationsParentRef = useRef<HTMLDivElement>(null)
  const violationsVirtualizer = useVirtualizer({
    count: violations.length,
    getScrollElement: () => violationsParentRef.current,
    estimateSize: () => 48,
    overscan: 8,
  })

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
      {/* MTTR + MTTA + SLA + Quick Wins */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="MTTR — Tempo Médio"
          value={formatTime(kpis.tma)}
          subtitle={`Meta ITIL: ${SLA_TARGET_MINUTES}min`}
          icon={<Clock className="h-4 w-4" />}
          status={getSLAColor(kpis.tma, "tma")}
        />
        <KPICard
          title="MTTA — 1ª Interação"
          value={kpis.mtta > 0 ? formatTime(kpis.mtta) : "—"}
          subtitle={`Meta: ${MTTA_TARGET_MINUTES}min · tempo até 1º toque`}
          icon={<Timer className="h-4 w-4" />}
          status={kpis.mtta > 0 ? getMTTAColor(kpis.mtta) : "green"}
        />
        <KPICard
          title="Taxa de SLA"
          value={`${kpis.taxaSLA}%`}
          subtitle={`Meta: ${SLA_RATE_TARGET}%`}
          icon={<Target className="h-4 w-4" />}
          status={getSLAColor(kpis.taxaSLA, "taxa")}
        />
        <KPICard
          title="Quick Wins"
          value={`${kpis.quickWins}%`}
          subtitle="Resolvidos em < 15min"
          icon={<Zap className="h-4 w-4" />}
          status={kpis.quickWins >= 30 ? "green" : kpis.quickWins >= 15 ? "yellow" : "red"}
        />
      </div>

      {/* Backlog + Escalação + Média Diária */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Backlog (ITIL)"
          value={kpis.backlog.toString()}
          subtitle={`${kpis.taxaBacklog}% do total em aberto`}
          icon={<Inbox className="h-4 w-4" />}
          status={getBacklogColor(kpis.backlog)}
        />
        <KPICard
          title="Taxa de Escalação"
          value={`${kpis.taxaEscalacao}%`}
          subtitle="Aguardando Aprovação"
          icon={<GitBranch className="h-4 w-4" />}
          status={kpis.taxaEscalacao <= 5 ? "green" : kpis.taxaEscalacao <= 15 ? "yellow" : "red"}
        />
        <KPICard
          title="Tempo Máximo"
          value={formatTime(kpis.tempoMaximo)}
          subtitle="Pior caso registrado"
          icon={<AlertTriangle className="h-4 w-4" />}
          status={kpis.tempoMaximo > 240 ? "red" : kpis.tempoMaximo > 120 ? "yellow" : "green"}
        />
        <KPICard
          title="Média Diária"
          value={kpis.mediaDiariaTickets.toString()}
          subtitle={`Tickets/dia · FCR meta: ${FCR_TARGET}%`}
          icon={<BarChart2 className="h-4 w-4" />}
          status="green"
        />
      </div>

      {/* SLA por Prioridade */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            SLA por Prioridade Inferida
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {kpis.taxaSLAPrioridade.map(p => (
              <div key={p.prioridade} className="flex items-center gap-3">
                <div className="w-20 shrink-0 flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PRIORIDADE_COLORS[p.prioridade] }}
                  />
                  <span className="text-sm font-medium">{p.prioridade}</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{p.total} tickets · TMA {formatTime(p.tma)} · meta {formatTime(p.slaTarget)}</span>
                    <span className={`font-semibold ${p.taxaSLA >= 85 ? "text-emerald-600" : p.taxaSLA >= 70 ? "text-amber-600" : "text-red-600"}`}>
                      {p.taxaSLA}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${p.taxaSLA}%`,
                        backgroundColor: p.taxaSLA >= 85 ? "#10b981" : p.taxaSLA >= 70 ? "#f59e0b" : "#ef4444"
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Backlog por Idade */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Backlog por Idade (tickets em aberto)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart
              data={[
                { faixa: "< 4h",    quantidade: kpis.backlogPorIdade.menosDe4h,  fill: "#10b981" },
                { faixa: "4h–24h",  quantidade: kpis.backlogPorIdade.de4hA24h,   fill: "#f59e0b" },
                { faixa: "1–3 dias",quantidade: kpis.backlogPorIdade.de1A3dias,  fill: "#f97316" },
                { faixa: "> 3 dias",quantidade: kpis.backlogPorIdade.maisDe3dias,fill: "#ef4444" },
              ]}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="faixa" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="quantidade" radius={[4, 4, 0, 0]}>
                {[
                  "#10b981", "#f59e0b", "#f97316", "#ef4444"
                ].map((color, index) => (
                  <Cell key={index} fill={color} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
          {kpis.backlogPorIdade.maisDe3dias > 0 && (
            <p className="text-xs text-red-600 font-medium mt-2 text-center">
              ⚠ {kpis.backlogPorIdade.maisDe3dias} ticket(s) aguardando há mais de 3 dias
            </p>
          )}
        </CardContent>
      </Card>

      {/* TMA por Dia */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            TMA Médio por Dia
            <span className="text-xs font-normal text-muted-foreground ml-1">linha pontilhada = meta {SLA_TARGET_MINUTES}min</span>
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
              <ReferenceLine y={SLA_TARGET_MINUTES} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5} />
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

      {/* Evolução do Backlog */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Evolução do Backlog (últimos 30 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ backlog: { label: "Backlog", color: "#8b5cf6" } }} className="h-[220px] w-full">
            <LineChart data={dailyTMAData} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="data"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip
                content={<ChartTooltipContent />}
                formatter={(value) => [`${value} tickets`, "Backlog"]}
              />
              <Line
                type="monotone"
                dataKey="backlog"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Tickets abertos acumulados a cada dia (não encerrados)
          </p>
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
              {/* Cabeçalho fixo */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Data Abertura</TableHead>
                    <TableHead className="w-[150px]">Categoria</TableHead>
                    <TableHead className="w-[140px]">Responsável</TableHead>
                    <TableHead className="w-[100px] text-right">Tempo Total</TableHead>
                    <TableHead>Descricao</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
              {/* Corpo com scroll virtual — máx. 480px de altura */}
              <div
                ref={violationsParentRef}
                className="overflow-y-auto border-t"
                style={{ maxHeight: 480 }}
              >
                <div style={{ height: violationsVirtualizer.getTotalSize(), position: "relative" }}>
                  {violationsVirtualizer.getVirtualItems().map(virtualRow => {
                    const ticket = violations[virtualRow.index]
                    const isCritical = ticket.tempoResolucao !== null && ticket.tempoResolucao > 24 * 60
                    return (
                      <div
                        key={virtualRow.key}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: virtualRow.size,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                        className={`flex items-center text-sm border-b ${isCritical ? "bg-red-100/60" : "bg-red-50/50"}`}
                      >
                        <div className="w-[140px] shrink-0 px-4 py-2">
                          {ticket.dataAberturaLocal.toLocaleDateString("pt-BR")}{" "}
                          <span className="text-muted-foreground">
                            {ticket.dataAberturaLocal.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="w-[150px] shrink-0 px-4 font-medium">{ticket.categoria}</div>
                        <div className="w-[140px] shrink-0 px-4 text-muted-foreground">
                          {ticket.responsavel || <span className="text-amber-600">Não atribuído</span>}
                        </div>
                        <div className="w-[100px] shrink-0 px-4 text-right font-semibold text-red-700">
                          {ticket.tempoResolucao !== null ? formatTime(ticket.tempoResolucao) : "-"}
                          {isCritical && (
                            <span className="ml-1 text-xs bg-red-200 text-red-800 rounded px-1">crítico</span>
                          )}
                        </div>
                        <div className="flex-1 px-4 text-muted-foreground truncate" title={ticket.descricao}>
                          {truncateText(ticket.descricao, 100)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-right">
                {violations.length} violações — role para ver mais
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
