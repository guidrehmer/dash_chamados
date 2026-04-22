"use client"

import { useState, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import {
  Upload, FileText, AlertCircle, CheckCircle2, RefreshCw,
  TrendingUp, Lightbulb, Target, BarChart3, TriangleAlert, ChevronDown, ChevronUp
} from "lucide-react"
import type { TicketRaw, Ticket } from "@/lib/support-types"
import {
  processTickets,
  calculateKPIs,
  calculateCategoryStats,
  getHourlyDistribution,
  buildAIContext,
  formatTime,
} from "@/lib/support-utils"
import { STATUS_COLORS } from "@/lib/constants"

// ─── CSV Parser ──────────────────────────────────────────────────────────────

/** Remove BOM, acentos e normaliza para lowercase */
function normalizeHeader(h: string): string {
  return h
    .replace(/^\uFEFF/, "") // BOM UTF-8
    .replace(/['"]/g, "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacríticos (acentos)
    .replace(/\s+/g, "") // remove espaços internos
}

/** Detecta o separador do CSV (vírgula ou ponto e vírgula) */
function detectSeparator(firstLine: string): string {
  const commas = (firstLine.match(/,/g) || []).length
  const semicolons = (firstLine.match(/;/g) || []).length
  return semicolons > commas ? ";" : ","
}

function parseCSVLine(line: string, sep: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (char === sep && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

/**
 * Mapeamento flexível de nomes de colunas.
 * Chave = nome normalizado aceito → Valor = campo interno do TicketRaw
 */
const COLUMN_ALIASES: Record<string, string> = {
  // dataabertura
  dataabertura: "dataabertura",
  databertura: "dataabertura",
  datadeabertura: "dataabertura",
  abertura: "dataabertura",
  dataaberto: "dataabertura",
  opened: "dataabertura",
  createdat: "dataabertura",
  datacriacao: "dataabertura",
  // dataencerrado
  dataencerrado: "dataencerrado",
  dataencerramento: "dataencerrado",
  encerrado: "dataencerrado",
  encerramento: "dataencerrado",
  datafechamento: "dataencerrado",
  fechamento: "dataencerrado",
  resolvedat: "dataencerrado",
  closedat: "dataencerrado",
  // descricao
  descricao: "descricao",
  descricao2: "descricao",
  titulo: "descricao",
  title: "descricao",
  description: "descricao",
  assunto: "descricao",
  subject: "descricao",
  chamado: "descricao",
  // situacao
  situacao: "situacao",
  status: "situacao",
  estado: "situacao",
  situacaochamado: "situacao",
  // grupo
  grupo: "grupo",
  setor: "grupo",
  departamento: "grupo",
  area: "grupo",
  team: "grupo",
  group: "grupo",
  // responsavel
  responsavel: "responsavel",
  responsavelchamado: "responsavel",
  atendente: "responsavel",
  assignee: "responsavel",
  agente: "responsavel",
  tecnico: "responsavel",
  agent: "responsavel",
}

const REQUIRED_FIELDS = ["dataabertura", "dataencerrado", "descricao", "situacao", "grupo", "responsavel"]

function parseCSV(text: string): { tickets: TicketRaw[]; errors: string[] } {
  // Remove BOM global se presente
  const cleanText = text.replace(/^\uFEFF/, "")
  const lines = cleanText.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { tickets: [], errors: ["CSV vazio ou sem dados."] }

  const sep = detectSeparator(lines[0])
  const rawHeaders = parseCSVLine(lines[0], sep).map(normalizeHeader)

  // Mapear headers encontrados → campos internos
  const fieldMap: Record<string, number> = {} // campo interno → índice da coluna
  rawHeaders.forEach((h, idx) => {
    const mapped = COLUMN_ALIASES[h]
    if (mapped && !(mapped in fieldMap)) {
      fieldMap[mapped] = idx
    }
  })

  const missing = REQUIRED_FIELDS.filter(f => !(f in fieldMap))
  if (missing.length > 0) {
    const found = rawHeaders.filter(h => h).join(", ")
    return {
      tickets: [],
      errors: [
        `Colunas não reconhecidas. Encontrado: [${found || "nenhuma"}]. ` +
        `Esperado (ou equivalentes): ${missing.join(", ")}.`
      ]
    }
  }

  const tickets: TicketRaw[] = []
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i], sep)
    if (cols.length < 2) continue // linha vazia ou incompleta

    const get = (field: string) => cols[fieldMap[field]]?.trim() ?? ""
    const situacao = get("situacao") as TicketRaw["situacao"]
    const grupo = get("grupo") as TicketRaw["grupo"]

    tickets.push({
      dataabertura: get("dataabertura"),
      dataencerrado: get("dataencerrado") || null,
      descricao: get("descricao"),
      situacao,
      grupo,
      responsavel: get("responsavel") || null,
    })
  }

  return { tickets, errors }
}

// ─── Renderizador de Markdown (reutilizado do ai-tab) ────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function renderMarkdown(text: string): string {
  const safe = escapeHtml(text)
  return safe
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.*$)/gm, "<h3 class='text-base font-semibold mt-4 mb-1 text-slate-800'>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2 class='text-lg font-semibold mt-5 mb-2 text-slate-900'>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1 class='text-xl font-bold mt-5 mb-2 text-slate-900'>$1</h1>")
    .replace(/^- (.*$)/gm, "<li class='ml-4 list-disc text-slate-700'>$1</li>")
    .replace(/^• (.*$)/gm, "<li class='ml-4 list-disc text-slate-700'>$1</li>")
    .replace(/^\d+\. (.*$)/gm, "<li class='ml-4 list-decimal text-slate-700'>$1</li>")
    .replace(/\n\n/g, "</p><p class='mt-3 text-slate-700'>")
    .replace(/\n/g, "<br>")
}

