"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { Bot, Send, Sparkles, AlertCircle, Trash2, User } from "lucide-react"

interface AITabProps {
  systemPrompt: string
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  loading?: boolean
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
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.*$)/gm, "<h3 class='text-base font-semibold mt-3 mb-1'>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2 class='text-lg font-semibold mt-4 mb-2'>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1 class='text-xl font-bold mt-4 mb-2'>$1</h1>")
    .replace(/^- (.*$)/gm, "<li class='ml-4 list-disc'>$1</li>")
    .replace(/^• (.*$)/gm, "<li class='ml-4 list-disc'>$1</li>")
    .replace(/^\d+\. (.*$)/gm, "<li class='ml-4 list-decimal'>$1</li>")
    .replace(/\n\n/g, "</p><p class='mt-2'>")
    .replace(/\n/g, "<br>")
    .replace(/^(.*)$/, "<p>$1</p>")
}

export function AITab({ systemPrompt }: AITabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const sendMessage = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isLoading) return

    setError(null)
    setQuestion("")

    // Add user message immediately
    setMessages(prev => [...prev, { role: "user", content: prompt }])

    // Add placeholder for assistant response
    setMessages(prev => [...prev, { role: "assistant", content: "", loading: true }])
    setIsLoading(true)

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

      // Replace the loading placeholder with the real response
      setMessages(prev => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        updated[lastIdx] = { role: "assistant", content: data.content, loading: false }
        return updated
      })
    } catch (err) {
      // Remove the loading placeholder and show error
      setMessages(prev => prev.slice(0, -1))
      setError(err instanceof Error ? err.message : "Erro ao conectar com a IA")
    } finally {
      setIsLoading(false)
    }
  }, [systemPrompt, isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(question)
  }

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt)
  }

  const handleClearHistory = () => {
    setMessages([])
    setError(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(question)
    }
  }

  return (
    <div className="space-y-4">
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

      {/* Chat Area */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Conversa com IA
            {messages.length > 0 && (
              <span className="text-xs text-muted-foreground font-normal">
                ({Math.ceil(messages.filter(m => m.role === "user").length)} pergunta{messages.filter(m => m.role === "user").length !== 1 ? "s" : ""})
              </span>
            )}
          </CardTitle>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearHistory}
              className="text-muted-foreground hover:text-destructive text-xs gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Limpar conversa
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {/* Messages */}
          {messages.length === 0 && !error ? (
            <div className="px-6 py-10 text-center bg-slate-50 rounded-b-lg">
              <Bot className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-base font-medium mb-1">Análise com IA</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Faça perguntas sobre os dados ou use as sugestões acima. A IA tem acesso a todos os dados carregados.
              </p>
              <p className="text-muted-foreground text-xs mt-2">
                Dica: pressione Enter para enviar, Shift+Enter para nova linha.
              </p>
            </div>
          ) : (
            <div className="max-h-[520px] overflow-y-auto px-4 py-4 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-3",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-xl px-4 py-2.5 max-w-[80%] text-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-slate-100 text-slate-800"
                    )}
                  >
                    {msg.loading ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Spinner className="h-4 w-4" />
                        <span className="text-xs">Analisando...</span>
                      </div>
                    ) : msg.role === "assistant" ? (
                      <div
                        className="prose prose-sm max-w-none
                          prose-headings:text-slate-800 prose-strong:text-slate-800
                          prose-li:text-slate-800 prose-p:text-slate-800"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                      />
                    ) : (
                      <span>{msg.content}</span>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center mt-0.5">
                      <User className="h-4 w-4 text-slate-600" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-4 mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800 text-sm">Erro na análise</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-slate-200 px-4 py-3">
            <form onSubmit={handleSubmit} className="flex gap-2 items-end">
              <Textarea
                placeholder="Digite sua pergunta... (Enter para enviar)"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[60px] max-h-[140px] resize-none flex-1 text-sm"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10 flex-shrink-0"
                disabled={isLoading || !question.trim()}
              >
                {isLoading ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
