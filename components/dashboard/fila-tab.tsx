"use client"

import React, { useMemo, useState } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Tooltip as ReTooltip,
  PieChart, Pie, Legend, ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPICard } from "@/components/dashboard/kpi-card"
import type { AguardandoItem } from "@/lib/support-types"
import {
  Users, AlertTriangle, Clock,
  ArrowUpDown, ArrowDown, ArrowUp, RefreshCw,
  ChevronDown, ChevronRight,
} from "lucide-react"
import { FILA_USER_OK, FILA_USER_WARNING, FILA_DONUT_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { categorizeTicket, getSLATargetByPrioridade } from "@/lib/support-utils"

// ─── Types ────────────────────────────────────────────────────────────────────
export type NivelCarga = "ok" | "alerta" | "critico"

export interface UserFilaStats {
  nome: string
  total: number
  percentual: number
  idadeMediaHoras: number
  idadeMaximaHoras: number
  nivel: NivelCarga
  tickets: AguardandoItem[]
}

type SortKey = "total" | "nome" | "idadeMedia"
type SortDir = "asc" | "desc"

// ─── Helpers ──────────────────────────────────────────────────────────────────
function nivelDeCarga(total: number): NivelCarga {
  if (total <= FILA_USER_OK)      return "ok"
  if (total <= FILA_USER_WARNING) return "alerta"
  return "critico"
}

const NIVEL_COLORS: Record<NivelCarga, string> = {
  ok:      "#10b981",
  alerta:  "#f59e0b",
  critico: "#ef4444",
}

const NIVEL_LABELS: Record<NivelCarga, string> = {
  ok:      "Normal",
  alerta:  "Atenção",
  critico: "Sobrecarga",
}

function formatHoras(h: number): string {
  if (h < 1)  return `${Math.round(h * 60)}min`
  if (h < 24) return `${h.toFixed(1)}h`
  return `${(h / 24).toFixed(1)}d`
}

/** Custom tooltip para o bar chart */
function BarTooltip({ active, payload }: { active?: boolean; payload?: { payload: UserFilaStats }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs space-y-1">
      <p className="font-semibold text-slate-800">{d.nome}</p>
      <p>Tickets na fila: <strong>{d.total}</strong></p>
      <p>Espera média: <strong>{formatHoras(d.idadeMediaHoras)}</strong></p>
      <p>Ticket mais antigo: <strong>{formatHoras(d.idadeMaximaHoras)}</strong></p>
      <p className="mt-1">
        Status:{" "}
        <span style={{ color: NIVEL_COLORS[d.nivel] }} className="font-semibold">
          {NIVEL_LABELS[d.nivel]}
        </span>
      </p>
    </div>
  )
}

/** Custom tooltip para o donut */
function DonutTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { percentual: number } }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-800">{payload[0].name}</p>
      <p>{payload[0].value} tickets · {payload[0].payload.percentual}%</p>
    </div>
  )
}

