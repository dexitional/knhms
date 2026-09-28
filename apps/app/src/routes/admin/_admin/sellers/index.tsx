import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Pencil, Search } from "lucide-react"
import { api, ApiError } from "#/lib/api-client"
import { formatCedis } from "#/lib/market"
import {
  BILLING_BADGE,
  BILLING_LABELS,
  SELLER_TYPE_LABELS,
  STATUS_BADGE,
  STATUS_LABELS,
  formatDate,
} from "#/lib/sellers"
import type { BillingSettings, BillingSummary, Seller, SellerStatus } from "#/lib/sellers"
import { cn } from "#/lib/utils"
import { FormField } from "#/components/form-field"
import { Badge } from "#/components/ui/badge.tsx"
import { Button } from "#/components/ui/button.tsx"
import { Input } from "#/components/ui/input.tsx"
import { Textarea } from "#/components/ui/textarea.tsx"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table.tsx"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog.tsx"

export const Route = createFileRoute("/admin/_admin/sellers/")({
  component: SellersPage,
})

type SellerWithBilling = Seller & { billing: BillingSummary }

const FILTERS: Array<[SellerStatus | "all" | "overdue", string]> = [
  ["pending", "Applications"],
  ["approved", "Approved"],
  ["overdue", "Overdue"],
  ["suspended", "Suspended"],
  ["rejected", "Rejected"],
  ["all", "All"],
]

function SellersPage() {
  const { admin } = Route.useRouteContext()
  const canEdit = admin.role === "super_admin" || admin.role === "admin"
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("pending")
  const [search, setSearch] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["sellers"],
    queryFn: () => api.get<{ sellers: Array<SellerWithBilling> }>("/sellers"),
  })
  const sellers = data?.sellers ?? []

  const count = (f: (typeof FILTERS)[number][0]) =>
    f === "all"
      ? sellers.length
      : f === "overdue"
        ? sellers.filter((s) => s.billing.state === "overdue").length
        : sellers.filter((s) => s.status === f).length

  const query = search.trim().toLowerCase()
  const visible = sellers.filter(
    (s) =>
      (filter === "all" || (filter === "overdue" ? s.billing.state === "overdue" : s.status === filter)) &&
      (!query || [s.business_name, s.owner_name, s.email, s.phone].some((f) => f.toLowerCase().includes(query))),
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sellers</h1>
        <p className="text-sm text-muted-foreground">
          Businesses and food vendors who sell on the E-Market. Review applications, record payments, and manage
          fees.
        </p>
      </div>

      <FeesCard canEdit={canEdit} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg bg-secondary p-1" role="tablist">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filter === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              <span className="ml-1.5 text-xs text-muted-foreground">{count(value)}</span>
            </button>
          ))}
        </div>
        <div className="relative w-56">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading && <p className="px-6 py-4 text-muted-foreground">Loading...</p>}
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Business</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead>Applied</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && visible.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No sellers here.
                </TableCell>
              </TableRow>
            )}
            {visible.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Link
                    to="/admin/sellers/$sellerId"
                    params={{ sellerId: String(s.id) }}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {s.business_name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{s.owner_name}</p>
                </TableCell>
                <TableCell>{SELLER_TYPE_LABELS[s.seller_type]}</TableCell>
                <TableCell>
                  <p>{s.phone}</p>
                  <p className="text-xs text-muted-foreground">{s.email}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[s.status]}>{STATUS_LABELS[s.status]}</Badge>
                </TableCell>
                <TableCell>
                  {s.billing.state !== "not_applicable" && (
                    <Badge variant={BILLING_BADGE[s.billing.state]}>
                      {BILLING_LABELS[s.billing.state]}
                      {s.billing.state === "overdue" && ` · ${s.billing.daysOverdue}d`}
                    </Badge>
                  )}
                  {s.billing.amountDue > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">Due {formatCedis(s.billing.amountDue)}</p>
                  )}
                </TableCell>
                <TableCell>{formatDate(s.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ---- Fees ---------------------------------------------------------------------

const fee = z.coerce.number().min(0, "Can't be negative").max(1_000_000)
const feesSchema = z.object({
  businessRegistrationFee: fee,
  businessMonthlyFee: fee,
  foodVendorRegistrationFee: fee,
  foodVendorMonthlyFee: fee,
  paymentInstructions: z.string().max(1000),
})
type FeesInput = z.input<typeof feesSchema>
type FeesValues = z.output<typeof feesSchema>

function FeesCard({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const { data } = useQuery({
    queryKey: ["sellers", "settings"],
    queryFn: () => api.get<{ settings: BillingSettings }>("/sellers/settings"),
  })
  const settings = data?.settings

  const form = useForm<FeesInput, unknown, FeesValues>({ resolver: zodResolver(feesSchema) })
  const errors = form.formState.errors

  const mutation = useMutation({
    mutationFn: (values: FeesValues) => api.put("/sellers/settings", values),
    onSuccess: () => {
      toast.success("Fees updated.")
      queryClient.invalidateQueries({ queryKey: ["sellers"] })
      setOpen(false)
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't update fees."),
  })

  const openEdit = () => {
    if (!settings) return
    form.reset({ ...settings, paymentInstructions: settings.paymentInstructions ?? "" })
    setOpen(true)
  }

  const fees: Array<[string, number | undefined]> = [
    ["Business — registration", settings?.businessRegistrationFee],
    ["Business — monthly", settings?.businessMonthlyFee],
    ["Food vendor — registration", settings?.foodVendorRegistrationFee],
    ["Food vendor — monthly", settings?.foodVendorMonthlyFee],
  ]

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-foreground">Seller fees</h2>
          <p className="text-sm text-muted-foreground">Changes apply to all sellers of that type from now on.</p>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={openEdit} disabled={!settings}>
            <Pencil className="size-4" />
            Edit fees
          </Button>
        )}
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
        {fees.map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-lg font-bold text-foreground">
              {value == null ? "—" : value === 0 ? "Free" : formatCedis(value)}
            </dd>
          </div>
        ))}
      </dl>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seller fees</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Business registration (GH₵)" error={errors.businessRegistrationFee?.message}>
                <Input type="number" step="0.01" min="0" {...form.register("businessRegistrationFee")} />
              </FormField>
              <FormField label="Business monthly (GH₵)" error={errors.businessMonthlyFee?.message}>
                <Input type="number" step="0.01" min="0" {...form.register("businessMonthlyFee")} />
              </FormField>
              <FormField label="Food vendor registration (GH₵)" error={errors.foodVendorRegistrationFee?.message}>
                <Input type="number" step="0.01" min="0" {...form.register("foodVendorRegistrationFee")} />
              </FormField>
              <FormField label="Food vendor monthly (GH₵)" error={errors.foodVendorMonthlyFee?.message}>
                <Input type="number" step="0.01" min="0" {...form.register("foodVendorMonthlyFee")} />
              </FormField>
            </div>
            <p className="text-xs text-muted-foreground">Set a fee to 0 to waive it.</p>
            <FormField label="Payment instructions" hint="Shown to sellers on their Billing page">
              <Textarea
                rows={4}
                placeholder="e.g. Pay by MoMo to 024 000 0000 (KNH Hall Office). Use your business name as the reference."
                {...form.register("paymentInstructions")}
              />
            </FormField>
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save Fees"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
