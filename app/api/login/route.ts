import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { usuario, senha } = await req.json()

  const res = await fetch("https://sistema.romancemoda.com.br/apex/romance/company/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ usuario, senha }).toString(),
  })

  const message = res.headers.get("message") ?? ""
  const sucesso = message.toLowerCase() === "sucesso"

  return NextResponse.json({ sucesso, message }, { status: 200 })
}
