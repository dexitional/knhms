import { ArrowDownRight, ArrowUpRight, Eye, MessageCircle, MousePointerClick, Phone } from "lucide-react"
import { cn } from "#/lib/utils"
import type { ListingStats, MarketAnalytics } from "#/lib/market"

// Shopper activity on the admin E-Market page: views and order clicks
// (WhatsApp / Call) recorded on the public E-Market, once per visitor per
// listing per day. Data: GET /api/analytics/market.

export type StatsRange = 7 | 30 | 90

const RANGES: Array<StatsRange> = [7, 30, 90]
const EMPTY: ListingStats = { views: 0, whatsapp: 0, calls: 0 }

export const statsFor = (map: Record<string, ListingStats> | undefined, id: number) => map?.[String(id)] ?? EMPTY
export const clicksOf = (s: ListingStats) => s.whatsapp + s.calls

function Change({ now, before }: { now: number; before: number }) {
  if (before === 0) {
    return <span className="text-xs text-muted-foreground">{now === 0 ? "No activity yet" : "New this period"}</span>
  }
  const pct = ((now - before) / before) * 100
  const up = pct >= 0
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", up ? "text-emerald-600" : "text-rose-600")}>
      {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
      {Math.abs(pct).toFixed(0)}% vs previous
    </span>
  )
}

export function MarketActivity({
  days,
  onDaysChange,
  data,
}: {
  days: StatsRange
  onDaysChange: (d: StatsRange) => void
  data: MarketAnalytics | undefined
}) {
  const t = data?.totals
  const p = data?.previous
  const tiles = [
    { label: "Views", icon: Eye, tone: "bg-blue-500", now: t?.views ?? 0, before: p?.views ?? 0 },
    { label: "Order clicks", icon: MousePointerClick, tone: "bg-primary", now: t?.clicks ?? 0, before: p?.clicks ?? 0 },
    { label: "WhatsApp", icon: MessageCircle, tone: "bg-emerald-500", now: t?.whatsapp ?? 0, before: p?.whatsapp ?? 0 },
    { label: "Calls", icon: Phone, tone: "bg-slate-500", now: t?.calls ?? 0, before: p?.calls ?? 0 },
  ]
  const rate = t && t.views > 0 ? ((t.clicks / t.views) * 100).toFixed(1) : null

  return (
    <section aria-labelledby="market-activity-heading" className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="market-activity-heading" className="font-semibold text-foreground">
            Shopper activity
          </h2>
          <p className="text-xs text-muted-foreground">
            Views and order clicks on the E-Market, once per visitor per listing per day
            {rate && ` · ${rate}% of views led to an order click`}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-secondary p-1" role="tablist" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={days === r}
              onClick={() => onDaysChange(r)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                days === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r} days
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex items-center gap-3">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg text-white", tile.tone)}>
              <tile.icon className="size-4" />
            </span>
            <div>
              <p className="text-xl font-bold text-foreground">{data ? tile.now.toLocaleString() : "—"}</p>
              <p className="text-xs text-muted-foreground">{tile.label}</p>
              {data && <Change now={tile.now} before={tile.before} />}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// Compact per-row figures for the products and vendors tables.
export function ViewsCell({ stats, max }: { stats: ListingStats; max: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 font-semibold text-foreground">{stats.views}</span>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
        <span
          className="block h-full rounded-full bg-blue-500"
          style={{ width: `${max > 0 ? (stats.views / max) * 100 : 0}%` }}
        />
      </span>
    </div>
  )
}

export function ClicksCell({ stats }: { stats: ListingStats }) {
  const clicks = clicksOf(stats)
  return (
    <div className="text-sm">
      <p className="font-semibold text-foreground">
        {clicks}
        {stats.views > 0 && (
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            {((clicks / stats.views) * 100).toFixed(0)}%
          </span>
        )}
      </p>
      {clicks > 0 && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-0.5" title="WhatsApp">
            <MessageCircle className="size-3 text-emerald-600" />
            {stats.whatsapp}
          </span>
          <span className="inline-flex items-center gap-0.5" title="Calls">
            <Phone className="size-3" />
            {stats.calls}
          </span>
        </p>
      )}
    </div>
  )
}
