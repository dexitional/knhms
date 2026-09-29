import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, Ban, CheckCircle2, KeyRound, Plus, XCircle } from "lucide-react"
import { api, ApiError } from "#/lib/api-client"
import { formatCedis } from "#/lib/market"
import { METHOD_LABELS, SELLER_TYPE_LABELS, STATUS_BADGE, STATUS_LABELS, formatDate } from "#/lib/sellers"
import type { BillingSummary, Seller, SellerPayment } from "#/lib/sellers"
import { FormField } from "#/components/form-field"
import { BillingSummaryCard, PaymentHistoryTable } from "#/components/seller-billing"
import { SellerLogo } from "#/components/seller-logo"
import { Badge } from "#/components/ui/badge.tsx"
import { Button } from "#/components/ui/button.tsx"
import { Input } from "#/components/ui/input.tsx"
import { Textarea } from "#/components/ui/textarea.tsx"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog.tsx"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select.tsx"
import { canManage } from "#/lib/permissions"

export const Route = createFileRoute("/admin/_admin/sellers/$sellerId")({
  component: SellerDetailPage,
})

interface SellerDetail {
  seller: Seller & { reviewed_by_name: string | null }
  billing: BillingSummary
  payments: Array<SellerPayment>
  listingCount: number
}

type StatusAction = "approved" | "rejected" | "suspended"

const errorMessage = (fallback: string) => (err: unknown) =>
  toast.error(err instanceof ApiError ? err.message : fallback)

