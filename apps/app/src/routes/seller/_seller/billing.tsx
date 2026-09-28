import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { sellerOverviewQuery } from "#/lib/sellers"
import { BillingSummaryCard, PaymentHistoryTable } from "#/components/seller-billing"

export const Route = createFileRoute("/seller/_seller/billing")({
  component: SellerBillingPage,
})

function SellerBillingPage() {
  const { data, isLoading } = useQuery(sellerOverviewQuery)
  if (isLoading || !data) return <p className="text-muted-foreground">Loading...</p>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground">
          A one-time registration fee, then a monthly fee while you sell on the E-Market.
        </p>
      </div>

      <BillingSummaryCard billing={data.billing} />

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground">How to pay</h2>
        <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
          {data.paymentInstructions ??
            "Payment details haven't been published yet. Contact the hall office to pay."}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Payments are confirmed by the hall office and appear below once recorded. Keep your MoMo or receipt
          reference.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-foreground">Payment history</h2>
        <PaymentHistoryTable payments={data.payments} />
      </section>
    </div>
  )
}
