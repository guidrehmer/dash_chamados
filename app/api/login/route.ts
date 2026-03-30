import { NextResponse } from "next/server"

const LOGIN_URL = "https://sistema.romancemoda.com.br/apex/romance/aisten/login"

export async function POST(request: Request) {
  const { usuario, senha } = await request.json()

  try {
    const response = await fetch(LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ usuario, senha }),
    })

    // O APEX retorna body vazio em caso de sucesso — checar header "message"
    const messageHeader = response.headers.get("message")
    if (response.ok && messageHeader === "sucesso") {
      return NextResponse.json({ ok: true, usuario })
    }

    const text = await response.text()
    if (text) {
      const data = JSON.parse(text)
      return NextResponse.json({ ok: false, mensagem: data.mensagem || "Usuário ou senha incorretos." })
    }

    return NextResponse.json({ ok: false, mensagem: "Usuário ou senha incorretos." })
  } catch {
    return NextResponse.json({ ok: false, mensagem: "Erro ao conectar com o servidor." })
  }
}