// ─── Data transformation ──────────────────────────────────────────────────────
function transformFila(items: AguardandoItem[]): UserFilaStats[] {
  if (!items.length) return []

  const agora = Date.now()
  const map: Record<string, AguardandoItem[]> = {}

  items.forEach(item => {
    // Normalise name: trim, fallback to "Sem atribuição"
    const nome = item.responsavel?.trim() || "Sem atribuição"
    if (!map[nome]) map[nome] = []
    map[nome].push(item)
  })

  const total = items.length

  const stats: UserFilaStats[] = Object.entries(map).map(([nome, ts]) => {
    const idades = ts.map(t => {
      const ms = agora - new Date(t.dataabertura).getTime()
      return ms > 0 ? ms / (1000 * 60 * 60) : 0   // horas, nunca negativo
    })
    const idadeMedia  = idades.reduce((a, b) => a + b, 0) / idades.length
    const idadeMaxima = Math.max(...idades)

    return {
      nome,
      total: ts.length,
      percentual: total > 0 ? Math.round((ts.length / total) * 100) : 0,
      idadeMediaHoras:  Math.round(idadeMedia  * 10) / 10,
      idadeMaximaHoras: Math.round(idadeMaxima * 10) / 10,
      nivel: nivelDeCarga(ts.length),
      tickets: ts,
    }
  })

  // "Sem atribuição" always last; others sorted by total desc
  return stats.sort((a, b) => {
    if (a.nome === "Sem atribuição") return 1
    if (b.nome === "Sem atribuição") return -1
    return b.total - a.total
  })
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface FilaTabProps {
  items: AguardandoItem[]
  isLoading?: boolean
  lastUpdate?: string | null
}

// ─── Component ────────────────────────────────────────────────────────────────
export function FilaTab({ items, isLoading, lastUpdate }: FilaTabProps) {
  const [sortKey, setSortKey]   = useState<SortKey>("total")
  const [sortDir, setSortDir]   = useState<SortDir>("desc")
  const [filterNivel, setFilterNivel] = useState<NivelCarga | "todos">("todos")
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  const toggleUser = (nome: string) =>
    setExpandedUser(prev => prev === nome ? null : nome)

  // ── Derived data ─────────────────────────────────────────────────────────
  const stats = useMemo(() => transformFila(items), [items])

  const sorted = useMemo(() => {
    const filtered = filterNivel === "todos"
      ? stats
      : stats.filter(s => s.nivel === filterNivel)

    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === "total")      cmp = a.total - b.total
      if (sortKey === "nome")       cmp = a.nome.localeCompare(b.nome, "pt-BR")
      if (sortKey === "idadeMedia") cmp = a.idadeMediaHoras - b.idadeMediaHoras
      // "Sem atribuição" always last regardless of sort
      if (a.nome === "Sem atribuição") return 1
      if (b.nome === "Sem atribuição") return -1
      return sortDir === "desc" ? -cmp : cmp
    })
  }, [stats, sortKey, sortDir, filterNivel])

  const maiorCarga = useMemo(() => stats.filter(s => s.nome !== "Sem atribuição")[0], [stats])
  const mediaGeral = useMemo(() => {
    const vals = stats.map(s => s.idadeMediaHoras)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  }, [stats])
  const criticos = useMemo(() => stats.filter(s => s.nivel === "critico").length, [stats])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc")
    else { setSortKey(key); setSortDir("desc") }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 text-slate-400" />
    return sortDir === "desc"
      ? <ArrowDown className="h-3 w-3 text-blue-600" />
      : <ArrowUp   className="h-3 w-3 text-blue-600" />
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm">Carregando fila...</p>
      </div>
    )
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <Users className="h-12 w-12 text-emerald-400" />
        <p className="text-base font-medium text-slate-700">Fila vazia</p>
        <p className="text-sm">Não há chamados aguardando atendimento no momento.</p>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Timestamp ─────────────────────────────────────────────────────── */}
      {lastUpdate && (
        <p className="text-xs text-muted-foreground">
          Dados ao vivo · última atualização: {lastUpdate}
        </p>
      )}

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          title="Total na Fila"
          value={items.length}
          subtitle={`${stats.length} usuário(s) com chamados`}
          icon={<Users className="h-4 w-4" />}
          status="neutral"
        />
        <KPICard
          title="Maior Carga"
          value={maiorCarga ? `${maiorCarga.total} — ${maiorCarga.nome.split(" ")[0]}` : "—"}
          subtitle={maiorCarga ? NIVEL_LABELS[maiorCarga.nivel] : "Nenhum"}
          icon={<AlertTriangle className="h-4 w-4" />}
          status={maiorCarga ? (maiorCarga.nivel === "ok" ? "green" : maiorCarga.nivel === "alerta" ? "yellow" : "red") : "neutral"}
        />
        <KPICard
          title="Espera Média"
          value={formatHoras(mediaGeral)}
          subtitle={`${criticos} usuário(s) em sobrecarga`}
          icon={<Clock className="h-4 w-4" />}
          status={mediaGeral <= 4 ? "green" : mediaGeral <= 24 ? "yellow" : "red"}
        />
      </div>

      {/* ── Charts row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bar chart — carga por usuário (2/3 width) */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Chamados por Usuário
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                Verde ≤{FILA_USER_OK} · Amarelo ≤{FILA_USER_WARNING} · Vermelho &gt;{FILA_USER_WARNING}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(220, stats.length * 44)}>
              <BarChart
                layout="vertical"
                data={stats}
                margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="nome"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  width={130}
                  tickFormatter={v => v.length > 18 ? v.slice(0, 17) + "…" : v}
                />
                <ReTooltip content={<BarTooltip />} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 11, fill: "#64748b" }}>
                  {stats.map((s, i) => (
                    <Cell key={i} fill={NIVEL_COLORS[s.nivel]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Donut — distribuição percentual (1/3 width) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Distribuição %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={stats}
                  dataKey="total"
                  nameKey="nome"
                  cx="50%"
                  cy="45%"
                  innerRadius="45%"
                  outerRadius="70%"
                  paddingAngle={2}
                >
                  {stats.map((_, i) => (
                    <Cell
                      key={i}
                      fill={FILA_DONUT_COLORS[i % FILA_DONUT_COLORS.length]}
                      stroke="white"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <ReTooltip content={<DonutTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) =>
                    value.length > 16 ? value.slice(0, 15) + "…" : value
                  }
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Detail table ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-medium">
              Detalhe por Usuário
            </CardTitle>
            {/* Filter by nivel */}
            <div className="flex items-center gap-1.5">
              {(["todos", "ok", "alerta", "critico"] as const).map(n => (
                <button
                  key={n}
                  onClick={() => setFilterNivel(n)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                    filterNivel === n
                      ? n === "todos"
                        ? "bg-slate-800 text-white border-slate-800"
                        : `text-white border-transparent`
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  )}
                  style={
                    filterNivel === n && n !== "todos"
                      ? { backgroundColor: NIVEL_COLORS[n], borderColor: NIVEL_COLORS[n] }
                      : undefined
                  }
                >
                  {n === "todos" ? "Todos" : NIVEL_LABELS[n]}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="w-8 px-2 py-2.5" />
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600">
                    <button
                      onClick={() => toggleSort("nome")}
                      className="flex items-center gap-1.5 hover:text-slate-900"
                    >
                      Usuário <SortIcon k="nome" />
                    </button>
                  </th>
                  <th className="text-center px-4 py-2.5 font-medium text-slate-600">
                    <button
                      onClick={() => toggleSort("total")}
                      className="flex items-center gap-1.5 hover:text-slate-900 mx-auto"
                    >
                      Chamados <SortIcon k="total" />
                    </button>
                  </th>
                  <th className="text-center px-4 py-2.5 font-medium text-slate-600">% Fila</th>
                  <th className="text-center px-4 py-2.5 font-medium text-slate-600">
                    <button
                      onClick={() => toggleSort("idadeMedia")}
                      className="flex items-center gap-1.5 hover:text-slate-900 mx-auto"
                    >
                      Espera Média <SortIcon k="idadeMedia" />
                    </button>
                  </th>
                  <th className="text-center px-4 py-2.5 font-medium text-slate-600">Mais Antigo</th>
                  <th className="text-center px-4 py-2.5 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                      Nenhum usuário encontrado para este filtro.
                    </td>
                  </tr>
                ) : sorted.map((s, i) => {
                  const isExpanded = expandedUser === s.nome
                  const agora = Date.now()
                  return (
                    <React.Fragment key={s.nome}>
                      {/* ── Linha do usuário ── */}
                      <tr
                        onClick={() => toggleUser(s.nome)}
                        className={cn(
                          "border-b border-slate-50 transition-colors cursor-pointer select-none",
                          i % 2 === 0 ? "bg-white" : "bg-slate-50/40",
                          s.nivel === "critico" && "bg-red-50/40",
                          isExpanded ? "bg-blue-50/60 border-blue-100" : "hover:bg-blue-50/40"
                        )}
                      >
                        {/* Chevron */}
                        <td className="px-2 py-3 text-slate-400">
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 text-blue-500" />
                            : <ChevronRight className="h-4 w-4" />
                          }
                        </td>

                        {/* Nome */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: NIVEL_COLORS[s.nivel] }}
                            />
                            <span className={cn(
                              "font-medium",
                              s.nome === "Sem atribuição" ? "text-slate-400 italic" : "text-slate-800"
                            )}>
                              {s.nome}
                            </span>
                          </div>
                        </td>

                        {/* Total */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-semibold text-slate-800">{s.total}</span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${s.percentual}%`,
                                  backgroundColor: NIVEL_COLORS[s.nivel],
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* % */}
                        <td className="px-4 py-3 text-center text-slate-600">{s.percentual}%</td>

                        {/* Espera média */}
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            "font-medium",
                            s.idadeMediaHoras <= 4  ? "text-emerald-600" :
                            s.idadeMediaHoras <= 24 ? "text-amber-600"   : "text-red-600"
                          )}>
                            {formatHoras(s.idadeMediaHoras)}
                          </span>
                        </td>

                        {/* Ticket mais antigo */}
                        <td className="px-4 py-3 text-center text-slate-500 text-xs">
                          {formatHoras(s.idadeMaximaHoras)}
                        </td>

                        {/* Status badge */}
                        <td className="px-4 py-3 text-center">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: NIVEL_COLORS[s.nivel] + "20",
                              color: NIVEL_COLORS[s.nivel],
                            }}
                          >
                            {NIVEL_LABELS[s.nivel]}
                          </span>
                        </td>
                      </tr>

                      {/* ── Expand: chamados do usuário ── */}
                      {isExpanded && (
                        <tr key={`${s.nome}-detail`} className="bg-blue-50/30">
                          <td colSpan={7} className="px-6 py-0">
                            <div className="py-3 border-l-2 border-blue-200 pl-4">
                              <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">
                                {s.total} chamado{s.total !== 1 ? "s" : ""} em fila — {s.nome}
                              </p>
                              <div className="overflow-x-auto rounded-lg border border-blue-100">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-blue-50 border-b border-blue-100 text-slate-500 font-medium">
                                      <th className="text-center px-3 py-2 w-20">Nº</th>
                                      <th className="text-left px-3 py-2">Descrição</th>
                                      <th className="text-center px-3 py-2 w-28">Grupo</th>
                                      <th className="text-center px-3 py-2 w-36">Situação</th>
                                      <th className="text-center px-3 py-2 w-24">Idade</th>
                                      <th className="text-center px-3 py-2 w-32">Risco SLA</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {[...s.tickets]
                                      .sort((a, b) =>
                                        new Date(a.dataabertura).getTime() - new Date(b.dataabertura).getTime()
                                      )
                                      .map((t, ti) => {
                                        const ms = agora - new Date(t.dataabertura).getTime()
                                        const horas = ms > 0 ? ms / (1000 * 60 * 60) : 0
                                        const idadeColor =
                                          horas <= 4  ? "text-emerald-600" :
                                          horas <= 24 ? "text-amber-600"   : "text-red-600"
                                        const cat = categorizeTicket(t.descricao || "")
                                        const slaTarget = getSLATargetByPrioridade(cat) // minutos
                                        const minutosAberto = horas * 60
                                        const slaPct = Math.min(100, (minutosAberto / slaTarget) * 100)
                                        const slaColor =
                                          slaPct < 50  ? "#10b981" :
                                          slaPct < 80  ? "#f59e0b" : "#ef4444"
                                        return (
                                          <tr
                                            key={ti}
                                            className={cn(
                                              "border-b border-blue-50 last:border-0",
                                              ti % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                                            )}
                                          >
                                            <td className="px-3 py-2 text-center">
                                              {t.nr_chamado != null
                                                ? <span className="font-mono font-semibold text-blue-700">#{t.nr_chamado}</span>
                                                : <span className="text-slate-300">—</span>
                                              }
                                            </td>
                                            <td className="px-3 py-2 text-slate-700 max-w-xs">
                                              <span className="line-clamp-2 leading-relaxed">
                                                {t.descricao || <em className="text-slate-400">Sem descrição</em>}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                                                {t.grupo}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2 text-center text-slate-500">
                                              {t.situacao}
                                            </td>
                                            <td className={cn("px-3 py-2 text-center font-semibold", idadeColor)}>
                                              {formatHoras(Math.round(horas * 10) / 10)}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              <div className="flex flex-col items-center gap-0.5">
                                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                  <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{ width: `${slaPct}%`, backgroundColor: slaColor }}
                                                  />
                                                </div>
                                                <span className="text-[10px]" style={{ color: slaColor }}>
                                                  {slaPct.toFixed(0)}%
                                                </span>
                                              </div>
                                            </td>
                                          </tr>
                                        )
                                      })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground px-1">
        {(["ok", "alerta", "critico"] as NivelCarga[]).map(n => (
          <span key={n} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: NIVEL_COLORS[n] }} />
            {NIVEL_LABELS[n]}: {n === "ok" ? `≤${FILA_USER_OK}` : n === "alerta" ? `≤${FILA_USER_WARNING}` : `>${FILA_USER_WARNING}`} tickets
          </span>
        ))}
        <span className="ml-auto">Atualizado a cada 60s</span>
      </div>
    </div>
  )
}
