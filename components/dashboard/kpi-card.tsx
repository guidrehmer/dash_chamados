"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  status?: "green" | "yellow" | "red" | "neutral"
  icon?: React.ReactNode
  /** 0-100: exibe barra de progresso em relação à meta */
  progressPct?: number
  /** Rótulo da meta exibido ao lado da barra, ex: "meta: 85%" */
  goalLabel?: string
}

const statusStyles = {
  green: {
    dot: "bg-emerald-600",
    bg: "bg-emerald-50",
    text: "text-emerald-700"
  },
  yellow: {
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-700"
  },
  red: {
    dot: "bg-red-600",
    bg: "bg-red-50",
    text: "text-red-700"
  },
  neutral: {
    dot: "bg-slate-400",
    bg: "bg-slate-50",
    text: "text-slate-700"
  }
}

export function KPICard({ title, value, subtitle, status = "neutral", icon, progressPct, goalLabel }: KPICardProps) {
  const styles = statusStyles[status]
  const pct = progressPct !== undefined ? Math.min(100, Math.max(0, progressPct)) : undefined

  return (
    <Card className={cn("transition-all", styles.bg)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("w-2.5 h-2.5 rounded-full", styles.dot)} />
          <span className={cn("text-2xl font-semibold", styles.text)}>
            {value}
          </span>
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {pct !== undefined && (
          <div className="mt-2">
            <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: status === "green" ? "#10b981" : status === "yellow" ? "#f59e0b" : status === "red" ? "#ef4444" : "#64748b"
                }}
              />
            </div>
            {goalLabel && (
              <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{pct.toFixed(0)}% da {goalLabel}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
