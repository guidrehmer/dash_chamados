import { describe, it, expect } from "vitest"
import {
  categorizeTicket,
  calculateResolutionTime,
  filterByPeriod,
  filterByGroup,
  filterByResponsavel,
  filterByDateRange,
  formatTime,
  truncateText,
} from "../support-utils"
import type { Ticket } from "../support-types"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  const base: Ticket = {
    dataabertura: "2024-03-15T10:00:00Z",
    dataencerrado: "2024-03-15T12:00:00Z",
    descricao: "Problema de acesso ao sistema",
    situacao: "Encerrado",
    grupo: "SISTEMAS",
    responsavel: "João Silva",
    categoria: "Acesso / Login",
    tempoResolucao: 120,
    mtta: null,
    prioridadeInferida: "Alto",
    slaTargetMinutes: 480,
    dentroSLAPrioridade: true,
    dataAberturaLocal: new Date("2024-03-15T10:00:00Z"),
    dataEncerradoLocal: new Date("2024-03-15T12:00:00Z"),
  }
  return { ...base, ...overrides }
}

// ─── categorizeTicket ────────────────────────────────────────────────────────

describe("categorizeTicket", () => {
  it("detecta Sync / Sincronização", () => {
    expect(categorizeTicket("Problema de sync no sistema")).toBe("Sync / Sincronização")
    expect(categorizeTicket("Sincronização pendente")).toBe("Sync / Sincronização")
  })

  it("detecta Tablet", () => {
    expect(categorizeTicket("Tablet não conecta")).toBe("Tablet")
    expect(categorizeTicket("Série do equipamento inativa")).toBe("Tablet")
  })

  it("detecta Acesso / Login", () => {
    expect(categorizeTicket("Não consigo fazer login")).toBe("Acesso / Login")
    expect(categorizeTicket("Problema de acesso ao sistema")).toBe("Acesso / Login")
    expect(categorizeTicket("Redefinição de senha")).toBe("Acesso / Login")
  })

  it("detecta Notas / Acerto", () => {
    expect(categorizeTicket("Nota fiscal com erro")).toBe("Notas / Acerto")
    expect(categorizeTicket("Acerto de lançamento")).toBe("Notas / Acerto")
  })

  it("detecta Pedidos / Integração", () => {
    expect(categorizeTicket("Pedido não integrou")).toBe("Pedidos / Integração")
    expect(categorizeTicket("Falha na remessa")).toBe("Pedidos / Integração")
  })

  it("detecta Cadastro", () => {
    expect(categorizeTicket("Cadastro de novo cliente")).toBe("Cadastro")
  })

  it("retorna Outros para descrições não reconhecidas", () => {
    expect(categorizeTicket("Dúvida geral")).toBe("Outros")
    expect(categorizeTicket("")).toBe("Outros")
  })
})

// ─── calculateResolutionTime ─────────────────────────────────────────────────

describe("calculateResolutionTime", () => {
  it("retorna null quando não há data de encerramento", () => {
    expect(calculateResolutionTime("2024-03-15T10:00:00Z", null)).toBeNull()
  })

  it("calcula o tempo em minutos corretamente", () => {
    expect(calculateResolutionTime("2024-03-15T10:00:00Z", "2024-03-15T12:00:00Z")).toBe(120)
  })

  it("retorna null para tempo negativo (dados inválidos)", () => {
    expect(calculateResolutionTime("2024-03-15T12:00:00Z", "2024-03-15T10:00:00Z")).toBeNull()
  })

  it("retorna null para tempo absurdamente longo (> 30 dias)", () => {
    expect(calculateResolutionTime("2024-01-01T00:00:00Z", "2024-03-01T00:00:00Z")).toBeNull()
  })

  it("arredonda para o minuto mais próximo", () => {
    expect(calculateResolutionTime("2024-03-15T10:00:00Z", "2024-03-15T10:01:30Z")).toBe(2)
    expect(calculateResolutionTime("2024-03-15T10:00:00Z", "2024-03-15T10:01:00Z")).toBe(1)
  })
})

// ─── filterByGroup ───────────────────────────────────────────────────────────

