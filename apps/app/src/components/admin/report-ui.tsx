import type { ComponentType, ReactNode } from "react"
import { cn } from "#/lib/utils"

// Shared report building blocks: the Stores (inventory) reports and the admin
// Overview use these so both read the same way.

export type ReportPeriod = "week" | "month" | "quarter" | "year"

export const PERIODS: Array<ReportPeriod> = ["week", "month", "quarter", "year"]

export const PERIOD_TAB_LABELS: Record<ReportPeriod, string> = {
  week: "This week",
  month: "This month",
  quarter: "This quarter",
  year: "This year",
}

export const TREND_TITLE: Record<ReportPeriod, string> = {
  week: "Last 12 weeks",
  month: "Last 12 months",
  quarter: "Last 8 quarters",
  year: "Last 5 years",
}

export function PeriodTabs({ value, onChange }: { value: ReportPeriod; onChange: (p: ReportPeriod) => void }) {
  return (
    <div className="flex gap-1 rounded-lg bg-secondary p-1" role="tablist" aria-label="Report period">
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          role="tab"
          aria-selected={value === p}
          onClick={() => onChange(p)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            value === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {PERIOD_TAB_LABELS[p]}
        </button>
      ))}
    </div>
  )
}

export function Kpi({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string
  value: number | string
  icon: ComponentType<{ className?: string }>
  tone: string
  hint?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4">
      <span className={cn("absolute -top-4 -right-4 size-16 rounded-full opacity-10", tone)} aria-hidden="true" />
      <span className={cn("flex size-9 items-center justify-center rounded-lg text-white", tone)}>
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-2xl font-black text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {hint && <p className="text-xs text-muted-foreground/80">{hint}</p>}
    </div>
  )
}

export function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-semibold text-foreground">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </div>
  )
}

export const ChartEmpty = ({ children }: { children: ReactNode }) => (
  <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">{children}</p>
)

// A stacked bar with a legend, e.g. stock health or bed occupancy.
export function HealthBar({
  rows,
  total,
}: {
  rows: Array<{ label: string; value: number; color: string }>
  total: number
}) {
  const denominator = Math.max(total, 1)
  return (
    <div className="flex h-56 flex-col justify-center gap-5">
      <div className="flex h-4 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
        {rows.map((r) => (
          <div
            key={r.label}
            className={cn("h-full transition-all duration-700", r.color)}
            style={{ width: `${(r.value / denominator) * 100}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className={cn("size-3 rounded-full", r.color)} />
              {r.label}
            </span>
            <span className="font-semibold text-foreground">
              {r.value.toLocaleString()}{" "}
              <span className="font-normal text-muted-foreground">({Math.round((r.value / denominator) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
