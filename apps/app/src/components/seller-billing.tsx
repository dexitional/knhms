import { formatCedis } from "#/lib/market"
import { BILLING_BADGE, BILLING_LABELS, METHOD_LABELS, formatDate } from "#/lib/sellers"
import type { BillingSummary, SellerPayment } from "#/lib/sellers"
import { Badge } from "#/components/ui/badge.tsx"
import {
  Table,
  TableBody,
  TableCell,
  TableEmptyValue,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table.tsx"

// Billing snapshot for one seller, shown in the seller portal and on the
// admin seller page.
export function BillingSummaryCard({ billing }: { billing: BillingSummary }) {
  const rows: Array<[string, React.ReactNode]> = [
    [
      "Registration fee",
      billing.registrationFee === 0 ? (
        "Waived"
      ) : (
        <span>
          {formatCedis(billing.registrationFee)}{" "}
          <Badge variant={billing.registrationPaid ? "success" : "warning"}>
            {billing.registrationPaid ? "Paid" : "Unpaid"}
          </Badge>
        </span>
      ),
    ],
    ["Monthly fee", billing.monthlyFee === 0 ? "Waived" : formatCedis(billing.monthlyFee)],
    ["Paid up to", formatDate(billing.paidUntil)],
  ]

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-foreground">Billing</h2>
        {billing.state !== "not_applicable" && (
          <Badge variant={BILLING_BADGE[billing.state]}>
            {BILLING_LABELS[billing.state]}
            {billing.state === "overdue" && ` · ${billing.daysOverdue} day${billing.daysOverdue === 1 ? "" : "s"}`}
          </Badge>
        )}
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      {billing.amountDue > 0 && (
        <p className="mt-4 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-foreground">
          Amount due now: <span className="font-bold text-primary">{formatCedis(billing.amountDue)}</span>
        </p>
      )}
    </div>
  )
}

export function PaymentHistoryTable({
  payments,
  showRecordedBy = false,
}: {
  payments: Array<SellerPayment>
  showRecordedBy?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Date</TableHead>
            <TableHead>For</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Reference</TableHead>
            {showRecordedBy && <TableHead>Recorded by</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={showRecordedBy ? 6 : 5} className="py-8 text-center text-muted-foreground">
                No payments recorded yet.
              </TableCell>
            </TableRow>
          )}
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{formatDate(p.created_at)}</TableCell>
              <TableCell>
                {p.kind === "registration" ? (
                  "Registration fee"
                ) : (
                  <span>
                    {p.months} month{p.months === 1 ? "" : "s"}
                    <span className="block text-xs text-muted-foreground">
                      {formatDate(p.covers_from)} – {formatDate(p.covers_to)}
                    </span>
                  </span>
                )}
              </TableCell>
              <TableCell className="font-semibold">{formatCedis(p.amount)}</TableCell>
              <TableCell>{METHOD_LABELS[p.method]}</TableCell>
              <TableCell>{p.reference ?? <TableEmptyValue />}</TableCell>
              {showRecordedBy && <TableCell>{p.recorded_by_name ?? <TableEmptyValue />}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
