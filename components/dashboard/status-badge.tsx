"use client"

import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  className?: string
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  "Encerrado": {
    bg: "bg-emerald-100",
    text: "text-emerald-800"
  },
  "Em Atendimento": {
    bg: "bg-sky-100",
    text: "text-sky-800"
  },
  "Aguardando Aprovação": {
    bg: "bg-amber-100",
    text: "text-amber-800"
  },
  "Aberto": {
    bg: "bg-slate-100",
    text: "text-slate-800"
  }
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles = statusStyles[status] || statusStyles["Aberto"]

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        styles.bg,
        styles.text,
        className
      )}
    >
      {status}
    </span>
  )
}
