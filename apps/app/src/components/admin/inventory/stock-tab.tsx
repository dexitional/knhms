import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { FileSpreadsheet, Minus, PackagePlus, Pencil, Plus, Search, Tags, Trash2 } from "lucide-react"
import { api, ApiError } from "#/lib/api-client"
import { cn } from "#/lib/utils"
import { LEVEL_BADGE, LEVEL_LABELS, MOVEMENT_LABELS, formatDateTime } from "#/lib/inventory"
import type { InventoryCategory, InventoryItem, InventoryMovement } from "#/lib/inventory"
import { FormField } from "#/components/form-field"
import { Badge } from "#/components/ui/badge.tsx"
import { Button } from "#/components/ui/button.tsx"
import { Input } from "#/components/ui/input.tsx"
import { Textarea } from "#/components/ui/textarea.tsx"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog.tsx"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select.tsx"
import { Table, TableBody, TableCell, TableEmptyValue, TableHead, TableHeader, TableRow } from "#/components/ui/table.tsx"
import { ImportDialog } from "./import-dialog"

const errorMessage = (fallback: string) => (err: unknown) =>
  toast.error(err instanceof ApiError ? err.message : fallback)

export const INVENTORY_KEY = ["inventory"]

// Fill of the stock bar: the minimum sits at the 25% mark, so anything
// under the line reads as low at a glance.
function StockBar({ item }: { item: InventoryItem }) {
  const scale = Math.max(item.min_quantity * 4, item.quantity, 1)
  const pct = Math.min(100, (item.quantity / scale) * 100)
  const minPct = Math.min(100, (item.min_quantity / scale) * 100)
  return (
    <div className="relative mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          item.level === "ok" ? "bg-emerald-500" : item.level === "low" ? "bg-amber-500" : "bg-rose-500",
        )}
        style={{ width: `${pct}%` }}
      />
      {item.min_quantity > 0 && <span className="absolute inset-y-0 w-0.5 bg-foreground/40" style={{ left: `${minPct}%` }} />}
    </div>
  )
}

// "all" | "none" (uncategorised) | a category id
type CategoryFilter = string

