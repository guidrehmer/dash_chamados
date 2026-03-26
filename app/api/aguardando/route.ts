import { NextResponse } from "next/server"
import type { AguardandoItem } from "@/lib/support-types"

const BASE_URL = "https://sistema.romancemoda.com.br/apex/romance/company/aguardando/"
const SAFETY_LIMIT = 5000

/**
 * GET /api/aguardando
 * Proxy para o endpoint de tickets em aberto/atendimento.
 * Paginado: busca todos os registros até o SAFETY_LIMIT.
 * Usado para: backlog em tempo real, backlog por idade, widget de situação atual.
 */
export async function GET() {
  try {
    const allItems: AguardandoItem[] = []
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const url = offset === 0 ? BASE_URL : `${BASE_URL}?offset=${offset}`
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 30 }, // cache de 30s — dados ao vivo
      })

      if (!response.ok) throw new Error(`API error: ${response.status}`)

      const data = await response.json()
      if (data.items && Array.isArray(data.items)) {
        allItems.push(...(data.items as AguardandoItem[]))
      }

      hasMore = data.hasMore === true
      offset += 25

      if (offset > SAFETY_LIMIT) break
    }

    return NextResponse.json({
      success: true,
      items: allItems,
      total: allItems.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching aguardando:", error)
    return NextResponse.json(
      { success: false, items: [], total: 0, error: String(error) },
      { status: 500 }
    )
  }
}
