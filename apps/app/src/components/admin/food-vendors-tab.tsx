import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ListOrdered, Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react"
import { api, ApiError } from "#/lib/api-client"
import { FileUploadField } from "#/components/file-upload-field"
import { FormField } from "#/components/form-field"
import { MenuManager } from "#/components/menu-manager"
import type { MenuItem } from "#/components/menu-manager"
import { Button } from "#/components/ui/button.tsx"
import { Badge } from "#/components/ui/badge.tsx"
import { Input } from "#/components/ui/input.tsx"
import { Textarea } from "#/components/ui/textarea.tsx"
import {
  Table,
  TableBody,
  TableCell,
  TableEmptyValue,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table.tsx"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx"

interface Vendor {
  id: number
  name: string
  cuisine: string | null
  description: string | null
  logo_url: string | null
  phone: string | null
  location: string | null
  opening_hours: string | null
  delivers: 0 | 1
  is_open: 0 | 1
  sort_order: number
  is_active: 0 | 1
  menu: Array<MenuItem>
}

const QUERY_KEY = ["food", "vendors"]

const errorMessage = (fallback: string) => (err: unknown) =>
  toast.error(err instanceof ApiError ? err.message : fallback)

export function FoodVendorsTab({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient()
  const [vendorDialog, setVendorDialog] = useState<{ open: boolean; editing: Vendor | null }>({
    open: false,
    editing: null,
  })
  const [menuVendorId, setMenuVendorId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<{ vendors: Array<Vendor> }>("/food/vendors"),
  })
  const vendors = data?.vendors ?? []
  const menuVendor = vendors.find((v) => v.id === menuVendorId) ?? null

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })

  const patchMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => api.patch(`/food/vendors/${id}`, body),
    onSuccess: invalidate,
    onError: errorMessage("Couldn't update the vendor."),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/food/vendors/${id}`),
    onSuccess: () => {
      toast.success("Vendor deleted.")
      invalidate()
    },
    onError: errorMessage("Couldn't delete the vendor."),
  })

  return (
    <>
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => setVendorDialog({ open: true, editing: null })}>
            <Plus className="size-4" />
            Add Vendor
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading && <p className="px-6 py-4 text-muted-foreground">Loading...</p>}
        <Table className="min-w-[880px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Vendor</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Menu</TableHead>
              <TableHead>Now</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && vendors.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No food vendors yet.
                </TableCell>
              </TableRow>
            )}
            {vendors.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {v.logo_url ? (
                      <img src={v.logo_url} alt="" className="size-10 rounded-md border border-border bg-white object-contain" />
                    ) : (
                      <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <UtensilsCrossed className="size-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{v.name}</p>
                      <p className="text-xs text-muted-foreground">{v.cuisine ?? "—"}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="max-w-48 truncate">{v.location ?? <TableEmptyValue />}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => setMenuVendorId(v.id)}>
                    <ListOrdered className="size-4" />
                    {v.menu.length} item{v.menu.length === 1 ? "" : "s"}
                  </Button>
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    disabled={!canEdit || patchMutation.isPending}
                    onClick={() => patchMutation.mutate({ id: v.id, body: { isOpen: !v.is_open } })}
                    title={canEdit ? "Click to toggle" : undefined}
                    className="disabled:cursor-default"
                  >
                    <Badge variant={v.is_open ? "success" : "secondary"}>{v.is_open ? "Open" : "Closed"}</Badge>
                  </button>
                </TableCell>
                <TableCell>
                  <Badge variant={v.is_active ? "success" : "danger"}>{v.is_active ? "Visible" : "Hidden"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {canEdit && (
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={patchMutation.isPending}
                        onClick={() => patchMutation.mutate({ id: v.id, body: { isActive: !v.is_active } })}
                      >
                        {v.is_active ? "Hide" : "Show"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${v.name}`}
                        title="Edit vendor"
                        onClick={() => setVendorDialog({ open: true, editing: v })}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${v.name}`}
                        title="Delete vendor"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (confirm(`Delete ${v.name} and its ${v.menu.length} menu item(s)? This can't be undone.`))
                            deleteMutation.mutate(v.id)
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
      <p className="text-xs text-muted-foreground">
        Click Open/Closed to update a vendor's status for the day. Hidden vendors don't appear on the E-Market.
      </p>

      {vendorDialog.open && (
        // Keyed so the form's defaults reload for each vendor.
        <VendorDialog
          key={vendorDialog.editing?.id ?? "new"}
          editing={vendorDialog.editing}
          onClose={() => setVendorDialog({ open: false, editing: null })}
          onSaved={invalidate}
        />
      )}
      <MenuDialog vendor={menuVendor} canEdit={canEdit} onClose={() => setMenuVendorId(null)} onChanged={invalidate} />
    </>
  )
}

