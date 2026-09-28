import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, ExternalLink, Package, UtensilsCrossed } from "lucide-react"
import { STATUS_BADGE, STATUS_LABELS, SELLER_TYPE_LABELS, formatDate, sellerOverviewQuery } from "#/lib/sellers"
import { BillingSummaryCard } from "#/components/seller-billing"
import { Badge } from "#/components/ui/badge.tsx"
import { Button } from "#/components/ui/button.tsx"

export const Route = createFileRoute("/seller/_seller/")({
  component: SellerDashboard,
})

function SellerDashboard() {
  const { seller: session } = Route.useRouteContext()
  const { data, isLoading } = useQuery(sellerOverviewQuery)
  const isBusiness = session.sellerType === "business"

  if (isLoading || !data) return <p className="text-muted-foreground">Loading...</p>
  const { seller, billing, listingCount } = data

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back, {seller.owner_name}</p>
        <h1 className="text-2xl font-bold text-foreground">{seller.business_name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant={STATUS_BADGE[seller.status]}>{STATUS_LABELS[seller.status]}</Badge>
          <span>{SELLER_TYPE_LABELS[seller.seller_type]}</span>
          <span>· Joined {formatDate(seller.created_at)}</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {isBusiness ? <Package className="size-5" /> : <UtensilsCrossed className="size-5" />}
            </div>
            <div>
              <p className="text-2xl font-bold">{listingCount}</p>
              <p className="text-sm text-muted-foreground">{isBusiness ? "Products listed" : "Menu items"}</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="w-fit">
            <Link to={isBusiness ? "/seller/products" : "/seller/menu"}>
              {isBusiness ? "Manage products" : "Manage menu"} <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="lg:col-span-2">
          <BillingSummaryCard billing={billing} />
        </div>
      </div>

      {seller.status === "approved" && (
        <a
          href="/e-market"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          See your listings on the E-Market <ExternalLink className="size-3.5" />
        </a>
      )}
    </div>
  )
}