describe("filterByGroup", () => {
  const tickets = [
    makeTicket({ grupo: "SISTEMAS" }),
    makeTicket({ grupo: "CIT" }),
    makeTicket({ grupo: "SISTEMAS" }),
    makeTicket({ grupo: "IA" }),
  ]

  it("retorna todos quando filtro é TODOS", () => {
    expect(filterByGroup(tickets, "TODOS")).toHaveLength(4)
  })

  it("filtra por SISTEMAS", () => {
    const result = filterByGroup(tickets, "SISTEMAS")
    expect(result).toHaveLength(2)
    expect(result.every(t => t.grupo === "SISTEMAS")).toBe(true)
  })

  it("filtra por CIT", () => {
    const result = filterByGroup(tickets, "CIT")
    expect(result).toHaveLength(1)
    expect(result[0].grupo).toBe("CIT")
  })

  it("filtra por IA", () => {
    const result = filterByGroup(tickets, "IA")
    expect(result).toHaveLength(1)
    expect(result[0].grupo).toBe("IA")
  })
})

// ─── filterByResponsavel ─────────────────────────────────────────────────────

describe("filterByResponsavel", () => {
  const tickets = [
    makeTicket({ responsavel: "Maria" }),
    makeTicket({ responsavel: "João" }),
    makeTicket({ responsavel: "Maria" }),
    makeTicket({ responsavel: null }),
  ]

  it("filtra por responsável específico", () => {
    const result = filterByResponsavel(tickets, "Maria")
    expect(result).toHaveLength(2)
  })

  it("retorna lista vazia quando nenhum ticket tem o responsável", () => {
    expect(filterByResponsavel(tickets, "Carlos")).toHaveLength(0)
  })
})

// ─── filterByDateRange ───────────────────────────────────────────────────────

describe("filterByDateRange", () => {
  const tickets = [
    makeTicket({ dataAberturaLocal: new Date("2024-03-10T10:00:00Z") }),
    makeTicket({ dataAberturaLocal: new Date("2024-03-15T10:00:00Z") }),
    makeTicket({ dataAberturaLocal: new Date("2024-03-20T10:00:00Z") }),
  ]

  it("filtra tickets dentro do intervalo", () => {
    const result = filterByDateRange(tickets, new Date("2024-03-12"), new Date("2024-03-18"))
    expect(result).toHaveLength(1)
    expect(result[0].dataAberturaLocal.getDate()).toBe(15)
  })

  it("inclui tickets dentro do intervalo de um único dia completo", () => {
    // Usa datas explicitamente com horários UTC para evitar ambiguidade de fuso
    const result = filterByDateRange(
      tickets,
      new Date("2024-03-10T00:00:00Z"),
      new Date("2024-03-10T23:59:59Z")
    )
    expect(result).toHaveLength(1)
    expect(result[0].dataAberturaLocal.getUTCDate()).toBe(10)
  })
})

// ─── formatTime ──────────────────────────────────────────────────────────────

describe("formatTime", () => {
  it("formata minutos abaixo de 1 hora", () => {
    expect(formatTime(45)).toBe("45min")
  })

  it("formata exatamente 1 hora (sem minutos extras)", () => {
    expect(formatTime(60)).toBe("1h") // omite "0min" quando não há minutos restantes
  })

  it("formata horas e minutos", () => {
    expect(formatTime(90)).toBe("1h 30min")
    expect(formatTime(125)).toBe("2h 5min")
  })

  it("retorna '0min' para zero minutos", () => {
    expect(formatTime(0)).toBe("0min") // implementação trata 0 como < 60
  })
})

// ─── truncateText ─────────────────────────────────────────────────────────────

describe("truncateText", () => {
  it("não trunca texto menor que o limite", () => {
    expect(truncateText("Texto curto", 50)).toBe("Texto curto")
  })

  it("trunca e adiciona reticências quando excede o limite", () => {
    const result = truncateText("Texto muito longo que deve ser truncado", 10)
    expect(result).toHaveLength(13) // 10 chars + "..."
    expect(result.endsWith("...")).toBe(true)
  })

  it("retorna string vazia para entrada vazia", () => {
    expect(truncateText("", 10)).toBe("")
  })
})