// ---- Vendor form ------------------------------------------------------------

const vendorSchema = z.object({
  name: z.string().trim().min(2, "Required").max(150),
  cuisine: z.string().max(100),
  description: z.string().max(500),
  logoUrl: z.string().url().optional(),
  phone: z.string().max(30),
  location: z.string().max(255),
  openingHours: z.string().max(150),
  delivers: z.boolean(),
  isOpen: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  isActive: z.boolean(),
})
type VendorFormInput = z.input<typeof vendorSchema>
type VendorFormValues = z.output<typeof vendorSchema>

const EMPTY_VENDOR: VendorFormInput = {
  name: "",
  cuisine: "",
  description: "",
  logoUrl: undefined,
  phone: "",
  location: "",
  openingHours: "",
  delivers: false,
  isOpen: true,
  sortOrder: 0,
  isActive: true,
}

function VendorDialog({
  editing,
  onClose,
  onSaved,
}: {
  editing: Vendor | null
  onClose: () => void
  onSaved: () => void
}) {
  const form = useForm<VendorFormInput, unknown, VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: editing
      ? {
          name: editing.name,
          cuisine: editing.cuisine ?? "",
          description: editing.description ?? "",
          logoUrl: editing.logo_url ?? undefined,
          phone: editing.phone ?? "",
          location: editing.location ?? "",
          openingHours: editing.opening_hours ?? "",
          delivers: editing.delivers === 1,
          isOpen: editing.is_open === 1,
          sortOrder: editing.sort_order,
          isActive: editing.is_active === 1,
        }
      : EMPTY_VENDOR,
  })

  const saveMutation = useMutation({
    mutationFn: (values: VendorFormValues) => {
      const body = { ...values, logoUrl: values.logoUrl ?? "" }
      return editing ? api.patch(`/food/vendors/${editing.id}`, body) : api.post("/food/vendors", body)
    },
    onSuccess: () => {
      toast.success(editing ? "Vendor updated." : "Vendor added.")
      onSaved()
      onClose()
    },
    onError: errorMessage("Couldn't save the vendor."),
  })

  const errors = form.formState.errors

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit — ${editing.name}` : "Add Food Vendor"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Vendor Name" error={errors.name?.message}>
              <Input {...form.register("name")} />
            </FormField>
            <FormField label="Cuisine / Speciality">
              <Input placeholder="e.g. Local dishes, Grills, Juices" {...form.register("cuisine")} />
            </FormField>
            <FormField label="Description" className="sm:col-span-2">
              <Textarea rows={2} {...form.register("description")} />
            </FormField>
            <FormField label="Phone / WhatsApp" hint="Customers order on this number">
              <Input placeholder="e.g. 024 123 4567" {...form.register("phone")} />
            </FormField>
            <FormField label="Location">
              <Input placeholder="e.g. KNH Back Gate" {...form.register("location")} />
            </FormField>
            <FormField label="Opening Hours">
              <Input placeholder="e.g. Mon–Sat: 7AM–9PM" {...form.register("openingHours")} />
            </FormField>
            <FormField label="Display Order" hint="Lower numbers appear first">
              <Input type="number" min={0} {...form.register("sortOrder")} />
            </FormField>
          </div>
          <FileUploadField
            label="Logo (optional)"
            helpText="JPEG, PNG, or WebP. Shown uncropped on white."
            folder="market-images"
            value={form.watch("logoUrl")}
            onChange={(url) => form.setValue("logoUrl", url, { shouldDirty: true })}
          />
          <div className="flex flex-wrap gap-6">
            {(
              [
                ["delivers", "Delivers on campus"],
                ["isOpen", "Open now"],
                ["isActive", "Visible on the E-Market"],
              ] as const
            ).map(([name, label]) => (
              <label key={name} className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input type="checkbox" className="h-4 w-4 rounded border-input" {...form.register(name)} />
                {label}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Add Vendor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MenuDialog({
  vendor,
  canEdit,
  onClose,
  onChanged,
}: {
  vendor: Vendor | null
  canEdit: boolean
  onClose: () => void
  onChanged: () => void
}) {
  return (
    <Dialog open={vendor != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Menu — {vendor?.name}</DialogTitle>
        </DialogHeader>
        {vendor && (
          // Keyed so an open item form resets when switching vendors.
          <MenuManager
            key={vendor.id}
            baseUrl={`/food/vendors/${vendor.id}/items`}
            menu={vendor.menu}
            canEdit={canEdit}
            onChanged={onChanged}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
