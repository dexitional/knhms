import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { CircleAlert, Clock, CreditCard, LayoutDashboard, LogOut, Package, UserCog, UtensilsCrossed } from "lucide-react"
import { getSellerSession } from "#/server/session"
import { api } from "#/lib/api-client"
import { asset } from "#/lib/asset"
import { SELLER_TYPE_LABELS, sellerOverviewQuery } from "#/lib/sellers"
import type { Seller } from "#/lib/sellers"
import { Button } from "#/components/ui/button.tsx"

export const Route = createFileRoute("/seller/_seller")({
  beforeLoad: async () => {
    const seller = await getSellerSession()
    if (!seller) throw redirect({ to: "/seller/login" })
    return { seller }
  },
  component: SellerLayout,
})

function SellerLayout() {
  const { seller } = Route.useRouteContext()
  const navigate = useNavigate()
  const { data } = useQuery(sellerOverviewQuery)
  const status = data?.seller.status ?? seller.status

  const navItems = [
    { to: "/seller", label: "Dashboard", icon: LayoutDashboard, exact: true },
    seller.sellerType === "business"
      ? { to: "/seller/products", label: "My Products", icon: Package, exact: false }
      : { to: "/seller/menu", label: "My Menu", icon: UtensilsCrossed, exact: false },
    { to: "/seller/billing", label: "Billing", icon: CreditCard, exact: false },
    { to: "/seller/account", label: "Account", icon: UserCog, exact: false },
  ] as const

  const handleLogout = async () => {
    await api.post("/seller-auth/logout")
    navigate({ to: "/seller/login" })
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card sm:flex">
        <div className="flex items-center gap-3 border-b border-border px-6 py-5">
          <img src={asset("logo.png")} alt="" className="h-12 w-auto" />
          <div className="leading-tight">
            <p className="text-lg font-bold tracking-widest">KNH</p>
            <p className="text-xs tracking-widest text-primary uppercase">Seller Portal</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-secondary hover:text-foreground [&.active]:bg-primary [&.active]:text-primary-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <div className="mb-2 px-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">{seller.businessName}</p>
            <p>{SELLER_TYPE_LABELS[seller.sellerType]}</p>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
            <LogOut className="size-4" />
            Log out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-col gap-2 border-b border-border bg-card px-4 py-3 sm:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={asset("logo.png")} alt="" className="h-7 w-auto" />
              <span className="text-sm font-bold">KNH Seller</span>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={handleLogout} aria-label="Log out">
              <LogOut className="size-4" />
            </Button>
          </div>
          <nav className="-mx-1 flex gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-foreground/70 [&.active]:bg-primary [&.active]:text-primary-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-4 sm:p-8">
          <StatusBanner status={status} reason={data?.seller.status_reason ?? null} />
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function StatusBanner({ status, reason }: { status: Seller["status"]; reason: string | null }) {
  if (status === "approved") return null
  const content = {
    pending: {
      icon: Clock,
      className: "border-amber-200 bg-amber-50 text-amber-900",
      title: "Your application is being reviewed",
      body: "You can set up your listings now — they'll appear on the E-Market as soon as the hall office approves your account. You'll get an SMS when that happens.",
    },
    rejected: {
      icon: CircleAlert,
      className: "border-rose-200 bg-rose-50 text-rose-900",
      title: "Your application was not approved",
      body: reason ? `Reason: ${reason}` : "Contact the hall office for details.",
    },
    suspended: {
      icon: CircleAlert,
      className: "border-rose-200 bg-rose-50 text-rose-900",
      title: "Your account is suspended",
      body: `${reason ? `Reason: ${reason}. ` : ""}Your listings are hidden until the hall office reinstates you.`,
    },
  }[status]

  return (
    <div role="status" className={`flex gap-3 rounded-lg border p-4 ${content.className}`}>
      <content.icon className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="font-semibold">{content.title}</p>
        <p className="text-sm opacity-90">{content.body}</p>
      </div>
    </div>
  )
}
