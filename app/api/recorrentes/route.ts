import { NextResponse } from "next/server"

const APEX_URL = "https://e.romancemoda.com.br/apex/romance/aisten/recorrentes/"
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"

const SYSTEM_PROMPT = `Você é um especialista em análise de atendimentos de suporte técnico e sistemas.

Sua tarefa é analisar uma lista de chamados do dia anterior e:

1. CLASSIFICAR cada chamado em uma dessas categorias:
   - "Acesso/Permissão": criação de usuários, ajuste de permissões, acesso a pastas/sistemas
   - "Fiscal/Remessa": atualização de custos fiscais, valores de remessas
   - "Auditoria": chamados de auditoria final (notas, débitos, acertadas)
   - "Infra/Equipamento": notebook, impressora, problemas de hardware
   - "App/Sistema": erros em aplicativos, sistema não abre, problemas de funcionamento
   - "Cadastro": unificar cadastro, dados de distribuidoras, correções cadastrais
   - "Outro": qualquer chamado que não se encaixe nas categorias acima

2. IDENTIFICAR padrões de recorrência: quais tipos de chamados aparecem com mais frequência e por quê

3. GERAR insights de redução: para cada categoria recorrente, sugira ações concretas para reduzir esses atendimentos

Responda APENAS em JSON válido, sem markdown, sem texto fora do JSON, exatamente neste formato:
{
  "classificacoes": [
    {
      "titulo": "título original do chamado",
      "usuario": "usuário que abriu",
      "grupo": "grupo responsável",
      "categoria": "categoria classificada",
      "motivo": "breve motivo em 1 frase"
    }
  ],
  "resumo": {
    "total": número total de chamados,
    "por_categoria": {"categoria": quantidade},
    "por_grupo": {"grupo": quantidade}
  },
  "insights": [
    {
      "categoria": "nome da categoria",
      "frequencia": número,
      "problema_raiz": "causa raiz identificada",
      "acoes": ["ação 1", "ação 2", "ação 3"],
      "impacto": "alto|medio|baixo"
    }
  ]
}`

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY não configurada" }, { status: 500 })
  }

  // 1. Fetch tickets from APEX
  let tickets: unknown[]
  try {
    const res = await fetch(APEX_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
    if (!res.ok) throw new Error(`APEX status ${res.status}`)
    const json = await res.json()
    // Support both {items:[...]} and plain array
    tickets = Array.isArray(json) ? json : (json.items ?? [])
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Falha ao buscar recorrentes: ${msg}` }, { status: 502 })
  }

  if (!tickets.length) {
    return NextResponse.json({
      classificacoes: [],
      resumo: { total: 0, por_categoria: {}, por_grupo: {} },
      insights: [],
      fonte: "Nenhum chamado encontrado no endpoint",
    })
  }

  // 2. Call Claude to classify and analyse
  const userMessage = `Analise os seguintes chamados e retorne o JSON conforme especificado:\n\n${JSON.stringify(tickets, null, 2)}`

  let analysisText: string
  try {
    const aiRes = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userMessage }],
      }),
    })

    if (!aiRes.ok) {
      const err = await aiRes.json().catch(() => ({}))
      throw new Error((err as { error?: { message?: string } }).error?.message ?? `status ${aiRes.status}`)
    }

    const aiData = await aiRes.json()
    analysisText = (aiData.content?.[0]?.text ?? "").trim()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Falha na análise IA: ${msg}` }, { status: 502 })
  }

  // 3. Parse JSON response from Claude
  try {
    // Strip possible markdown code fences
    const clean = analysisText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json({ ...parsed, gerado_em: new Date().toISOString() })
  } catch {
    // Return raw text so UI can show it anyway
    return NextResponse.json({
      error: "Resposta da IA não é JSON válido",
      raw: analysisText,
    }, { status: 422 })
  }
}
