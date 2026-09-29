import { useState } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { AlertTriangle, Ban, CheckCircle2, Clock, Eye, PackageCheck, Plus, Printer, X, XCircle } from "lucide-react"
import { api, ApiError } from "#/lib/api-client"
import { cn } from "#/lib/utils"
import { STOCK_APPROVERS, STOCK_RELEASERS, STOCK_REQUESTERS } from "#/lib/permissions"
import type { AdminRole } from "@knh/db"
import { STATUS_BADGE, STATUS_LABELS, formatDateTime } from "#/lib/inventory"
import type { InventoryItem, InventoryRequest, RequestStatus } from "#/lib/inventory"
import { FormField } from "#/components/form-field"
import { Badge } from "#/components/ui/badge.tsx"
import { Button } from "#/components/ui/button.tsx"
import { Input } from "#/components/ui/input.tsx"
import { Textarea } from "#/components/ui/textarea.tsx"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog.tsx"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select.tsx"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table.tsx"
import { INVENTORY_KEY } from "./stock-tab"

const errorMessage = (fallback: string) => (err: unknown) =>
  toast.error(err instanceof ApiError ? err.message : fallback)

export interface InventoryViewer {
  id: number
  role: AdminRole
}

// Who can do what: lib/permissions.ts
const canRequest = (v: InventoryViewer) => STOCK_REQUESTERS.includes(v.role)
const canDecide = (v: InventoryViewer) => STOCK_APPROVERS.includes(v.role)
const canRelease = (v: InventoryViewer) => STOCK_RELEASERS.includes(v.role)

const FILTERS: Array<RequestStatus | "all"> = ["all", "pending", "approved", "released", "rejected", "cancelled"]

export function openPrintForm(id: number) {
  window.open(`/print/inventory/${id}`, "_blank", "noopener")
}

const shortfall = (r: InventoryRequest) => r.items.filter((l) => l.quantity > l.in_stock)