export function CategorySelect({
  value,
  onChange,
  categories,
  className,
}: {
  value: CategoryFilter
  onChange: (v: CategoryFilter) => void
  categories: Array<InventoryCategory>
  className?: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("w-48", className)} aria-label="Category">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All categories</SelectItem>
        {categories.map((c) => (
          <SelectItem key={c.id} value={String(c.id)}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function StockTab({
  items,
  categories,
  isLoading,
  canManage,
}: {
  items: Array<InventoryItem>
  categories: Array<InventoryCategory>
  isLoading: boolean
  canManage: boolean
}) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [category, setCategory] = useState<CategoryFilter>("all")
  const [managingCategories, setManagingCategories] = useState(false)
  const [importing, setImporting] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null | "new">(null)
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null)
  const invalidate = () => queryClient.invalidateQueries({ queryKey: INVENTORY_KEY })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/inventory/items/${id}`),
    onSuccess: () => {
      toast.success("Item deleted.")
      invalidate()
    },
    onError: errorMessage("Couldn't delete the item."),
  })

  const query = search.trim().toLowerCase()
  const visible = items.filter(
    (i) =>
      (showInactive || i.is_active) &&
      (category === "all" || String(i.category_id) === category) &&
      (!query || [i.name, i.description].some((f) => f?.toLowerCase().includes(query))),
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-56">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search stock..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
          <CategorySelect value={category} onChange={setCategory} categories={categories} />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive
          </label>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setManagingCategories(true)}>
              <Tags className="size-4" /> Categories
            </Button>
            <Button variant="outline" onClick={() => setImporting(true)}>
              <FileSpreadsheet className="size-4 text-emerald-600" /> Bulk upload
            </Button>
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" /> Add item
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>In stock</TableHead>
              <TableHead>Minimum</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && visible.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No stock items{query ? " match your search" : " yet"}.
                </TableCell>
              </TableRow>
            )}
            {visible.map((item) => (
              <TableRow key={item.id} className={cn(!item.is_active && "opacity-60")}>
                <TableCell>
                  <p className="font-medium text-foreground">{item.name}</p>
                  {item.description ? (
                    <p className="line-clamp-1 max-w-72 text-xs text-muted-foreground">{item.description}</p>
                  ) : null}
                </TableCell>
                <TableCell>
                  {item.category_name ? (
                    <Badge variant="outline">{item.category_name}</Badge>
                  ) : (
                    <TableEmptyValue />
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-base font-bold text-foreground">{item.quantity}</span>
                  <StockBar item={item} />
                </TableCell>
                <TableCell>{item.min_quantity}</TableCell>
                <TableCell>
                  {item.is_active ? (
                    <Badge variant={LEVEL_BADGE[item.level]}>{LEVEL_LABELS[item.level]}</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDateTime(item.updated_at)}</TableCell>
                <TableCell className="text-right">
                  {canManage && (
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => setAdjusting(item)}>
                        <PackagePlus className="size-4" /> Stock
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${item.name}`} onClick={() => setEditing(item)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${item.name}`}
                        disabled={remove.isPending}
                        onClick={() => {
                          if (confirm(`Delete "${item.name}"? Items that appear on requests can only be made inactive.`))
                            remove.mutate(item.id)
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <ItemDialog
          item={editing === "new" ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={invalidate}
        />
      )}
      {managingCategories && <CategoriesDialog categories={categories} onClose={() => setManagingCategories(false)} />}
      {importing && <ImportDialog items={items} onClose={() => setImporting(false)} />}
      {adjusting && <AdjustDialog item={adjusting} onClose={() => setAdjusting(null)} onSaved={invalidate} />}
    </div>
  )
}

const itemSchema = z.object({
  name: z.string().trim().min(2, "Required").max(150),
  description: z.string().max(500),
  categoryId: z.string(), // "none" or an id
  quantity: z.coerce.number().int().min(0, "Can't be negative").max(1_000_000),
  minQuantity: z.coerce.number().int().min(0, "Can't be negative").max(1_000_000),
  isActive: z.boolean(),
})

function ItemDialog({
  item,
  categories,
  onClose,
  onSaved,
}: {
  item: InventoryItem | null
  categories: Array<InventoryCategory>
  onClose: () => void
  onSaved: () => void
}) {
  const form = useForm<z.input<typeof itemSchema>, unknown, z.output<typeof itemSchema>>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: item?.name ?? "",
      description: item?.description ?? "",
      categoryId: item?.category_id ? String(item.category_id) : "none",
      quantity: item?.quantity ?? 0,
      minQuantity: item?.min_quantity ?? 0,
      isActive: item ? item.is_active === 1 : true,
    },
  })
  const errors = form.formState.errors
  const mutation = useMutation({
    mutationFn: (v: z.output<typeof itemSchema>) => {
      const categoryId = v.categoryId === "none" ? null : Number(v.categoryId)
      return item
        ? api.patch(`/inventory/items/${item.id}`, {
            name: v.name,
            description: v.description,
            categoryId,
            minQuantity: v.minQuantity,
            isActive: v.isActive,
          })
        : api.post("/inventory/items", {
            name: v.name,
            description: v.description,
            categoryId,
            quantity: v.quantity,
            minQuantity: v.minQuantity,
          })
    },
    onSuccess: () => {
      toast.success(item ? "Item updated." : "Item added.")
      onSaved()
      onClose()
    },
    onError: errorMessage("Couldn't save the item."),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? `Edit ${item.name}` : "Add stock item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <FormField label="Item name" error={errors.name?.message}>
            <Input placeholder="e.g. LED bulbs (18W)" {...form.register("name")} />
          </FormField>
          <FormField label="Category" hint={categories.length === 0 ? "Add categories with the Categories button" : undefined}>
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="Description (optional)">
            <Textarea rows={2} {...form.register("description")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            {item ? (
              <FormField label="In stock" hint="Change it with the Stock button so it's logged">
                <Input value={item.quantity} disabled />
              </FormField>
            ) : (
              <FormField label="Opening quantity" error={errors.quantity?.message}>
                <Input type="number" min={0} {...form.register("quantity")} />
              </FormField>
            )}
            <FormField
              label="Minimum quantity"
              hint="Alerts go out when stock drops to this level"
              error={errors.minQuantity?.message}
            >
              <Input type="number" min={0} {...form.register("minQuantity")} />
            </FormField>
          </div>
          {item && (
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4 rounded border-input" {...form.register("isActive")} />
              Active (inactive items can't be requested)
            </label>
          )}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CategoriesDialog({ categories, onClose }: { categories: Array<InventoryCategory>; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState("")
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null)
  const invalidate = () => queryClient.invalidateQueries({ queryKey: INVENTORY_KEY })

  const save = useMutation({
    mutationFn: ({ id, value }: { id?: number; value: string }) =>
      id ? api.patch(`/inventory/categories/${id}`, { name: value }) : api.post("/inventory/categories", { name: value }),
    onSuccess: (_d, { id }) => {
      toast.success(id ? "Category renamed." : "Category added.")
      setName("")
      setEditing(null)
      invalidate()
    },
    onError: errorMessage("Couldn't save the category."),
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/inventory/categories/${id}`),
    onSuccess: () => {
      toast.success("Category deleted.")
      invalidate()
    },
    onError: errorMessage("Couldn't delete the category."),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stock categories</DialogTitle>
        </DialogHeader>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim().length >= 2) save.mutate({ value: name.trim() })
          }}
        >
          <Input placeholder="New category, e.g. Cleaning supplies" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          <Button type="submit" disabled={save.isPending || name.trim().length < 2}>
            <Plus className="size-4" /> Add
          </Button>
        </form>
        <ul className="flex max-h-80 flex-col divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {categories.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted-foreground">No categories yet.</li>}
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-2 px-3 py-2">
              {editing?.id === c.id ? (
                <form
                  className="flex flex-1 gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (editing.name.trim().length >= 2) save.mutate({ id: c.id, value: editing.name.trim() })
                  }}
                >
                  <Input
                    autoFocus
                    value={editing.name}
                    maxLength={100}
                    aria-label={`Rename ${c.name}`}
                    onChange={(e) => setEditing({ id: c.id, name: e.target.value })}
                  />
                  <Button type="submit" size="sm" disabled={save.isPending}>
                    Save
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                </form>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.item_count} item{c.item_count === 1 ? "" : "s"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Rename ${c.name}`}
                    onClick={() => setEditing({ id: c.id, name: c.name })}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${c.name}`}
                    disabled={remove.isPending}
                    onClick={() => {
                      if (confirm(`Delete "${c.name}"? Its ${c.item_count} item(s) will become uncategorised.`)) remove.mutate(c.id)
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

const adjustSchema = z.object({
  mode: z.enum(["restock", "remove"]),
  amount: z.coerce.number().int().min(1, "Enter at least 1").max(1_000_000),
  note: z.string().max(255),
})

function AdjustDialog({ item, onClose, onSaved }: { item: InventoryItem; onClose: () => void; onSaved: () => void }) {
  const form = useForm<z.input<typeof adjustSchema>, unknown, z.output<typeof adjustSchema>>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { mode: "restock", amount: 1, note: "" },
  })
  const errors = form.formState.errors
  const mode = form.watch("mode")
  const amount = Number(form.watch("amount")) || 0
  const after = mode === "restock" ? item.quantity + amount : item.quantity - amount

  const mutation = useMutation({
    mutationFn: (v: z.output<typeof adjustSchema>) =>
      api.post(`/inventory/items/${item.id}/adjust`, {
        reason: v.mode === "restock" ? "restock" : "adjustment",
        change: v.mode === "restock" ? v.amount : -v.amount,
        note: v.note,
      }),
    onSuccess: () => {
      toast.success("Stock updated.")
      onSaved()
      onClose()
    },
    onError: errorMessage("Couldn't update the stock."),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update stock: {item.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Type of change">
            {(
              [
                ["restock", "Restock", "Add new stock", Plus],
                ["remove", "Remove", "Damaged, lost or recount", Minus],
              ] as const
            ).map(([value, label, hint, Icon]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                onClick={() => form.setValue("mode", value)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                  mode === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full",
                    mode === value ? "bg-primary text-white" : "bg-secondary text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="text-xs text-muted-foreground">{hint}</span>
                </span>
              </button>
            ))}
          </div>
          <FormField label="Quantity" error={errors.amount?.message}>
            <Input type="number" min={1} {...form.register("amount")} />
          </FormField>
          <FormField label="Note (optional)" hint="e.g. supplier, invoice number, or why stock was removed">
            <Input {...form.register("note")} />
          </FormField>
          <p className="rounded-lg bg-secondary/60 px-3 py-2 text-sm">
            {item.quantity} in stock →{" "}
            <span className={cn("font-bold", after < 0 ? "text-destructive" : after <= item.min_quantity ? "text-amber-600" : "text-emerald-600")}>
              {after}
            </span>
            {after >= 0 && after <= item.min_quantity && " (at or below minimum: an alert will be sent)"}
            {after < 0 && " (not enough stock)"}
          </p>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || after < 0}>
              {mutation.isPending ? "Saving..." : "Update stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function MovementsTable({ movements, isLoading }: { movements: Array<InventoryMovement>; isLoading: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Date</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Change</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>By</TableHead>
            <TableHead>Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!isLoading && movements.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                No stock movements yet.
              </TableCell>
            </TableRow>
          )}
          {movements.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="text-xs whitespace-nowrap">{formatDateTime(m.created_at)}</TableCell>
              <TableCell className="font-medium">{m.item_name}</TableCell>
              <TableCell className={cn("font-semibold", m.quantity_change > 0 ? "text-emerald-600" : "text-rose-600")}>
                {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
              </TableCell>
              <TableCell>{m.quantity_after}</TableCell>
              <TableCell>
                {MOVEMENT_LABELS[m.reason]}
                {m.request_reference && <span className="block text-xs text-muted-foreground">{m.request_reference}</span>}
              </TableCell>
              <TableCell>{m.admin_name ?? <TableEmptyValue />}</TableCell>
              <TableCell className="max-w-56 truncate text-xs">{m.note ?? <TableEmptyValue />}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
