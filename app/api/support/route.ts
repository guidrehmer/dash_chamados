import { NextResponse } from "next/server"
import type { TicketRaw, APIResponse } from "@/lib/support-types"

const BASE_URL = "https://sistema.romancemoda.com.br/apex/romance/aisten/suporte/"
const BATCH_ITEMS = 500 // itens por lote (20 páginas de 25)
const SAFETY_LIMIT = 50000 // limite absoluto de segurança

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startOffset = parseInt(searchParams.get("offset") || "0", 10)

    const allTickets: TicketRaw[] = []
    let offset = startOffset
    let hasMore = true
    const maxOffset = startOffset + BATCH_ITEMS

    // Fetch pages until the batch is complete or there are no more pages
    while (hasMore) {
      const url = offset === 0 ? BASE_URL : `${BASE_URL}?offset=${offset}`
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json"
        },
        next: { revalidate: 60 } // Cache for 1 minute
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data: APIResponse = await response.json()

      if (data.items && Array.isArray(data.items)) {
        allTickets.push(...data.items)
      }

      hasMore = data.hasMore === true
      offset += 25

      // Stop when this batch is complete
      if (offset >= maxOffset) break

      // Safety limit to prevent infinite loops
      if (offset > SAFETY_LIMIT) {
        hasMore = false
        break
      }
    }

    const canLoadMore = hasMore && offset <= SAFETY_LIMIT

    return NextResponse.json({
      success: true,
      items: allTickets,
      total: allTickets.length,
      hasMore: canLoadMore,
      nextOffset: canLoadMore ? offset : null,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Error fetching support data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch data",
        items: [],
        total: 0,
        hasMore: false,
        nextOffset: null
      },
      { status: 500 }
    )
  }
}
