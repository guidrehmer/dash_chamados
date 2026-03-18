import { NextResponse } from "next/server"
import type { TicketRaw, APIResponse } from "@/lib/support-types"

const BASE_URL = "https://sistema.romancemoda.com.br/apex/romance/company/suporte/"

export async function GET() {
  try {
    const allTickets: TicketRaw[] = []
    let offset = 0
    let hasMore = true

    // Fetch all pages
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
      
      // Safety limit to prevent infinite loops
      if (offset > 10000) break
    }

    return NextResponse.json({
      success: true,
      items: allTickets,
      total: allTickets.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Error fetching support data:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to fetch data",
        items: [],
        total: 0
      },
      { status: 500 }
    )
  }
}
