import { NextRequest, NextResponse } from "next/server"

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"

export async function POST(request: NextRequest) {
  try {
    const { systemPrompt, userMessage } = await request.json()

    if (!systemPrompt || !userMessage) {
      return NextResponse.json(
        { error: "Missing systemPrompt or userMessage" },
        { status: 400 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      )
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userMessage
          }
        ]
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.content?.[0]?.text || "Não foi possível gerar uma resposta."

    return NextResponse.json({ 
      success: true, 
      content 
    })
  } catch (error) {
    console.error("Error calling Anthropic API:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to analyze data" 
      },
      { status: 500 }
    )
  }
}
