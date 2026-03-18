"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  status?: "green" | "yellow" | "red" | "neutral"
  icon?: React.ReactNode
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

export function KPICard({ title, value, subtitle, status = "neutral", icon }: KPICardProps) {
  const styles = statusStyles[status]

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
      </CardContent>
    </Card>
  )
}
