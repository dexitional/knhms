import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
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
import { BedDouble, DoorOpen, MessageSquareHeart, ShoppingBag, UserPlus, Users, Wrench } from "lucide-react"
import { api } from "#/lib/api-client"
import type { AdminOverview } from "#/lib/overview"
import { ChartCard, ChartEmpty, HealthBar, Kpi, PeriodTabs, TREND_TITLE } from "#/components/admin/report-ui"
import type { ReportPeriod } from "#/components/admin/report-ui"

export const Route = createFileRoute("/admin/_admin/")({
  component: AdminOverviewPage,
})

// Chart colours, matching the Stores reports: orange = registrations,
// amber = repairs, blue = orders, violet = suggestions.
const COLORS = {
  registrations: "#fa6400",
  repairs: "#f59e0b",
  orders: "#3b82f6",
  suggestions: "#8b5cf6",
  capacity: "#e5e7eb",
}

const REPAIR_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#3b82f6",
  assigned: "#8b5cf6",
  completed: "#10b981",
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const BLOCK_LIMIT = 8

function AdminOverviewPage() {
  const [period, setPeriod] = useState<ReportPeriod>("month")
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "overview", period],
    queryFn: () => api.get<AdminOverview>("/reports/overview", { period }),
  })

  const repairs = (data?.repairStatusCounts ?? [])
    .filter((r) => r.count > 0)
    .map((r) => ({ ...r, name: capitalize(r.status) }))
  // The chart has room for about 8 rows: show the fullest blocks.
  const allBlocks = data?.blocks ?? []
  const blocks = [...allBlocks]
    .sort((a, b) => b.occupied / Math.max(b.capacity, 1) - a.occupied / Math.max(a.capacity, 1) || b.capacity - a.capacity)
    .slice(0, BLOCK_LIMIT)
    .map((b) => ({ ...b, free: Math.max(0, b.capacity - b.occupied) }))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Occupancy and queues right now, and hall activity for the chosen period.
          </p>
        </div>
        <PeriodTabs value={period} onChange={setPeriod} />
      </div>

      {isLoading || !data ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          <p className="-mt-2 text-sm text-muted-foreground">
            Activity figures cover <span className="font-medium text-foreground">{data.range.label}</span>; occupancy
            and pending items are as of now.
          </p>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi
              label="Registered students"
              value={data.totalStudents}
              icon={Users}
              tone="bg-primary"
              hint={`+${data.inPeriod.registrations} this period`}
            />
            <Kpi
              label="Occupancy"
              value={`${data.occupancyRate}%`}
              icon={DoorOpen}
              tone="bg-emerald-500"
              hint={`${data.occupied} of ${data.totalCapacity} beds · ${data.totalRooms} rooms`}
            />
            <Kpi
              label="Beds available"
              value={data.bedsFree}
              icon={BedDouble}
              tone="bg-teal-500"
              hint={`${data.fullRooms} room${data.fullRooms === 1 ? "" : "s"} full`}
            />
            <Kpi
              label="Repair requests"
              value={data.inPeriod.repairs}
              icon={Wrench}
              tone="bg-amber-500"
              hint={`${data.pendingRepairs} pending now`}
            />
            <Kpi
              label="Orders"
              value={data.inPeriod.orders}
              icon={ShoppingBag}
              tone="bg-blue-500"
              hint={`${data.pendingOrders} pending now`}
            />
            <Kpi
              label="Suggestions"
              value={data.inPeriod.suggestions}
              icon={MessageSquareHeart}
              tone="bg-violet-500"
              hint={`${data.newSuggestions} new, not yet reviewed`}
            />
          </div>

          <ChartCard title="Hall activity over time" subtitle={`${TREND_TITLE[period]}: registrations, repairs, orders and suggestions`}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.trend} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "rgba(250,100,0,0.06)" }} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Bar dataKey="registrations" name="Registrations" fill={COLORS.registrations} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="repairs" name="Repairs" fill={COLORS.repairs} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="orders" name="Orders" fill={COLORS.orders} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="suggestions" name="Suggestions" fill={COLORS.suggestions} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Repair requests by status" subtitle="Every request, where it stands now">
              {repairs.length === 0 ? (
                <ChartEmpty>No repair requests yet.</ChartEmpty>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={repairs} dataKey="count" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
                        {repairs.map((r) => (
                          <Cell key={r.status} fill={REPAIR_COLORS[r.status] ?? "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Beds by block"
              subtitle={
                allBlocks.length > BLOCK_LIMIT
                  ? `Fullest ${BLOCK_LIMIT} of ${allBlocks.length} blocks: occupied and free beds`
                  : "Occupied and free beds in each block"
              }
            >
              {blocks.length === 0 ? (
                <ChartEmpty>No rooms yet.</ChartEmpty>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={blocks} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                      <XAxis type="number" allowDecimals={false} hide />
                      <YAxis type="category" dataKey="block" width={80} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: "rgba(250,100,0,0.06)" }} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="occupied" name="Occupied" stackId="beds" fill={COLORS.registrations} />
                      <Bar dataKey="free" name="Free" stackId="beds" fill={COLORS.capacity} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title="Occupancy" subtitle={`${data.totalCapacity} beds across ${data.totalRooms} active rooms`}>
              <HealthBar
                total={data.totalCapacity}
                rows={[
                  { label: "Occupied", value: data.occupied, color: "bg-primary" },
                  { label: "Available", value: data.bedsFree, color: "bg-emerald-500" },
                ]}
              />
            </ChartCard>
          </div>

          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserPlus className="size-3.5" /> {data.inPeriod.registrations} student
            {data.inPeriod.registrations === 1 ? "" : "s"} registered in {data.range.label}.
          </p>
        </>
      )}
    </div>
  )
}
