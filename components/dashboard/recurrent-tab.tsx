"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell } from "recharts"
import type { Ticket, CategoryStats } from "@/lib/support-types"
import { extractKeywords, getCategoryExamples } from "@/lib/support-utils"
import { cn } from "@/lib/utils"
import { Repeat, Cloud, FileText } from "lucide-react"

function ExpandableText({ text, limit = 60 }: { text: string; limit?: number }) {
  const [expanded, setExpanded] = useState(false)
  if (text.length <= limit) return <span>{text}</span>
  return (
    <span>
      {expanded ? text : text.substring(0, limit)}
      <button
        onClick={() => setExpanded(v => !v)}
        className="ml-1 text-primary hover:underline text-xs font-medium"
      >
        {expanded ? "menos" : "...ver mais"}
      </button>
    </span>
  )
}

interface RecurrentTabProps {
  tickets: Ticket[]
  categoryStats: CategoryStats[]
}

const COLORS = [
  "#1a56db", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe",
  "#f59e0b", "#10b981", "#6366f1", "#ec4899", "#8b5cf6"
]

const chartConfig = {
  value: {
    label: "Quantidade"
  }
}

export function RecurrentTab({ tickets, categoryStats }: RecurrentTabProps) {
  const keywords = useMemo(() => extractKeywords(tickets), [tickets])
  const categoryExamples = useMemo(() => getCategoryExamples(tickets, 5), [tickets])
  const categoryEntries = useMemo(() => Object.entries(categoryExamples), [categoryExamples])
  const [exPage, setExPage] = useState(0)
  const EX_PER_PAGE = 4
  const exTotalPages = Math.ceil(categoryEntries.length / EX_PER_PAGE)
  const exPageEntries = categoryEntries.slice(exPage * EX_PER_PAGE, (exPage + 1) * EX_PER_PAGE)
  
  const pieData = useMemo(() => {
    const total = categoryStats.reduce((sum, c) => sum + c.total, 0)
    return categoryStats.slice(0, 8).map((cat, index) => ({
      name: cat.nome,
      value: cat.total,
      percentage: Math.round((cat.total / total) * 100),
      fill: COLORS[index % COLORS.length]
    }))
  }, [categoryStats])

  const maxKeywordCount = useMemo(() => {
    return keywords.length > 0 ? keywords[0].count : 1
  }, [keywords])

  return (
    <div className="space-y-6">
      {/* Category Progress Bars */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            Categorias Mais Frequentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryStats.map((cat, index) => {
              const percentage = categoryStats[0].total > 0 
                ? Math.round((cat.total / categoryStats[0].total) * 100) 
                : 0
              return (
                <div key={cat.nome}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{cat.nome}</span>
                    <span className="text-sm text-muted-foreground">
                      {cat.total} ({Math.round((cat.total / tickets.length) * 100)}%)
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: COLORS[index % COLORS.length]
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Distribuicao Percentual</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percentage }) => `${percentage}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value, name) => [`${value} atendimentos`, name]}
                />
              </PieChart>
            </ChartContainer>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {pieData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div 
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Word Cloud */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Palavras-chave
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 justify-center items-center min-h-[250px] p-4">
              {keywords.slice(0, 40).map((kw, index) => {
                const fontSize = 11 + Math.round((kw.count / maxKeywordCount) * 11)
                const opacity = 0.5 + (kw.count / maxKeywordCount) * 0.5
                return (
                  <span
                    key={kw.word}
                    className={cn(
                      "inline-block px-2 py-1 rounded transition-all hover:scale-110 cursor-default",
                      index % 5 === 0 ? "text-primary" :
                      index % 5 === 1 ? "text-sky-600" :
                      index % 5 === 2 ? "text-emerald-600" :
                      index % 5 === 3 ? "text-amber-600" :
                      "text-slate-600"
                    )}
                    style={{ 
                      fontSize: `${fontSize}px`,
                      opacity
                    }}
                    title={`${kw.count} ocorrencias`}
                  >
                    {kw.word}
                  </span>
                )
              })}
              {keywords.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  Nenhuma palavra-chave encontrada
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Examples per Category */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Exemplos por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Categoria</TableHead>
                  {[1,2,3,4,5].map(n => (
                    <TableHead key={n} className="w-[calc((100%-160px)/5)]">Exemplo {n}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {exPageEntries.map(([categoria, exemplos]) => (
                  <TableRow key={categoria}>
                    <TableCell className="font-medium align-top">{categoria}</TableCell>
                    {[0,1,2,3,4].map(i => (
                      <TableCell key={i} className="text-sm text-muted-foreground align-top break-words whitespace-normal">
                        {exemplos[i] ? <ExpandableText text={exemplos[i]} limit={50} /> : "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {exTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>Página {exPage + 1} de {exTotalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setExPage(p => p - 1)} disabled={exPage === 0}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setExPage(p => p + 1)} disabled={exPage >= exTotalPages - 1}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
