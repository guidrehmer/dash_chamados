"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { Bot, Send, Sparkles, AlertCircle } from "lucide-react"

interface AITabProps {
  systemPrompt: string
}

const QUICK_PROMPTS = [
  "Resumo executivo do periodo",
  "Quais as principais causas de SLA violado?",
  "Tendencias desta semana vs semana anterior",
  "Recomendacoes para reduzir o TMA",
  "Analise de atendimentos recorrentes",
  "Horarios criticos e dimensionamento de equipe"
]

// Simple markdown to HTML converter
function renderMarkdown(text: string): string {
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    // Headers
    .replace(/^### (.*$)/gm, "<h3 class='text-lg font-semibold mt-4 mb-2'>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2 class='text-xl font-semibold mt-4 mb-2'>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1 class='text-2xl font-bold mt-4 mb-2'>$1</h1>")
    // Bullet points
    .replace(/^- (.*$)/gm, "<li class='ml-4'>$1</li>")
    .replace(/^• (.*$)/gm, "<li class='ml-4'>$1</li>")
    // Numbered lists
    .replace(/^\d+\. (.*$)/gm, "<li class='ml-4 list-decimal'>$1</li>")
    // Line breaks
    .replace(/\n\n/g, "</p><p class='mt-3'>")
    .replace(/\n/g, "<br>")
    // Wrap in paragraph
    .replace(/^(.*)$/, "<p>$1</p>")
}

export function AITab({ systemPrompt }: AITabProps) {
  const [question, setQuestion] = useState("")
  const [response, setResponse] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return
    
    setIsLoading(true)
    setError(null)
    setResponse("")

    try {
      const res = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          userMessage: prompt
        })
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || "Erro ao analisar dados")
      }

      setResponse(data.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao conectar com a IA")
    } finally {
      setIsLoading(false)
    }
  }, [systemPrompt])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleAnalyze(question)
  }

  const handleQuickPrompt = (prompt: string) => {
    setQuestion(prompt)
    handleAnalyze(prompt)
  }

  return (
    <div className="space-y-6">
      {/* Question Input */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Analise Inteligente com IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              placeholder="Digite sua pergunta sobre os dados de suporte..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                A IA tem acesso a todos os dados carregados
              </p>
              <Button type="submit" disabled={isLoading || !question.trim()}>
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Analisar
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Quick Prompts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Sugestoes Rapidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <Button
                key={prompt}
                variant="outline"
                size="sm"
                onClick={() => handleQuickPrompt(prompt)}
                disabled={isLoading}
                className="text-xs"
              >
                {prompt}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Erro na Analise</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-8 flex flex-col items-center justify-center">
            <Spinner className="h-8 w-8 text-primary" />
            <p className="mt-4 text-muted-foreground">Analisando os dados...</p>
          </CardContent>
        </Card>
      )}

      {/* AI Response */}
      {response && !isLoading && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              Resposta da IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="prose prose-sm max-w-none text-foreground
                prose-headings:text-foreground prose-strong:text-foreground
                prose-li:text-foreground prose-p:text-foreground"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(response) }}
            />
          </CardContent>
        </Card>
      )}

      {/* Initial State */}
      {!response && !isLoading && !error && (
        <Card className="bg-slate-50">
          <CardContent className="p-8 text-center">
            <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Analise com Inteligencia Artificial</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Digite uma pergunta ou selecione uma das sugestoes acima para obter 
              insights automaticos sobre os dados de suporte.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
