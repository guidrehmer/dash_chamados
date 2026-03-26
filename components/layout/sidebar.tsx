"use client"

import { cn } from "@/lib/utils"
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import {
  LayoutDashboard,
  BarChart3,
  Repeat,
  Clock,
  Bot,
  LineChart,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldCheck,
} from "lucide-react"

// ─── Nav item types ───────────────────────────────────────────────────────────
export type NavSection =
  | "overview"
  | "sla"
  | "ranking"
  | "recurrent"
  | "ai"
  | "analysis"

interface NavItem {
  id: NavSection
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export const NAV_ITEMS: NavItem[] = [
  { id: "overview",  label: "Visão Geral",  icon: LayoutDashboard },
  { id: "sla",       label: "SLA & ITIL",   icon: ShieldCheck },
  { id: "ranking",   label: "Ranking",       icon: BarChart3 },
  { id: "recurrent", label: "Recorrentes",   icon: Repeat },
  { id: "ai",        label: "IA Assistente", icon: Bot },
  { id: "analysis",  label: "Análises CSV",  icon: LineChart },
]

export const NAV_LABELS: Record<NavSection, string> = {
  overview:  "Visão Geral",
  sla:       "SLA & ITIL",
  ranking:   "Ranking",
  recurrent: "Recorrentes",
  ai:        "IA Assistente",
  analysis:  "Análises CSV",
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SidebarProps {
  active: NavSection
  onNavigate: (section: NavSection) => void
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
  filaCount?: number
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export function Sidebar({
  active,
  onNavigate,
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
  filaCount = 0,
}: SidebarProps) {
  const handleNavigate = (id: NavSection) => {
    onNavigate(id)
    onMobileClose()
  }

  /** Shared inner content rendered in both desktop + mobile */
  const Inner = (
    <div className="flex flex-col h-full">
      {/* ── Branding ─────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center h-16 px-4 border-b border-slate-200/80 shrink-0",
          collapsed && "justify-center px-0"
        )}
      >
        {collapsed ? (
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <div className="leading-tight overflow-hidden">
              <p className="text-sm font-semibold text-slate-900 truncate">
                CrisduLabs
              </p>
              <p className="text-[10px] text-muted-foreground">
                Dashboard de Suporte
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <TooltipProvider delayDuration={100}>
          <ul className={cn("space-y-0.5", collapsed ? "px-1.5" : "px-2")}>
            {NAV_ITEMS.map((item) => {
              const isActive = active === item.id
              const Icon = item.icon
              const showBadge = item.id === "overview" && filaCount > 0

              const button = (
                <button
                  onClick={() => handleNavigate(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative group",
                    // active state: left accent border via box-shadow trick (avoids layout shift)
                    isActive
                      ? "bg-blue-50 text-blue-700 shadow-[inset_3px_0_0_#2563eb]"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    collapsed ? "justify-center px-2" : "px-3"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive
                        ? "text-blue-600"
                        : "text-slate-400 group-hover:text-slate-600"
                    )}
                  />

                  {!collapsed && (
                    <span className="truncate flex-1 text-left">{item.label}</span>
                  )}

                  {/* Alert badge */}
                  {showBadge && (
                    <span
                      className={cn(
                        "font-bold bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] animate-pulse",
                        collapsed
                          ? "absolute -top-0.5 -right-0.5 w-3.5 h-3.5"
                          : "w-5 h-5 shrink-0"
                      )}
                    >
                      {filaCount > 9 ? "9+" : filaCount}
                    </span>
                  )}
                </button>
              )

              // Wrap in tooltip when collapsed (icon-only mode)
              return (
                <li key={item.id}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        <p>{item.label}</p>
                        {showBadge && (
                          <p className="text-red-400">{filaCount} na fila</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    button
                  )}
                </li>
              )
            })}
          </ul>
        </TooltipProvider>
      </nav>

      {/* ── Section label (desktop expanded only) ────────────────────────── */}
      {!collapsed && (
        <div className="px-4 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Sistema
          </p>
        </div>
      )}

      {/* ── Collapse toggle (desktop only) ───────────────────────────────── */}
      <div
        className={cn(
          "hidden md:flex items-center border-t border-slate-200/80 px-3 py-3 shrink-0",
          collapsed ? "justify-center" : "justify-end"
        )}
      >
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Mobile: backdrop overlay ──────────────────────────────────────── */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 z-40 transition-opacity duration-200 md:hidden",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      {/* ── Mobile: slide-in drawer ───────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-60 bg-white border-r border-slate-200 z-50 shadow-2xl",
          "transition-transform duration-200 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Navegação principal"
      >
        {/* Close button (mobile only) */}
        <button
          onClick={onMobileClose}
          className="absolute top-3 right-3 p-1.5 rounded-md text-slate-400 hover:bg-slate-100 z-10"
          aria-label="Fechar menu"
        >
          <X className="h-4 w-4" />
        </button>
        {Inner}
      </aside>

      {/* ── Desktop: fixed sidebar ────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed top-0 left-0 h-screen bg-white border-r border-slate-200 z-30",
          "transition-all duration-200 ease-in-out",
          collapsed ? "w-[64px]" : "w-[240px]"
        )}
        aria-label="Navegação principal"
      >
        {Inner}
      </aside>
    </>
  )
}
