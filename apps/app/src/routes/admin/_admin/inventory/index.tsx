import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, BarChart3, ClipboardList, History, Package } from "lucide-react"
import { z } from "zod"
import { api } from "#/lib/api-client"
import { cn } from "#/lib/utils"
import { STOCK_APPROVERS, STOCK_RELEASERS, canManage, canView } from "#/lib/permissions"
import type { InventoryCategory, InventoryItem, InventoryMovement, InventoryRequest } from "#/lib/inventory"
import { INVENTORY_KEY, MovementsTable, StockTab } from "#/components/admin/inventory/stock-tab"
import { RequestsTab } from "#/components/admin/inventory/requests-tab"
import { ReportsTab } from "#/components/admin/inventory/reports-tab"

const TABS = ["stock", "requests", "history", "reports"] as const
type Tab = (typeof TABS)[number]

export const Route = createFileRoute("/admin/_admin/inventory/")({
  validateSearch: z.object({ tab: z.enum(TABS).optional() }),
  component: InventoryPage,
})

const TAB_META: Record<Tab, { label: string; icon: typeof Package }> = {
  stock: { label: "Stock", icon: Package },
  requests: { label: "Requests", icon: ClipboardList },
  history: { label: "Stock history", icon: History },
  reports: { label: "Reports", icon: BarChart3 },
}

function InventoryPage() {
  const { admin } = Route.useRouteContext()
  const navigate = useNavigate({ from: Route.fullPath })
  const allowed = canView(admin.role, "inventory")
  // Stores land on the requests they need to act on.
  const tab = Route.useSearch().tab ?? (admin.role === "stores" ? "requests" : "stock")

  const items = useQuery({
    queryKey: [...INVENTORY_KEY, "items"],
    queryFn: () => api.get<{ items: Array<InventoryItem> }>("/inventory/items"),
    enabled: allowed,
  })
  const requests = useQuery({
    queryKey: [...INVENTORY_KEY, "requests"],
    queryFn: () => api.get<{ requests: Array<InventoryRequest> }>("/inventory/requests"),
    enabled: allowed,
  })
  const categories = useQuery({
    queryKey: [...INVENTORY_KEY, "categories"],
    queryFn: () => api.get<{ categories: Array<InventoryCategory> }>("/inventory/categories"),
    enabled: allowed,
  })
  const movements = useQuery({
    queryKey: [...INVENTORY_KEY, "movements"],
    queryFn: () => api.get<{ movements: Array<InventoryMovement> }>("/inventory/movements"),
    enabled: allowed && tab === "history",
  })

  if (!allowed) {
    return <p className="text-muted-foreground">You don't have access to the inventories.</p>
  }

  const stock = items.data?.items ?? []
  const low = stock.filter((i) => i.is_active && i.level !== "ok")
  const allRequests = requests.data?.requests ?? []
  // Requests waiting on this user: pending ones for approvers, approved ones
  // for releasers.
  const actionable = allRequests.filter(
    (r) =>
      (r.status === "pending" && STOCK_APPROVERS.includes(admin.role)) ||
      (r.status === "approved" && STOCK_RELEASERS.includes(admin.role)),
  ).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventories</h1>
        <p className="text-sm text-muted-foreground">
          Hall stock, requests for items, and reports. Requests go from pending to approved (super admin) to released
          (stores).
        </p>
      </div>

      {low.length > 0 && (
        <div role="alert" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">
              {low.length} item{low.length === 1 ? " is" : "s are"} at or below the minimum level
            </p>
            <p className="mt-0.5">
              {low
                .slice(0, 6)
                .map((i) => `${i.name} (${i.quantity} left, min ${i.min_quantity})`)
                .join(" · ")}
              {low.length > 6 && ` · and ${low.length - 6} more`}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1 border-b border-border" role="tablist">
        {TABS.map((t) => {
          const { label, icon: Icon } = TAB_META[t]
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => navigate({ search: { tab: t }, replace: true })}
              className={cn(
                "-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
              {t === "requests" && actionable > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-white">{actionable}</span>
              )}
            </button>
          )
        })}
      </div>

      {tab === "stock" && (
        <StockTab
          items={stock}
          categories={categories.data?.categories ?? []}
          isLoading={items.isLoading}
          canManage={canManage(admin.role, "inventory")}
        />
      )}
      {tab === "requests" && (
        <RequestsTab
          requests={allRequests}
          items={stock}
          isLoading={requests.isLoading}
          viewer={{ id: admin.id, role: admin.role }}
        />
      )}
      {tab === "history" && (
        <MovementsTable movements={movements.data?.movements ?? []} isLoading={movements.isLoading} />
      )}
      {tab === "reports" && <ReportsTab categories={categories.data?.categories ?? []} />}
    </div>
  )
}