function SellerDetailPage() {
  const { sellerId } = Route.useParams()
  const { admin } = Route.useRouteContext()
  const canEdit = canManage(admin.role, "sellers")
  const queryClient = useQueryClient()
  const [statusDialog, setStatusDialog] = useState<StatusAction | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)

  const queryKey = ["sellers", sellerId]
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => api.get<SellerDetail>(`/sellers/${sellerId}`),
  })

  const onDetail = (detail: SellerDetail) => {
    queryClient.setQueryData(queryKey, detail)
    queryClient.invalidateQueries({ queryKey: ["sellers"], exact: true })
  }

  const resetMutation = useMutation({
    mutationFn: () => api.post<{ phone: string }>(`/sellers/${sellerId}/reset-password`),
    onSuccess: (r) => toast.success(`New password sent by SMS to ${r.phone}.`, { duration: 5000 }),
    onError: errorMessage("Couldn't reset the password."),
  })

  if (isLoading) return <p className="text-muted-foreground">Loading...</p>
  if (error || !data) return <p className="text-destructive">{error instanceof Error ? error.message : "Not found."}</p>

  const { seller, billing, payments, listingCount } = data
  const isBusiness = seller.seller_type === "business"

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/admin/sellers">
          <ArrowLeft className="size-4" />
          Back to Sellers
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <SellerLogo logoUrl={seller.logo_url} name={seller.business_name} className="size-16 text-lg" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{seller.business_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={STATUS_BADGE[seller.status]}>{STATUS_LABELS[seller.status]}</Badge>
              <span>{SELLER_TYPE_LABELS[seller.seller_type]}</span>
              <span>· Applied {formatDate(seller.created_at)}</span>
            </div>
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {seller.status === "pending" && (
              <>
                <Button onClick={() => setStatusDialog("approved")}>
                  <CheckCircle2 className="size-4" /> Approve
                </Button>
                <Button variant="outline" onClick={() => setStatusDialog("rejected")}>
                  <XCircle className="size-4" /> Reject
                </Button>
              </>
            )}
            {seller.status === "approved" && (
              <Button variant="outline" onClick={() => setStatusDialog("suspended")}>
                <Ban className="size-4" /> Suspend
              </Button>
            )}
            {(seller.status === "suspended" || seller.status === "rejected") && (
              <Button onClick={() => setStatusDialog("approved")}>
                <CheckCircle2 className="size-4" /> {seller.status === "suspended" ? "Reinstate" : "Approve"}
              </Button>
            )}
            <Button
              variant="ghost"
              disabled={resetMutation.isPending}
              onClick={() => {
                if (confirm(`Reset ${seller.owner_name}'s password? A new one will be sent by SMS to ${seller.phone}.`))
                  resetMutation.mutate()
              }}
            >
              <KeyRound className="size-4" /> Reset password
            </Button>
          </div>
        )}
      </div>

      {seller.status_reason && (
        <p className="rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm">
          <span className="font-medium">{STATUS_LABELS[seller.status]} reason:</span> {seller.status_reason}
          {seller.reviewed_by_name && (
            <span className="text-muted-foreground">
              {" "}
              — {seller.reviewed_by_name}, {formatDate(seller.reviewed_at)}
            </span>
          )}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-foreground">Details</h2>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            {(
              [
                ["Owner", seller.owner_name],
                ["Email", seller.email],
                ["Phone", seller.phone],
                ["Location", seller.location ?? "—"],
                ["About", seller.description ?? "—"],
                [isBusiness ? "Products" : "Menu items", String(listingCount)],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium break-words text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          <Link
            to="/admin/e-market"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            Moderate listings in E-Market →
          </Link>
        </div>
        <div className="flex flex-col gap-4 lg:col-span-2">
          <BillingSummaryCard billing={billing} />
          {canEdit && seller.status !== "rejected" && (
            <>
              <FeeWaivers seller={seller} onDone={onDetail} />
              {!(billing.registrationPaid && billing.monthlyWaived) && (
                <Button className="w-fit" onClick={() => setPaymentOpen(true)}>
                  <Plus className="size-4" /> Record payment
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-foreground">Payment history</h2>
        <PaymentHistoryTable payments={payments} showRecordedBy />
      </section>

      {statusDialog && (
        <StatusDialog
          action={statusDialog}
          seller={seller}
          onClose={() => setStatusDialog(null)}
          onDone={(detail) => {
            onDetail(detail)
            setStatusDialog(null)
          }}
        />
      )}
      {paymentOpen && (
        <PaymentDialog
          seller={seller}
          billing={billing}
          onClose={() => setPaymentOpen(false)}
          onDone={(detail) => {
            onDetail(detail)
            setPaymentOpen(false)
          }}
        />
      )}
    </div>
  )
}

const ACTION_COPY: Record<StatusAction, { title: string; button: string; needsReason: boolean }> = {
  approved: { title: "Approve seller", button: "Approve", needsReason: false },
  rejected: { title: "Reject application", button: "Reject", needsReason: true },
  suspended: { title: "Suspend seller", button: "Suspend", needsReason: true },
}

function StatusDialog({
  action,
  seller,
  onClose,
  onDone,
}: {
  action: StatusAction
  seller: Seller
  onClose: () => void
  onDone: (detail: SellerDetail) => void
}) {
  const [reason, setReason] = useState("")
  const [waiveRegistration, setWaiveRegistration] = useState(seller.registration_fee_waived === 1)
  const [waiveMonthly, setWaiveMonthly] = useState(seller.monthly_fee_waived === 1)
  const copy = ACTION_COPY[action]
  // Waivers are offered when approving a new (or previously rejected) seller.
  const offersWaivers = action === "approved" && seller.status !== "suspended"
  const mutation = useMutation({
    mutationFn: () =>
      api.post<SellerDetail>(`/sellers/${seller.id}/status`, {
        status: action,
        reason: copy.needsReason ? reason : undefined,
        ...(offersWaivers && { registrationFeeWaived: waiveRegistration, monthlyFeeWaived: waiveMonthly }),
      }),
    onSuccess: (detail) => {
      toast.success(`${seller.business_name} ${action === "approved" ? "approved" : action}.`)
      onDone(detail)
    },
    onError: errorMessage("Couldn't update the seller."),
  })

  const approveBody =
    seller.status === "suspended"
      ? "Their listings will be visible on the E-Market again."
      : `Their listings will go live on the E-Market${waiveMonthly ? "." : ", and monthly billing starts today."}`

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {seller.status === "suspended" && action === "approved" ? "Reinstate seller" : copy.title} —{" "}
            {seller.business_name}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
          className="flex flex-col gap-4"
        >
          {copy.needsReason ? (
            <FormField label="Reason" hint="Sent to the seller by SMS and shown in their portal">
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} />
            </FormField>
          ) : (
            <p className="text-sm text-muted-foreground">{approveBody} The seller will get an SMS.</p>
          )}
          {offersWaivers && (
            <fieldset className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <legend className="px-1 text-sm font-medium">Fee waivers (optional)</legend>
              <WaiverCheckbox
                label="Waive registration fee"
                checked={waiveRegistration}
                disabled={seller.registration_paid_at != null}
                hint={seller.registration_paid_at != null ? "Already paid" : undefined}
                onChange={setWaiveRegistration}
              />
              <WaiverCheckbox label="Waive monthly fee" checked={waiveMonthly} onChange={setWaiveMonthly} />
            </fieldset>
          )}
          {action === "suspended" && (
            <p className="text-sm text-muted-foreground">Their listings will be hidden from the E-Market.</p>
          )}
          <DialogFooter>
            <Button
              type="submit"
              variant={action === "approved" ? "default" : "destructive"}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Saving..." : seller.status === "suspended" && action === "approved" ? "Reinstate" : copy.button}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const paymentSchema = z.object({
  kind: z.enum(["registration", "monthly"]),
  months: z.coerce.number().int().min(1).max(24),
  amount: z.coerce.number().positive("Enter the amount received"),
  method: z.enum(["momo", "cash", "bank", "other"]),
  reference: z.string().max(100),
  note: z.string().max(255),
})
type PaymentInput = z.input<typeof paymentSchema>
type PaymentValues = z.output<typeof paymentSchema>

function PaymentDialog({
  seller,
  billing,
  onClose,
  onDone,
}: {
  seller: Seller
  billing: BillingSummary
  onClose: () => void
  onDone: (detail: SellerDetail) => void
}) {
  const registrationDue = !billing.registrationPaid
  const monthlyBillable = !billing.monthlyWaived
  const form = useForm<PaymentInput, unknown, PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      kind: registrationDue ? "registration" : "monthly",
      months: 1,
      amount: registrationDue ? billing.registrationFee : billing.monthlyFee,
      method: "momo",
      reference: "",
      note: "",
    },
  })
  const errors = form.formState.errors
  const kind = form.watch("kind")

  const mutation = useMutation({
    mutationFn: (values: PaymentValues) =>
      api.post<SellerDetail>(`/sellers/${seller.id}/payments`, {
        ...values,
        months: values.kind === "monthly" ? values.months : undefined,
      }),
    onSuccess: (detail) => {
      toast.success("Payment recorded.")
      onDone(detail)
    },
    onError: errorMessage("Couldn't record the payment."),
  })

  // Keep the suggested amount in step with what's being paid for.
  const suggest = (nextKind: PaymentValues["kind"], months: number) =>
    form.setValue("amount", nextKind === "registration" ? billing.registrationFee : billing.monthlyFee * months)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment — {seller.business_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Payment for">
              <Controller
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v)
                      suggest(v as PaymentValues["kind"], Number(form.getValues("months")) || 1)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="registration" disabled={!registrationDue}>
                        Registration fee{registrationDue ? "" : billing.registrationWaived ? " (waived)" : " (paid)"}
                      </SelectItem>
                      <SelectItem value="monthly" disabled={!monthlyBillable}>
                        Monthly fee{monthlyBillable ? "" : " (waived)"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            {kind === "monthly" && (
              <FormField label="Months covered" error={errors.months?.message}>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  {...form.register("months", { onChange: (e) => suggest("monthly", Number(e.target.value) || 1) })}
                />
              </FormField>
            )}
            <FormField label="Amount received (GH₵)" error={errors.amount?.message}>
              <Input type="number" step="0.01" min="0" {...form.register("amount")} />
            </FormField>
            <FormField label="Method">
              <Controller
                control={form.control}
                name="method"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(METHOD_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Reference (optional)" hint="MoMo transaction ID or receipt no.">
              <Input {...form.register("reference")} />
            </FormField>
            <FormField label="Note (optional)" className="sm:col-span-2">
              <Input {...form.register("note")} />
            </FormField>
          </div>
          {kind === "monthly" && (
            <p className="text-xs text-muted-foreground">
              {billing.paidUntil
                ? `Extends from their current paid-up date (${formatDate(billing.paidUntil)}) if it hasn't lapsed, otherwise from today.`
                : "Coverage starts today."}{" "}
              Standard fee: {formatCedis(billing.monthlyFee)}/month.
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function WaiverCheckbox({
  label,
  checked,
  disabled = false,
  hint,
  onChange,
}: {
  label: string
  checked: boolean
  disabled?: boolean
  hint?: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium has-disabled:cursor-not-allowed has-disabled:opacity-60">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
      {hint && <span className="text-xs font-normal text-muted-foreground">({hint})</span>}
    </label>
  )
}

// Per-seller fee waivers; each change saves immediately.
function FeeWaivers({ seller, onDone }: { seller: Seller; onDone: (detail: SellerDetail) => void }) {
  const registrationPaid = seller.registration_paid_at != null
  const mutation = useMutation({
    mutationFn: (body: { registrationFeeWaived?: boolean; monthlyFeeWaived?: boolean }) =>
      api.put<SellerDetail>(`/sellers/${seller.id}/waivers`, body),
    onSuccess: (detail) => {
      toast.success("Fee waivers updated.")
      onDone(detail)
    },
    onError: errorMessage("Couldn't update the fee waivers."),
  })

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold text-foreground">Fee waivers</h2>
      <p className="text-sm text-muted-foreground">
        Optional. A waived fee isn't charged to this seller. Lifting the monthly waiver starts billing from today.
      </p>
      <div className="mt-3 flex flex-wrap gap-6">
        <WaiverCheckbox
          label="Waive registration fee"
          checked={seller.registration_fee_waived === 1}
          disabled={mutation.isPending || (registrationPaid && seller.registration_fee_waived !== 1)}
          hint={registrationPaid && seller.registration_fee_waived !== 1 ? "already paid" : undefined}
          onChange={(checked) => mutation.mutate({ registrationFeeWaived: checked })}
        />
        <WaiverCheckbox
          label="Waive monthly fee"
          checked={seller.monthly_fee_waived === 1}
          disabled={mutation.isPending}
          onChange={(checked) => mutation.mutate({ monthlyFeeWaived: checked })}
        />
      </div>
    </div>
  )
}
