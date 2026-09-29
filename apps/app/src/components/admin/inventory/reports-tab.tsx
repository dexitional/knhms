import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Bar,
  BarChart,
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
import { AlertTriangle, CheckCircle2, Clock, FileSpreadsheet, PackageCheck, Boxes, Send } from "lucide-react"
import { api } from "#/lib/api-client"
import { cn } from "#/lib/utils"
import { PERIOD_LABELS, STATUS_LABELS } from "#/lib/inventory"
import type { InventoryCategory, InventoryReport, ReportPeriod } from "#/lib/inventory"
import { Button } from "#/components/ui/button.tsx"
import { CategorySelect } from "./stock-tab"

const PERIODS: Array<ReportPeriod> = ["week", "month", "quarter", "year"]

// Fixed chart colours: amber = requested/pending, blue = approved,
// green = released, rose = rejected, slate = cancelled.
const COLORS = {
  requested: "#f59e0b",
  approved: "#3b82f6",
  released: "#10b981",
  rejected: "#f43f5e",
  cancelled: "#94a3b8",
  pending: "#f59e0b",
  primary: "#fa6400",
} as const

const TREND_TITLE: Record<ReportPeriod, string> = {
  week: "Last 12 weeks",
  month: "Last 12 months",
  quarter: "Last 8 quarters",
  year: "Last 5 years",
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string
  value: number
  icon: typeof Clock
  tone: string
  hint?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4">
      <span className={cn("absolute -top-4 -right-4 size-16 rounded-full opacity-10", tone)} aria-hidden="true" />
      <span className={cn("flex size-9 items-center justify-center rounded-lg text-white", tone)}>
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-2xl font-black text-foreground">{value.toLocaleString()}</p>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {hint && <p className="text-xs text-muted-foreground/80">{hint}</p>}
    </div>
  )
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-semibold text-foreground">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </div>
  )
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">{children}</p>
)

export function ReportsTab({ categories }: { categories: Array<InventoryCategory> }) {
  const [period, setPeriod] = useState<ReportPeriod>("month")
  const [category, setCategory] = useState("all")
  const categoryId = category === "all" ? undefined : Number(category)
  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "reports", period, categoryId ?? "all"],
    queryFn: () => api.get<InventoryReport>("/inventory/reports", { period, categoryId }),
  })
  const exportUrl = `/api/inventory/reports/export?period=${period}${categoryId ? `&categoryId=${categoryId}` : ""}`

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-secondary p-1" role="tablist" aria-label="Report period">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={period === p}
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CategorySelect value={category} onChange={setCategory} categories={categories} />
          <Button asChild variant="outline">
            <a href={exportUrl} download>
              <FileSpreadsheet className="size-4 text-emerald-600" /> Export to Excel
            </a>
          </Button>
        </div>
      </div>

      {isLoading || !data ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          <p className="-mt-2 text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{data.range.label}</span>
            {data.category && (
              <>
                {" "}
                for <span className="font-medium text-foreground">{data.category.name}</span> (requests that include its
                items)
              </>
            )}
            . The Excel export covers the same selection: summary, stock levels, requests and every stock movement.
          </p>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi
              label="Requested"
              value={data.totals.requested}
              icon={Send}
              tone="bg-amber-500"
              hint="Raised this period"
            />
            <Kpi
              label="Pending"
              value={data.totals.pending}
              icon={Clock}
              tone="bg-orange-500"
              hint="Still awaiting approval"
            />
            <Kpi label="Approved" value={data.totals.approved} icon={CheckCircle2} tone="bg-blue-500" />
            <Kpi label="Released" value={data.totals.released} icon={PackageCheck} tone="bg-emerald-500" />
            <Kpi label="Units released" value={data.totals.unitsReleased} icon={Boxes} tone="bg-primary" />
            <Kpi
              label="Low / out of stock"
              value={data.stock.low + data.stock.out}
              icon={AlertTriangle}
              tone="bg-rose-500"
              hint={`${data.stock.out} out of stock`}
            />
          </div>

          <ChartCard title="Requests over time" subtitle={`${TREND_TITLE[period]}: raised, approved and released`}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.trend} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "rgba(250,100,0,0.06)" }} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Bar dataKey="requested" name="Requested" fill={COLORS.requested} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="approved" name="Approved" fill={COLORS.approved} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="released" name="Released" fill={COLORS.released} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Status of this period's requests" subtitle="Where requests raised this period stand now">
              {data.statusMix.length === 0 ? (
                <Empty>No requests this period.</Empty>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.statusMix.map((s) => ({
                          ...s,
                          name: STATUS_LABELS[s.status],
                        }))}
                        dataKey="count"
                        nameKey="name"
                        innerRadius="55%"
                        outerRadius="85%"
                        paddingAngle={2}
                      >
                        {data.statusMix.map((s) => (
                          <Cell key={s.status} fill={COLORS[s.status]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title="Most released items" subtitle="Units released this period">
              {data.topItems.length === 0 ? (
                <Empty>Nothing released this period.</Empty>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topItems} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                      <XAxis type="number" allowDecimals={false} hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(250,100,0,0.06)" }}
                        contentStyle={{ borderRadius: 8, fontSize: 13 }}
                      />
                      <Bar dataKey="units" name="Units" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Stock health"
              subtitle={`${data.stock.total} active item${data.stock.total === 1 ? "" : "s"}${data.category ? ` in ${data.category.name}` : ""}`}
            >
              <StockHealth stock={data.stock} />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}

function StockHealth({ stock }: { stock: InventoryReport["stock"] }) {
  const rows = [
    { label: "In stock", value: stock.ok, color: "bg-emerald-500" },
    { label: "Low stock", value: stock.low, color: "bg-amber-500" },
    { label: "Out of stock", value: stock.out, color: "bg-rose-500" },
  ]
  const total = Math.max(stock.total, 1)
  return (
    <div className="flex h-56 flex-col justify-center gap-5">
      <div className="flex h-4 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
        {rows.map((r) => (
          <div
            key={r.label}
            className={cn("h-full transition-all duration-700", r.color)}
            style={{ width: `${(r.value / total) * 100}%` }}
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
              {r.value}{" "}
              <span className="font-normal text-muted-foreground">({Math.round((r.value / total) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
