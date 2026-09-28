import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Pencil, Plus, Trash2, X } from "lucide-react"
import { api, ApiError } from "#/lib/api-client"
import { formatCedis } from "#/lib/market"
import { cn } from "#/lib/utils"
import { FileUploadField } from "#/components/file-upload-field"
import { FormField } from "#/components/form-field"
import { Button } from "#/components/ui/button.tsx"
import { Input } from "#/components/ui/input.tsx"

export interface MenuItem {
  id: number
  vendor_id: number
  section: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: 0 | 1
  sort_order: number
}

const errorMessage = (fallback: string) => (err: unknown) =>
  toast.error(err instanceof ApiError ? err.message : fallback)

const itemSchema = z.object({
  section: z.string().trim().min(1, "Required").max(60),
  name: z.string().trim().min(2, "Required").max(150),
  description: z.string().max(500),
  price: z.coerce.number().positive("Enter a price above 0"),
  imageUrl: z.string().url().optional(),
  isAvailable: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(9999),
})
type ItemFormInput = z.input<typeof itemSchema>
type ItemFormValues = z.output<typeof itemSchema>

const emptyItem = (section = "Mains", sortOrder = 0): ItemFormInput => ({
  section,
  name: "",
  description: "",
  price: "",
  imageUrl: undefined,
  isAvailable: true,
  sortOrder,
})

// Add/edit/delete a vendor's menu items. Used by the admin Food Vendors tab
// (baseUrl /food/vendors/:id/items) and the seller portal (/seller/vendor/items).
export function MenuManager({
  baseUrl,
  menu,
  canEdit,
  onChanged,
}: {
  baseUrl: string
  menu: Array<MenuItem>
  canEdit: boolean
  onChanged: () => void
}) {
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const form = useForm<ItemFormInput, unknown, ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: emptyItem(),
  })

  const sections = [...new Set(menu.map((i) => i.section))]

  const openCreate = () => {
    setEditing(null)
    const last = menu.at(-1)
    form.reset(emptyItem(last?.section ?? "Mains", (last?.sort_order ?? -1) + 1))
    setFormOpen(true)
  }

  const openEdit = (item: MenuItem) => {
    setEditing(item)
    form.reset({
      section: item.section,
      name: item.name,
      description: item.description ?? "",
      price: item.price,
      imageUrl: item.image_url ?? undefined,
      isAvailable: item.is_available === 1,
      sortOrder: item.sort_order,
    })
    setFormOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (values: ItemFormValues) => {
      const body = { ...values, imageUrl: values.imageUrl ?? "" }
      return editing ? api.patch(`${baseUrl}/${editing.id}`, body) : api.post(baseUrl, body)
    },
    onSuccess: () => {
      toast.success(editing ? "Menu item updated." : "Menu item added.")
      onChanged()
      setFormOpen(false)
      setEditing(null)
    },
    onError: errorMessage("Couldn't save the menu item."),
  })

  const patchMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => api.patch(`${baseUrl}/${id}`, body),
    onSuccess: onChanged,
    onError: errorMessage("Couldn't update the menu item."),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`${baseUrl}/${id}`),
    onSuccess: () => {
      toast.success("Menu item deleted.")
      onChanged()
    },
    onError: errorMessage("Couldn't delete the menu item."),
  })

  const errors = form.formState.errors

  return (
    <div className="flex flex-col gap-4">
        {canEdit && !formOpen && (
          <Button variant="outline" className="w-fit" onClick={openCreate}>
            <Plus className="size-4" />
            Add Menu Item
          </Button>
        )}

        {formOpen && (
          <form
            onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
            className="flex flex-col gap-4 rounded-lg border border-border bg-secondary/40 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold">{editing ? `Edit — ${editing.name}` : "New menu item"}</p>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Cancel" onClick={() => setFormOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Item Name" error={errors.name?.message}>
                <Input {...form.register("name")} />
              </FormField>
              <FormField label="Price (GH₵)" error={errors.price?.message}>
                <Input type="number" step="0.01" min="0" {...form.register("price")} />
              </FormField>
              <FormField label="Menu Section" hint="e.g. Mains, Sides, Drinks" error={errors.section?.message}>
                <Input list="menu-sections" {...form.register("section")} />
                <datalist id="menu-sections">
                  {sections.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </FormField>
              <FormField label="Display Order">
                <Input type="number" min={0} {...form.register("sortOrder")} />
              </FormField>
              <FormField label="Description (optional)" className="sm:col-span-2">
                <Input placeholder="e.g. Served with fried plantain and egg" {...form.register("description")} />
              </FormField>
            </div>
            <FileUploadField
              label="Photo (optional)"
              folder="market-images"
              value={form.watch("imageUrl")}
              onChange={(url) => form.setValue("imageUrl", url, { shouldDirty: true })}
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4 rounded border-input" {...form.register("isAvailable")} />
              Available (untick to show as sold out)
            </label>
            <div className="flex justify-end">
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editing ? "Save Item" : "Add Item"}
              </Button>
            </div>
          </form>
        )}

        {menu.length === 0 && !formOpen && (
          <p className="py-6 text-center text-sm text-muted-foreground">No menu items yet.</p>
        )}

        {sections.map((section) => (
          <section key={section}>
            <h3 className="mb-1 border-b border-border pb-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {section}
            </h3>
            <ul className="divide-y divide-border">
              {menu
                .filter((i) => i.section === section)
                .map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-2">
                    <div className={cn("min-w-0 flex-1", !item.is_available && "opacity-60")}>
                      <p className="truncate font-medium">{item.name}</p>
                      {item.description && <p className="truncate text-xs text-muted-foreground">{item.description}</p>}
                    </div>
                    <span className="shrink-0 font-semibold">{formatCedis(item.price)}</span>
                    {canEdit && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={patchMutation.isPending}
                          onClick={() => patchMutation.mutate({ id: item.id, body: { isAvailable: !item.is_available } })}
                        >
                          {item.is_available ? "Mark sold out" : "Mark available"}
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${item.name}`} onClick={() => openEdit(item)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${item.name}`}
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm(`Delete "${item.name}" from the menu?`)) deleteMutation.mutate(item.id)
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ))}
    </div>
  )
}