// ─── Prompt de Análise de Processos ──────────────────────────────────────────

function buildAnalysisPrompt(tickets: Ticket[]): { system: string; user: string } {
  const kpis = calculateKPIs(tickets)
  const categoryStats = calculateCategoryStats(tickets)
  const hourlyData = getHourlyDistribution(tickets)
  const context = buildAIContext(tickets, kpis, categoryStats, hourlyData)

  const system = `${context}

Você irá realizar uma análise aprofundada de um conjunto de atendimentos de suporte exportado via CSV.
Seu objetivo é identificar gargalos, padrões problemáticos e propor sugestões concretas de melhoria de processos.
Responda sempre em português brasileiro, de forma estruturada, objetiva e acionável.`

  const user = `Com base nos dados do CSV acima, gere um relatório completo de análise de processos com as seguintes seções:

## 🔴 Problemas Críticos Identificados
Liste os principais problemas que mais impactam a qualidade do atendimento (SLA, TMA, categorias problemáticas, horários críticos).

## 💡 Sugestões de Melhoria por Categoria
Para cada categoria com maior volume ou pior desempenho, sugira ações concretas para otimizar o processo de atendimento.

## 📊 Análise de Capacidade e Distribuição
Com base na distribuição horária e por responsável, identifique desequilíbrios de carga e sugira ajustes de equipe ou horário.

## 🎯 Plano de Ação Priorizado
Liste de 3 a 5 ações prioritárias em ordem de impacto, com critério de priorização explícito.

## 📈 Métricas de Acompanhamento
Sugira indicadores-chave (KPIs) que devem ser monitorados para medir a evolução após as mudanças.`

  return { system, user }
}

// ─── Tipos de estado ──────────────────────────────────────────────────────────

type AnalysisState =
  | { stage: "idle" }
  | { stage: "parsing" }
  | { stage: "preview"; tickets: Ticket[]; warnings: string[]; fileName: string }
  | { stage: "analyzing"; tickets: Ticket[]; warnings: string[]; fileName: string }
  | { stage: "done"; tickets: Ticket[]; warnings: string[]; fileName: string; result: string }
  | { stage: "error"; message: string }

// ─── Componente principal ─────────────────────────────────────────────────────

