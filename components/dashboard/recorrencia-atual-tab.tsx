"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  TrendingUp, AlertTriangle, Lightbulb, RefreshCw,
  ChevronDown, ChevronRight, Users, Tag, CheckCircle2,
  AlertCircle, Clock,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Classificacao {
  titulo: string
  usuario: string
  grupo: string
  categoria: string
  motivo: string
}

interface Resumo {
  total: number
  por_categoria: Record<string, number>
  por_grupo: Record<string, number>
}

interface Insight {
  categoria: string
  frequencia: number
  problema_raiz: string
  acoes: string[]
  impacto: "alto" | "medio" | "baixo"
}

interface AnalysisResult {
  classificacoes: Classificacao[]
  resumo: Resumo
  insights: Insight[]
  gerado_em?: string
  error?: string
  raw?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CATEGORIA_COLORS: Record<string, string> = {
  "Acesso/Permissão":   "#3b82f6",
  "Fiscal/Remessa":     "#f59e0b",
  "Auditoria":          "#8b5cf6",
  "Infra/Equipamento":  "#ef4444",
  "App/Sistema":        "#ec4899",
  "Cadastro":           "#10b981",
  "Outro":              "#94a3b8",
}

const IMPACTO_STYLE: Record<string, { label: string; className: string }> = {
  alto:  { label: "Alto",  className: "bg-red-100 text-red-700 border-red-200" },
  medio: { label: "Médio", className: "bg-amber-100 text-amber-700 border-amber-200" },
  baixo: { label: "Baixo", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
}

function colorFor(cat: string) {
  return CATEGORIA_COLORS[cat] ?? "#64748b"
}

// ─── Component ────────────────────────────────────────────────────────────────
export function RecorrenciaAtualTab() {
  const [result, setResult]     = useState<AnalysisResult | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const toggleExpand = (cat: string) =>
    setExpanded(prev => prev === cat ? null : cat)

  const runAnalysis = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/recorrentes")
      const data: AnalysisResult = await res.json()
      if (!res.ok || data.error) {
        setError(data.error ?? `Erro ${res.status}`)
        if (data.raw) setResult({ classificacoes: [], resumo: { total: 0, por_categoria: {}, por_grupo: {} }, insights: [], raw: data.raw })
      } else {
        setResult(data)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [])

  const categorias = result ? Object.entries(result.resumo.por_categoria).sort((a, b) => b[1] - a[1]) : []
  const grupos     = result ? Object.entries(result.resumo.por_grupo).sort((a, b) => b[1] - a[1]) : []
  const maxCat     = categorias[0]?.[1] ?? 1

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Recorrência Atual
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Análise IA dos chamados do dia anterior · classificação e insights de redução
          </p>
        </div>
        <Button onClick={runAnalysis} disabled={loading} className="gap-2 shrink-0">
          {loading
            ? <RefreshCw className="h-4 w-4 animate-spin" />
            : <TrendingUp className="h-4 w-4" />
          }
          {loading ? "Analisando..." : result ? "Reanalisar" : "Analisar Chamados"}
        </Button>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Erro na análise</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {!result && !loading && !error && (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <TrendingUp className="h-12 w-12 text-slate-300" />
            <p className="text-base font-medium text-slate-600">Nenhuma análise executada</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Clique em <strong>Analisar Chamados</strong> para buscar os chamados do dia anterior
              e classificá-los com IA.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Loading skeleton ───────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-slate-100 rounded-xl" />
            ))}
          </div>
          <div className="h-48 bg-slate-100 rounded-xl" />
          <div className="h-64 bg-slate-100 rounded-xl" />
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {result && !loading && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-blue-50">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">Total de chamados</p>
                <p className="text-3xl font-bold text-blue-800">{result.resumo.total}</p>
              </CardContent>
            </Card>
            <Card className="bg-purple-50">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-purple-700 uppercase tracking-wide mb-1">Categorias</p>
                <p className="text-3xl font-bold text-purple-800">{categorias.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-1">Grupos envolvidos</p>
                <p className="text-3xl font-bold text-amber-800">{grupos.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide mb-1">Insights gerados</p>
                <p className="text-3xl font-bold text-emerald-800">{result.insights.length}</p>
                {result.gerado_em && (
                  <p className="text-[10px] text-emerald-600 mt-1">
                    {new Date(result.gerado_em).toLocaleString("pt-BR")}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Category breakdown + group */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Category bars — 2/3 */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Chamados por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categorias.map(([cat, qtd]) => (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">{cat}</span>
                      <span className="text-sm font-semibold" style={{ color: colorFor(cat) }}>
                        {qtd} ({result.resumo.total > 0 ? Math.round((qtd / result.resumo.total) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(qtd / maxCat) * 100}%`, backgroundColor: colorFor(cat) }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Group breakdown — 1/3 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Por Grupo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {grupos.map(([grupo, qtd]) => (
                  <div key={grupo} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-sm text-slate-700 font-medium">{grupo}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                      {qtd}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Insights */}
          {result.insights.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Insights de Redução
              </h3>
              <div className="space-y-3">
                {result.insights.map((ins) => {
                  const isOpen = expanded === ins.categoria
                  const imp = IMPACTO_STYLE[ins.impacto] ?? IMPACTO_STYLE.medio
                  return (
                    <Card key={ins.categoria} className="overflow-hidden">
                      <button
                        onClick={() => toggleExpand(ins.categoria)}
                        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/60 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: colorFor(ins.categoria) }}
                          />
                          <span className="font-medium text-slate-800 truncate">{ins.categoria}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {ins.frequencia} chamado{ins.frequencia !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", imp.className)}>
                            {imp.label}
                          </span>
                          {isOpen
                            ? <ChevronDown className="h-4 w-4 text-slate-400" />
                            : <ChevronRight className="h-4 w-4 text-slate-400" />
                          }
                        </div>
                      </button>
                      {isOpen && (
                        <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/40 space-y-4">
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                              Causa Raiz
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed">{ins.problema_raiz}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                              Ações Recomendadas
                            </p>
                            <ul className="space-y-1.5">
                              {ins.acoes.map((acao, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                  {acao}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Classificação detalhada */}
          {result.classificacoes.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Classificação Detalhada
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    ({result.classificacoes.length} chamados)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium text-slate-500 uppercase tracking-wide">
                        <th className="text-left px-4 py-2.5">Chamado</th>
                        <th className="text-left px-4 py-2.5 w-36">Categoria</th>
                        <th className="text-left px-4 py-2.5 w-28">Grupo</th>
                        <th className="text-left px-4 py-2.5 w-32">Usuário</th>
                        <th className="text-left px-4 py-2.5">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.classificacoes.map((c, i) => (
                        <tr
                          key={i}
                          className={cn(
                            "border-b border-slate-50 last:border-0",
                            i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                          )}
                        >
                          <td className="px-4 py-2.5 text-slate-800 font-medium max-w-xs">
                            <span className="line-clamp-2">{c.titulo || "—"}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                              style={{ backgroundColor: colorFor(c.categoria) }}
                            >
                              {c.categoria}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 text-xs">{c.grupo || "—"}</td>
                          <td className="px-4 py-2.5 text-slate-600 text-xs">{c.usuario || "—"}</td>
                          <td className="px-4 py-2.5 text-slate-500 text-xs max-w-xs">
                            <span className="line-clamp-2">{c.motivo || "—"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Raw fallback */}
          {result.raw && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Resposta bruta da IA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs text-slate-600 bg-slate-50 rounded-lg p-4 overflow-auto max-h-96 whitespace-pre-wrap">
                  {result.raw}
                </pre>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
