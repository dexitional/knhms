import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ArrowDownRight, ArrowUpRight, Eye, ImageIcon, MessageCircle, MousePointerClick, Percent, Phone } from "lucide-react"
import { cn } from "#/lib/utils"
import { sellerAnalyticsQuery } from "#/lib/sellers"
import type { AnalyticsRange, AnalyticsTotals } from "#/lib/sellers"

export const Route = createFileRoute("/seller/_seller/analytics")({
  component: SellerAnalyticsPage,
})

const RANGES: Array<AnalyticsRange> = [7, 30, 90]
const COLORS = { views: "#3b82f6", clicks: "#fa6400", whatsapp: "#22c55e", calls: "#64748b" }

const rate = (clicks: number, views: number) => (views === 0 ? 0 : (clicks / views) * 100)

// "2026-09-29" → "29 Sep"
function shortDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
}

function Change({ now, before, suffix = "" }: { now: number; before: number; suffix?: string }) {
  if (before === 0 && now === 0) return <span className="text-xs text-muted-foreground">No activity yet</span>
  if (before === 0) return <span className="text-xs font-medium text-emerald-600">New this period</span>
  const pct = ((now - before) / before) * 100
  const up = pct >= 0
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", up ? "text-emerald-600" : "text-rose-600")}>
      {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
      {Math.abs(pct).toFixed(0)}%{suffix} vs previous
    </span>
  )
}

function Kpi({
  label,
  value,
  display,
  before,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  display?: string
  before: number
  icon: typeof Eye
  tone: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn("flex size-8 items-center justify-center rounded-lg text-white", tone)}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-black text-foreground">{display ?? value.toLocaleString()}</p>
      <Change now={value} before={before} />
    </div>
  )
}

function SellerAnalyticsPage() {
  const [days, setDays] = useState<AnalyticsRange>(30)
  const { data, isLoading } = useQuery(sellerAnalyticsQuery(days))

  const t: AnalyticsTotals = data?.totals ?? { views: 0, clicks: 0, whatsapp: 0, calls: 0 }
  const p: AnalyticsTotals = data?.previous ?? { views: 0, clicks: 0, whatsapp: 0, calls: 0 }
  const channels = [
    { name: "WhatsApp", value: t.whatsapp, color: COLORS.whatsapp },
    { name: "Call", value: t.calls, color: COLORS.calls },
  ].filter((c) => c.value > 0)
  const maxViews = Math.max(1, ...(data?.listings.map((l) => l.views) ?? [1]))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            How shoppers engage with your listings on the E-Market. Each visitor counts once per listing per day.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-secondary p-1" role="tablist" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={days === r}
              onClick={() => setDays(r)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                days === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Last {r} days
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi label="Views" value={t.views} before={p.views} icon={Eye} tone="bg-blue-500" />
            <Kpi label="Order clicks" value={t.clicks} before={p.clicks} icon={MousePointerClick} tone="bg-primary" />
            <Kpi label="WhatsApp" value={t.whatsapp} before={p.whatsapp} icon={MessageCircle} tone="bg-emerald-500" />
            <Kpi label="Calls" value={t.calls} before={p.calls} icon={Phone} tone="bg-slate-500" />
            <Kpi
              label="Click rate"
              value={rate(t.clicks, t.views)}
              display={`${rate(t.clicks, t.views).toFixed(1)}%`}
              before={rate(p.clicks, p.views)}
              icon={Percent}
              tone="bg-violet-500"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4 lg:col-span-2">
              <p className="font-semibold text-foreground">Views and order clicks</p>
              <p className="text-xs text-muted-foreground">
                {shortDate(data.range.from)} – {shortDate(data.range.to)}
              </p>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      {(["views", "clicks"] as const).map((k) => (
                        <linearGradient key={k} id={`fill-${k}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS[k]} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={COLORS[k]} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortDate}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip labelFormatter={(v) => shortDate(String(v))} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                    <Legend wrapperStyle={{ fontSize: 13 }} />
                    <Area
                      type="monotone"
                      dataKey="views"
                      name="Views"
                      stroke={COLORS.views}
                      fill="url(#fill-views)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="clicks"
                      name="Order clicks"
                      stroke={COLORS.clicks}
                      fill="url(#fill-clicks)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <p className="font-semibold text-foreground">How shoppers contact you</p>
              <p className="text-xs text-muted-foreground">Order clicks by button</p>
              {channels.length === 0 ? (
                <p className="flex h-56 items-center justify-center text-center text-sm text-muted-foreground">
                  No order clicks in this period yet.
                </p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={channels} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
                        {channels.map((c) => (
                          <Cell key={c.name} fill={c.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <p className="font-semibold text-foreground">By listing</p>
              <p className="text-xs text-muted-foreground">Most viewed first</p>
            </div>
            {data.listings.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">You have no listings yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Listing</th>
                      <th className="px-4 py-2 font-medium">Views</th>
                      <th className="px-4 py-2 text-right font-medium">WhatsApp</th>
                      <th className="px-4 py-2 text-right font-medium">Calls</th>
                      <th className="px-4 py-2 text-right font-medium">Click rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.listings.map((l) => (
                      <tr key={l.id}>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-3">
                            {l.image_url ? (
                              <img src={l.image_url} alt="" className="size-9 rounded-md border border-border bg-white object-cover" />
                            ) : (
                              <span className="flex size-9 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                                <ImageIcon className="size-4" />
                              </span>
                            )}
                            <span className="font-medium text-foreground">{l.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span className="w-8 font-semibold">{l.views}</span>
                            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                              <span
                                className="block h-full rounded-full bg-blue-500"
                                style={{ width: `${(l.views / maxViews) * 100}%` }}
                              />
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">{l.whatsapp}</td>
                        <td className="px-4 py-2 text-right">{l.calls}</td>
                        <td className="px-4 py-2 text-right font-medium">
                          {l.views === 0 ? "—" : `${rate(l.whatsapp + l.calls, l.views).toFixed(1)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {t.views === 0 && (
            <p className="rounded-lg bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
              Tip: listings with a clear photo, a good description and a fair price get more views and order clicks.
              Views are only counted while your account is approved and your listings are active.
            </p>
          )}
        </>
      )}
    </div>
  )
}