export function AnalysisTab() {
  const [state, setState] = useState<AnalysisState>({ stage: "idle" })
  const [dragOver, setDragOver] = useState(false)
  const [statsExpanded, setStatsExpanded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      setState({ stage: "error", message: "Apenas arquivos .csv são aceitos." })
      return
    }

    setState({ stage: "parsing" })
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { tickets: raw, errors } = parseCSV(text)
      if (raw.length === 0) {
        setState({ stage: "error", message: errors[0] || "Nenhum atendimento encontrado no CSV." })
        return
      }
      const tickets = processTickets(raw)
      setState({ stage: "preview", tickets, warnings: errors, fileName: file.name })
    }
    reader.onerror = () => setState({ stage: "error", message: "Erro ao ler o arquivo." })
    reader.readAsText(file, "UTF-8")
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ""
  }, [processFile])

  const handleAnalyze = useCallback(async (tickets: Ticket[], warnings: string[], fileName: string) => {
    setState({ stage: "analyzing", tickets, warnings, fileName })

    const { system, user } = buildAnalysisPrompt(tickets)

    try {
      const res = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt: system, userMessage: user, maxTokens: 3000 }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Erro na análise")
      setState({ stage: "done", tickets, warnings, fileName, result: data.content })
    } catch (err) {
      setState({ stage: "error", message: err instanceof Error ? err.message : "Erro ao analisar." })
    }
  }, [])

  const reset = useCallback(() => {
    setState({ stage: "idle" })
    setStatsExpanded(false)
  }, [])

  // ── Preview stats ────────────────────────────────────────────────────────────
  function PreviewStats({ tickets }: { tickets: Ticket[] }) {
    const kpis = calculateKPIs(tickets)
    const categoryStats = calculateCategoryStats(tickets)
    const sorted = [...tickets].sort((a, b) => a.dataAberturaLocal.getTime() - b.dataAberturaLocal.getTime())
    const from = sorted[0]?.dataAberturaLocal.toLocaleDateString("pt-BR") ?? "-"
    const to = sorted[sorted.length - 1]?.dataAberturaLocal.toLocaleDateString("pt-BR") ?? "-"

    const statusCount: Record<string, number> = {}
    tickets.forEach(t => { statusCount[t.situacao] = (statusCount[t.situacao] || 0) + 1 })

    return (
      <div className="space-y-4">
        {/* Números principais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Atendimentos", value: tickets.length.toLocaleString("pt-BR"), color: "text-slate-800" },
            { label: "TMA Médio", value: formatTime(kpis.tma), color: "text-amber-600" },
            { label: "Taxa SLA", value: `${kpis.taxaSLA}%`, color: kpis.taxaSLA >= 85 ? "text-emerald-600" : "text-red-600" },
            { label: "Violações SLA", value: kpis.violacoesSLA.toLocaleString("pt-BR"), color: "text-red-600" },
          ].map(item => (
            <div key={item.label} className="bg-slate-50 rounded-lg p-3 text-center">
              <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Período */}
        <p className="text-xs text-muted-foreground text-center">
          Período: <strong>{from}</strong> → <strong>{to}</strong>
        </p>

        {/* Expandir detalhes */}
        <button
          onClick={() => setStatsExpanded(v => !v)}
          className="w-full flex items-center justify-center gap-1 text-xs text-primary hover:underline"
        >
          {statsExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {statsExpanded ? "Ocultar detalhes" : "Ver mais detalhes"}
        </button>

        {statsExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Status */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Por Status</p>
              <div className="space-y-1.5">
                {Object.entries(statusCount).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? "#6b7280" }} />
                      <span className="text-slate-700">{status}</span>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Top categorias */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Top Categorias</p>
              <div className="space-y-1.5">
                {categoryStats.slice(0, 5).map(cat => (
                  <div key={cat.nome} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 truncate max-w-[160px]">{cat.nome}</span>
                    <span className="font-medium">{cat.total}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Upload zone — só aparece em idle / error */}
      {(state.stage === "idle" || state.stage === "error" || state.stage === "parsing") && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Análise de Atendimentos via CSV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileInput}
            />

            {state.stage === "parsing" ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Spinner className="h-8 w-8 text-primary" />
                <p className="text-sm">Lendo arquivo...</p>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors",
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"
                )}
              >
                <Upload className={cn("h-10 w-10 mx-auto mb-4", dragOver ? "text-primary" : "text-slate-300")} />
                <p className="text-sm font-medium text-slate-700">Arraste um arquivo CSV ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Formato esperado: <code className="bg-slate-100 px-1 rounded">dataabertura, dataencerrado, descricao, situacao, grupo, responsavel</code>
                </p>
              </div>
            )}

            {state.stage === "error" && (
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">Erro ao processar arquivo</p>
                  <p className="text-xs text-red-600 mt-0.5">{state.message}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {(state.stage === "preview" || state.stage === "analyzing") && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600" />
                <span className="truncate max-w-[240px]">{state.fileName}</span>
                <span className="text-xs text-emerald-600 font-normal flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> carregado
                </span>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={reset} className="text-xs text-muted-foreground gap-1">
                <RefreshCw className="h-3 w-3" /> Trocar arquivo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <PreviewStats tickets={state.tickets} />

            {state.warnings.length > 0 && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <TriangleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{state.warnings.length} linha(s) ignorada(s) por dados inválidos.</span>
              </div>
            )}

            <Button
              className="w-full gap-2"
              onClick={() => state.stage === "preview" && handleAnalyze(state.tickets, state.warnings, state.fileName)}
              disabled={state.stage === "analyzing"}
            >
              {state.stage === "analyzing" ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Analisando atendimentos...
                </>
              ) : (
                <>
                  <Lightbulb className="h-4 w-4" />
                  Analisar com IA e gerar sugestões
                </>
              )}
            </Button>

            {state.stage === "analyzing" && (
              <p className="text-xs text-center text-muted-foreground">
                O Claude está analisando {state.tickets.length.toLocaleString("pt-BR")} atendimentos. Isso pode levar alguns segundos...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resultado */}
      {state.stage === "done" && (
        <>
          {/* Cabeçalho do resultado */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-slate-900">Relatório de Análise de Processos</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{state.fileName}</span>
              <Button variant="outline" size="sm" onClick={reset} className="gap-1 text-xs">
                <RefreshCw className="h-3 w-3" /> Nova análise
              </Button>
            </div>
          </div>

          {/* Métricas resumo */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4">
              <PreviewStats tickets={state.tickets} />
            </CardContent>
          </Card>

          {/* Resposta da IA */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Sugestões de Melhoria de Processos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm max-w-none
                  prose-headings:text-slate-900 prose-strong:text-slate-800
                  prose-li:text-slate-700 prose-p:text-slate-700
                  leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(state.result) }}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
