import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { api, ApiError } from "#/lib/api-client"
import { AUDIENCE_LABELS, discountPercent, formatCedis, marketIcon } from "#/lib/market"
import { sellerOverviewQuery } from "#/lib/sellers"
import { FileUploadField } from "#/components/file-upload-field"
import { FormField } from "#/components/form-field"
import { Badge } from "#/components/ui/badge.tsx"
import { Button } from "#/components/ui/button.tsx"
import { Input } from "#/components/ui/input.tsx"
import { Textarea } from "#/components/ui/textarea.tsx"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table.tsx"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog.tsx"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select.tsx"

export const Route = createFileRoute("/seller/_seller/products")({
  // Only for businesses.
  beforeLoad: ({ context }) => {
    if (context.seller.sellerType !== "business") throw redirect({ to: "/seller" })
  },
  component: SellerProductsPage,
})

interface Category {
  id: number
  name: string
  icon: string
}

interface Product {
  id: number
  category_id: number
  name: string
  description: string | null
  price: number
  old_price: number | null
  image_url: string | null
  item_condition: "new" | "used"
  audience: "all" | "students" | "staff"
  is_featured: 0 | 1
  is_active: 0 | 1
}

const schema = z
  .object({
    categoryId: z.coerce.number().int().positive("Choose a category"),
    name: z.string().trim().min(2, "Required").max(200),
    description: z.string().max(5000),
    price: z.coerce.number().positive("Enter a price above 0"),
    oldPrice: z.union([z.literal(""), z.coerce.number().positive()]),
    imageUrl: z.string().url().optional(),
    condition: z.enum(["new", "used"]),
    audience: z.enum(["all", "students", "staff"]),
    isActive: z.boolean(),
  })
  .refine((p) => p.oldPrice === "" || p.oldPrice > p.price, {
    message: "Must be higher than the price",
    path: ["oldPrice"],
  })
type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

const EMPTY: FormInput = {
  categoryId: 0,
  name: "",
  description: "",
  price: "",
  oldPrice: "",
  imageUrl: undefined,
  condition: "new",
  audience: "all",
  isActive: true,
}

const errorMessage = (fallback: string) => (err: unknown) =>
  toast.error(err instanceof ApiError ? err.message : fallback)

function SellerProductsPage() {
  const queryClient = useQueryClient()
  const { data: overview } = useQuery(sellerOverviewQuery)
  const canManage = overview ? ["pending", "approved"].includes(overview.seller.status) : false
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  const { data: categoriesData } = useQuery({
    queryKey: ["seller", "categories"],
    queryFn: () => api.get<{ categories: Array<Category> }>("/seller/categories"),
  })
  const categories = categoriesData?.categories ?? []
  const { data, isLoading } = useQuery({
    queryKey: ["seller", "products"],
    queryFn: () => api.get<{ products: Array<Product> }>("/seller/products"),
  })
  const products = data?.products ?? []

  const form = useForm<FormInput, unknown, FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })
  const errors = form.formState.errors
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["seller"] })

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const body = { ...values, oldPrice: values.oldPrice === "" ? null : values.oldPrice, imageUrl: values.imageUrl ?? "" }
      return editing ? api.patch(`/seller/products/${editing.id}`, body) : api.post("/seller/products", body)
    },
    onSuccess: () => {
      toast.success(editing ? "Product updated." : "Product added.")
      invalidate()
      setDialogOpen(false)
    },
    onError: errorMessage("Couldn't save the product."),
  })

  const toggleMutation = useMutation({
    mutationFn: (p: Product) => api.patch(`/seller/products/${p.id}`, { isActive: !p.is_active }),
    onSuccess: invalidate,
    onError: errorMessage("Couldn't update the product."),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/seller/products/${id}`),
    onSuccess: () => {
      toast.success("Product deleted.")
      invalidate()
    },
    onError: errorMessage("Couldn't delete the product."),
  })

  const openCreate = () => {
    setEditing(null)
    form.reset({ ...EMPTY, categoryId: categories[0]?.id ?? 0 })
    setDialogOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    form.reset({
      categoryId: p.category_id,
      name: p.name,
      description: p.description ?? "",
      price: p.price,
      oldPrice: p.old_price ?? "",
      imageUrl: p.image_url ?? undefined,
      condition: p.item_condition,
      audience: p.audience,
      isActive: p.is_active === 1,
    })
    setDialogOpen(true)
  }

  const categoryById = new Map(categories.map((c) => [c.id, c]))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Products</h1>
          <p className="text-sm text-muted-foreground">
            Customers contact you directly by WhatsApp or phone from your listing.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate} disabled={categories.length === 0}>
            <Plus className="size-4" />
            Add Product
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading && <p className="px-6 py-4 text-muted-foreground">Loading...</p>}
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>For</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && products.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  You haven't added any products yet.
                </TableCell>
              </TableRow>
            )}
            {products.map((p) => {
              const category = categoryById.get(p.category_id)
              const Icon = marketIcon(category?.icon ?? "")
              const pct = discountPercent(p.price, p.old_price)
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="size-10 rounded-md border border-border bg-white object-contain" />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Icon className="size-5" />
                        </div>
                      )}
                      <p className="max-w-64 truncate font-medium text-foreground">{p.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>{category?.name ?? "—"}</TableCell>
                  <TableCell>
                    <span className="font-semibold">{formatCedis(p.price)}</span>
                    {pct > 0 && <span className="ml-2 text-xs text-muted-foreground">−{pct}%</span>}
                  </TableCell>
                  <TableCell>{AUDIENCE_LABELS[p.audience]}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={p.is_active ? "success" : "secondary"}>{p.is_active ? "Listed" : "Unlisted"}</Badge>
                      {p.is_featured === 1 && <Badge variant="warning">Top Deal</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && (
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" disabled={toggleMutation.isPending} onClick={() => toggleMutation.mutate(p)}>
                          {p.is_active ? "Unlist" : "List"}
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${p.name}`} onClick={() => openEdit(p)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${p.name}`}
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm(`Delete "${p.name}"?`)) deleteMutation.mutate(p.id)
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit — ${editing.name}` : "Add Product"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Product Name" error={errors.name?.message} className="sm:col-span-2">
                <Input {...form.register("name")} />
              </FormField>
              <FormField label="Category" error={errors.categoryId?.message}>
                <Controller
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose..." />
                      </SelectTrigger>
                      <SelectContent>
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
              <FormField label="For">
                <Controller
                  control={form.control}
                  name="audience"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(AUDIENCE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField label="Price (GH₵)" error={errors.price?.message}>
                <Input type="number" step="0.01" min="0" {...form.register("price")} />
              </FormField>
              <FormField label="Old Price (GH₵, optional)" hint="Shows a discount badge" error={errors.oldPrice?.message}>
                <Input type="number" step="0.01" min="0" {...form.register("oldPrice")} />
              </FormField>
              <FormField label="Condition">
                <Controller
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="used">Used</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField label="Description" className="sm:col-span-2">
                <Textarea rows={3} {...form.register("description")} />
              </FormField>
            </div>
            <Controller
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FileUploadField
                  label="Product Image (optional)"
                  helpText="JPEG, PNG, or WebP. Square images work best."
                  folder="market-images"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4 rounded border-input" {...form.register("isActive")} />
              List this product on the E-Market
            </label>
            <DialogFooter>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Add Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