export function RequestsTab({
  requests,
  items,
  isLoading,
  viewer,
}: {
  requests: Array<InventoryRequest>
  items: Array<InventoryItem>
  isLoading: boolean
  viewer: InventoryViewer
}) {
  const [filter, setFilter] = useState<RequestStatus | "all">(viewer.role === "stores" ? "approved" : "all")
  const [viewing, setViewing] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)

  const visible = requests.filter((r) => filter === "all" || r.status === filter)
  const current = requests.find((r) => r.id === viewing) ?? null
  const hint =
    viewer.role === "stores"
      ? "Approved requests are waiting for you to release the stock."
      : viewer.role === "super_admin"
        ? "Pending requests are waiting for your approval."
        : "Requests you've raised. The super admin approves them and the stores release the items."

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg bg-secondary p-1" role="tablist" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "all" ? "All" : STATUS_LABELS[f]}
              <span className="ml-1.5 text-xs text-muted-foreground">
                {f === "all" ? requests.length : requests.filter((r) => r.status === f).length}
              </span>
            </button>
          ))}
        </div>
        {canRequest(viewer) && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New request
          </Button>
        )}
      </div>
      <p className="-mt-2 text-sm text-muted-foreground">{hint}</p>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table className="min-w-[820px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Request</TableHead>
              <TableHead>Requested by</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last update</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && visible.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No requests here.
                </TableCell>
              </TableRow>
            )}
            {visible.map((r) => {
              const short = r.status === "approved" && shortfall(r).length > 0
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setViewing(r.id)}
                      className="font-mono text-sm font-semibold text-foreground hover:text-primary hover:underline"
                    >
                      {r.reference}
                    </button>
                    <p className="line-clamp-1 max-w-56 text-xs text-muted-foreground">{r.purpose}</p>
                  </TableCell>
                  <TableCell>
                    <p>{r.requested_by_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</p>
                  </TableCell>
                  <TableCell className="max-w-64 text-sm">
                    <p className="line-clamp-2">{r.items.map((l) => `${l.item_name} × ${l.quantity}`).join(", ")}</p>
                    {short && (
                      <p className="flex items-center gap-1 text-xs font-medium text-amber-600">
                        <AlertTriangle className="size-3" /> Not enough stock
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(r.released_at ?? r.approved_at ?? r.rejected_at ?? r.cancelled_at ?? r.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setViewing(r.id)}>
                        <Eye className="size-4" /> View
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Print ${r.reference}`}
                        title="Print request form"
                        onClick={() => openPrintForm(r.id)}
                      >
                        <Printer className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {current && <RequestDialog request={current} viewer={viewer} onClose={() => setViewing(null)} />}
      {creating && (
        <NewRequestDialog
          items={items.filter((i) => i.is_active)}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false)
            setViewing(id)
          }}
        />
      )}
    </div>
  )
}

// ---- Detail ---------------------------------------------------------------------------

function Timeline({ request }: { request: InventoryRequest }) {
  const steps: Array<{ label: string; who: string | null; at: string | null; icon: typeof Clock; tone: string }> = [
    { label: "Requested", who: request.requested_by_name, at: request.created_at, icon: Clock, tone: "bg-amber-500" },
  ]
  if (request.status === "rejected") {
    steps.push({ label: "Rejected", who: request.rejected_by_name, at: request.rejected_at, icon: XCircle, tone: "bg-rose-500" })
  } else if (request.status === "cancelled") {
    steps.push({ label: "Cancelled", who: request.requested_by_name, at: request.cancelled_at, icon: Ban, tone: "bg-slate-400" })
  } else {
    steps.push(
      { label: "Approved", who: request.approved_by_name, at: request.approved_at, icon: CheckCircle2, tone: "bg-blue-500" },
      { label: "Released", who: request.released_by_name, at: request.released_at, icon: PackageCheck, tone: "bg-emerald-500" },
    )
  }
  return (
    <ol className="flex flex-col gap-0">
      {steps.map((step, i) => {
        const done = !!step.at
        return (
          <li key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 && (
              <span className={cn("absolute top-8 left-[15px] h-[calc(100%-2rem)] w-0.5", done ? "bg-border" : "bg-border/50")} />
            )}
            <span
              className={cn(
                "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-white",
                done ? step.tone : "bg-secondary text-muted-foreground",
              )}
            >
              <step.icon className="size-4" />
            </span>
            <div className="pt-0.5 text-sm">
              <p className={cn("font-semibold", done ? "text-foreground" : "text-muted-foreground")}>{step.label}</p>
              <p className="text-xs text-muted-foreground">
                {done ? `${step.who ?? "Unknown"} · ${formatDateTime(step.at)}` : "Waiting"}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function RequestDialog({ request, viewer, onClose }: { request: InventoryRequest; viewer: InventoryViewer; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [note, setNote] = useState("")
  const [rejecting, setRejecting] = useState(false)
  const short = shortfall(request)

  const act = useMutation({
    mutationFn: ({ action, body }: { action: "approve" | "reject" | "release" | "cancel"; body?: object }) =>
      api.post(`/inventory/requests/${request.id}/${action}`, body ?? {}),
    onSuccess: (_data, { action }) => {
      toast.success(
        { approve: "Request approved.", reject: "Request rejected.", release: "Stock released.", cancel: "Request cancelled." }[action],
      )
      setRejecting(false)
      setNote("")
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEY })
    },
    onError: errorMessage("Couldn't update the request."),
  })

  const pendingDecision = request.status === "pending" && canDecide(viewer)
  const releasable = request.status === "approved" && canRelease(viewer)
  const cancellable = request.status === "pending" && request.requested_by === viewer.id

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{request.reference}</span>
            <Badge variant={STATUS_BADGE[request.status]}>{STATUS_LABELS[request.status]}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-[1fr_220px]">
          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Purpose</p>
              <p className="mt-1 text-sm text-foreground">{request.purpose}</p>
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 text-right font-medium">Requested</th>
                    <th className="px-3 py-2 text-right font-medium">In stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {request.items.map((l) => {
                    const lacking = request.status !== "released" && l.quantity > l.in_stock
                    return (
                      <tr key={l.item_id}>
                        <td className="px-3 py-2">{l.item_name}</td>
                        <td className="px-3 py-2 text-right font-semibold">{l.quantity}</td>
                        <td className={cn("px-3 py-2 text-right", lacking ? "font-semibold text-rose-600" : "text-muted-foreground")}>
                          {l.in_stock}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {request.decision_note && (
              <p className="rounded-lg border-l-4 border-primary bg-primary/5 px-3 py-2 text-sm">
                <span className="font-semibold">Note: </span>
                {request.decision_note}
              </p>
            )}
            {(request.status === "pending" || request.status === "approved") && short.length > 0 && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                Not enough stock for {short.map((l) => l.item_name).join(", ")}. It must be restocked before release.
              </p>
            )}
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">Progress</p>
            <Timeline request={request} />
          </div>
        </div>

        {pendingDecision && (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <FormField label={rejecting ? "Reason for rejecting" : "Note (optional)"}>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </FormField>
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => openPrintForm(request.id)}>
            <Printer className="size-4" /> Print form
          </Button>
          {cancellable && (
            <Button
              variant="ghost"
              disabled={act.isPending}
              onClick={() => {
                if (confirm("Cancel this request?")) act.mutate({ action: "cancel" })
              }}
            >
              <X className="size-4" /> Cancel request
            </Button>
          )}
          {pendingDecision &&
            (rejecting ? (
              <>
                <Button variant="ghost" onClick={() => setRejecting(false)}>
                  Back
                </Button>
                <Button
                  variant="destructive"
                  disabled={act.isPending || note.trim().length < 3}
                  onClick={() => act.mutate({ action: "reject", body: { note } })}
                >
                  <XCircle className="size-4" /> Confirm rejection
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" disabled={act.isPending} onClick={() => setRejecting(true)}>
                  <XCircle className="size-4" /> Reject
                </Button>
                <Button disabled={act.isPending} onClick={() => act.mutate({ action: "approve", body: { note } })}>
                  <CheckCircle2 className="size-4" /> Approve
                </Button>
              </>
            ))}
          {releasable && (
            <Button
              disabled={act.isPending || short.length > 0}
              onClick={() => {
                if (confirm("Release these items? Stock will be deducted.")) act.mutate({ action: "release" })
              }}
            >
              <PackageCheck className="size-4" /> Release stock
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- New request ------------------------------------------------------------------------

const newRequestSchema = z
  .object({
    purpose: z.string().trim().min(3, "Say what the items are for").max(500),
    items: z
      .array(
        z.object({
          itemId: z.coerce.number().int().positive("Choose an item"),
          quantity: z.coerce.number().int().min(1, "At least 1").max(1_000_000),
        }),
      )
      .min(1, "Add at least one item"),
  })
  .refine((v) => new Set(v.items.map((i) => i.itemId)).size === v.items.length, {
    message: "Each item can only appear once.",
    path: ["items"],
  })

function NewRequestDialog({
  items,
  onClose,
  onCreated,
}: {
  items: Array<InventoryItem>
  onClose: () => void
  onCreated: (id: number) => void
}) {
  const queryClient = useQueryClient()
  const form = useForm<z.input<typeof newRequestSchema>, unknown, z.output<typeof newRequestSchema>>({
    resolver: zodResolver(newRequestSchema),
    defaultValues: { purpose: "", items: [{ itemId: 0, quantity: 1 }] },
  })
  const errors = form.formState.errors
  const lines = useFieldArray({ control: form.control, name: "items" })
  const watched = form.watch("items")

  const mutation = useMutation({
    mutationFn: (v: z.output<typeof newRequestSchema>) =>
      api.post<{ request: InventoryRequest }>("/inventory/requests", v),
    onSuccess: ({ request }) => {
      toast.success(`${request.reference} submitted for approval.`)
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEY })
      onCreated(request.id)
    },
    onError: errorMessage("Couldn't submit the request."),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New stock request</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <FormField label="Purpose" error={errors.purpose?.message} hint="What the items are for, e.g. Block B corridor lights">
            <Textarea rows={2} {...form.register("purpose")} />
          </FormField>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Items</legend>
            {lines.fields.map((field, i) => {
              const chosen = items.find((it) => it.id === Number(watched[i]?.itemId))
              const qty = Number(watched[i]?.quantity) || 0
              return (
                <div key={field.id} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <Controller
                      control={form.control}
                      name={`items.${i}.itemId`}
                      render={({ field: f }) => (
                        <Select value={f.value ? String(f.value) : ""} onValueChange={(v) => f.onChange(Number(v))}>
                          <SelectTrigger className="w-full" aria-label="Item" aria-invalid={Boolean(errors.items?.[i]?.itemId)}>
                            <SelectValue placeholder="Choose an item" />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map((it) => (
                              <SelectItem key={it.id} value={String(it.id)}>
                                {it.name} <span className="text-muted-foreground">({it.quantity} in stock)</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {chosen && qty > chosen.quantity && (
                      <p className="mt-1 text-xs text-amber-600">
                        Only {chosen.quantity} in stock. You can still request it; it'll be released after restocking.
                      </p>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    className="w-24"
                    aria-label="Quantity"
                    aria-invalid={Boolean(errors.items?.[i]?.quantity)}
                    {...form.register(`items.${i}.quantity`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="mt-1"
                    aria-label={`Remove line ${i + 1}`}
                    disabled={lines.fields.length === 1}
                    onClick={() => lines.remove(i)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              )
            })}
            {(errors.items?.message || errors.items?.root?.message) && (
              <p className="text-xs text-destructive">{errors.items.message ?? errors.items.root?.message}</p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => lines.append({ itemId: 0, quantity: 1 })}
            >
              <Plus className="size-4" /> Add item
            </Button>
          </fieldset>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Submitting..." : "Submit request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
