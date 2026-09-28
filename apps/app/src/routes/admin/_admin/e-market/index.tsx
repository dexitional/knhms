import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ExternalLink, Pencil, Plus, Search, Star, Trash2 } from "lucide-react"
import { api, ApiError } from "#/lib/api-client"
import { AUDIENCE_LABELS, MARKET_ICONS, discountPercent, formatCedis, marketIcon } from "#/lib/market"
import { cn } from "#/lib/utils"
import { FileUploadField } from "#/components/file-upload-field"
import { FormField } from "#/components/form-field"
import { FoodVendorsTab } from "#/components/admin/food-vendors-tab"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select.tsx"

export const Route = createFileRoute("/admin/_admin/e-market/")({
  component: EMarketAdminPage,
})

interface CategoryRow {
  id: number
  name: string
  icon: string
  description: string | null
  sort_order: number
  is_active: 0 | 1
  product_count: number
}

interface ProductRow {
  id: number
  category_id: number
  name: string
  description: string | null
  price: number
  old_price: number | null
  image_url: string | null
  item_condition: "new" | "used"
  audience: "all" | "students" | "staff"
  rating: number | null
  seller_name: string
  seller_phone: string | null
  seller_location: string | null
  is_featured: 0 | 1
  sort_order: number
  is_active: 0 | 1
}

const TABS = [
  ["products", "Products"],
  ["categories", "Categories"],
  ["vendors", "Food Vendors"],
] as const

const errorMessage = (fallback: string) => (err: unknown) =>
  toast.error(err instanceof ApiError ? err.message : fallback)

function EMarketAdminPage() {
  const { admin } = Route.useRouteContext()
  const canEdit = admin.role === "super_admin" || admin.role === "admin"
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("products")

  const categoriesQuery = useQuery({
    queryKey: ["market", "categories"],
    queryFn: () => api.get<{ categories: Array<CategoryRow> }>("/market/categories"),
  })
  const categories = categoriesQuery.data?.categories ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">E-Market</h1>
          <p className="text-sm text-muted-foreground">
            Products, categories, and food vendors shown on the public E-Market.
          </p>
        </div>
        <a
          href="/e-market"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          View public page <ExternalLink className="size-3.5" />
        </a>
      </div>

      <div className="flex w-fit gap-1 rounded-lg bg-secondary p-1" role="tablist">
        {TABS.map(([t, label]) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "products" && <ProductsTab canEdit={canEdit} categories={categories} />}
      {tab === "categories" && (
        <CategoriesTab canEdit={canEdit} categories={categories} isLoading={categoriesQuery.isLoading} />
      )}
      {tab === "vendors" && <FoodVendorsTab canEdit={canEdit} />}
    </div>
  )
}

// ---- Products -------------------------------------------------------------

const optionalMoney = z.union([z.literal(""), z.coerce.number().positive("Must be more than 0")])

const productSchema = z
  .object({
    categoryId: z.coerce.number().int().positive("Choose a category"),
    name: z.string().trim().min(2, "Required").max(200),
    description: z.string().max(5000),
    price: z.coerce.number().positive("Enter a price above 0"),
    oldPrice: optionalMoney,
    imageUrl: z.string().url().optional(),
    condition: z.enum(["new", "used"]),
    audience: z.enum(["all", "students", "staff"]),
    rating: z.union([z.literal(""), z.coerce.number().min(0).max(5, "0–5")]),
    sellerName: z.string().trim().min(2, "Required").max(150),
    sellerPhone: z.string().max(30),
    sellerLocation: z.string().max(255),
    isFeatured: z.boolean(),
    sortOrder: z.coerce.number().int().min(0).max(9999),
    isActive: z.boolean(),
  })
  .refine((p) => p.oldPrice === "" || p.oldPrice > p.price, {
    message: "Must be higher than the price",
    path: ["oldPrice"],
  })
type ProductFormInput = z.input<typeof productSchema>
type ProductFormValues = z.output<typeof productSchema>

const EMPTY_PRODUCT: ProductFormInput = {
  categoryId: 0,
  name: "",
  description: "",
  price: "",
  oldPrice: "",
  imageUrl: undefined,
  condition: "new",
  audience: "all",
  rating: "",
  sellerName: "",
  sellerPhone: "",
  sellerLocation: "",
  isFeatured: false,
  sortOrder: 0,
  isActive: true,
}

function toProductForm(p: ProductRow): ProductFormInput {
  return {
    categoryId: p.category_id,
    name: p.name,
    description: p.description ?? "",
    price: p.price,
    oldPrice: p.old_price ?? "",
    imageUrl: p.image_url ?? undefined,
    condition: p.item_condition,
    audience: p.audience,
    rating: p.rating ?? "",
    sellerName: p.seller_name,
    sellerPhone: p.seller_phone ?? "",
    sellerLocation: p.seller_location ?? "",
    isFeatured: p.is_featured === 1,
    sortOrder: p.sort_order,
    isActive: p.is_active === 1,
  }
}

function toProductBody(v: ProductFormValues) {
  return {
    ...v,
    oldPrice: v.oldPrice === "" ? null : v.oldPrice,
    rating: v.rating === "" ? null : v.rating,
    imageUrl: v.imageUrl ?? "",
  }
}

function ProductsTab({ canEdit, categories }: { canEdit: boolean; categories: Array<CategoryRow> }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ProductRow | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["market", "products"],
    queryFn: () => api.get<{ products: Array<ProductRow> }>("/market/products"),
  })

  const form = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY_PRODUCT,
  })
  const errors = form.formState.errors

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["market"] })

  const saveMutation = useMutation({
    mutationFn: ({ id, values }: { id?: number; values: ProductFormValues }) =>
      id ? api.patch(`/market/products/${id}`, toProductBody(values)) : api.post("/market/products", toProductBody(values)),
    onSuccess: (_, { id }) => {
      toast.success(id ? "Product updated." : "Product added.")
      invalidate()
      setDialogOpen(false)
    },
    onError: errorMessage("Couldn't save the product."),
  })

  const patchMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => api.patch(`/market/products/${id}`, body),
    onSuccess: invalidate,
    onError: errorMessage("Couldn't update the product."),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/market/products/${id}`),
    onSuccess: () => {
      toast.success("Product deleted.")
      invalidate()
    },
    onError: errorMessage("Couldn't delete the product."),
  })

  const openCreate = () => {
    setEditing(null)
    form.reset({
      ...EMPTY_PRODUCT,
      categoryId: categoryFilter === "all" ? (categories[0]?.id ?? 0) : Number(categoryFilter),
    })
    setDialogOpen(true)
  }

  const openEdit = (p: ProductRow) => {
    setEditing(p)
    form.reset(toProductForm(p))
    setDialogOpen(true)
  }

  const categoryName = new Map(categories.map((c) => [c.id, c.name]))
  const query = search.trim().toLowerCase()
  const products = (data?.products ?? []).filter(
    (p) =>
      (categoryFilter === "all" || p.category_id === Number(categoryFilter)) &&
      (!query || [p.name, p.seller_name].some((f) => f.toLowerCase().includes(query))),
  )

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-52">
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
        <div className="relative w-48">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        {canEdit && (
          <Button onClick={openCreate} disabled={categories.length === 0} title={categories.length === 0 ? "Add a category first" : undefined}>
            <Plus className="size-4" />
            Add Product
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading && <p className="px-6 py-4 text-muted-foreground">Loading...</p>}
        <Table className="min-w-[960px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>For</TableHead>
              <TableHead>Seller</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && products.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No products found.
                </TableCell>
              </TableRow>
            )}
            {products.map((p) => {
              const pct = discountPercent(p.price, p.old_price)
              const Icon = marketIcon(categories.find((c) => c.id === p.category_id)?.icon ?? "")
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
                      <div className="min-w-0">
                        <p className="max-w-64 truncate font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{p.item_condition}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{categoryName.get(p.category_id) ?? <TableEmptyValue />}</TableCell>
                  <TableCell>
                    <span className="font-semibold">{formatCedis(p.price)}</span>
                    {pct > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        <span className="line-through">{formatCedis(p.old_price!)}</span> −{pct}%
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{AUDIENCE_LABELS[p.audience]}</TableCell>
                  <TableCell className="max-w-44 truncate">{p.seller_name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={p.is_active ? "success" : "danger"}>{p.is_active ? "Visible" : "Hidden"}</Badge>
                      {p.is_featured === 1 && <Badge variant="warning">Top Deal</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {canEdit && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={p.is_featured ? `Remove ${p.name} from Top Deals` : `Add ${p.name} to Top Deals`}
                          title={p.is_featured ? "Remove from Top Deals" : "Add to Top Deals"}
                          disabled={patchMutation.isPending}
                          onClick={() => patchMutation.mutate({ id: p.id, body: { isFeatured: !p.is_featured } })}
                        >
                          <Star className={cn("size-4", p.is_featured && "fill-amber-400 text-amber-400")} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={patchMutation.isPending}
                          onClick={() => patchMutation.mutate({ id: p.id, body: { isActive: !p.is_active } })}
                        >
                          {p.is_active ? "Hide" : "Show"}
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${p.name}`} title="Edit product" onClick={() => openEdit(p)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${p.name}`}
                          title="Delete product"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm(`Delete "${p.name}"? This can't be undone.`)) deleteMutation.mutate(p.id)
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
          <form
            onSubmit={form.handleSubmit((values) => saveMutation.mutate({ id: editing?.id, values }))}
            className="flex flex-col gap-4"
          >
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
              <FormField label="Old Price (GH₵, optional)" hint="Shows a strikethrough and discount badge" error={errors.oldPrice?.message}>
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
              <FormField label="Rating (0–5, optional)" error={errors.rating?.message}>
                <Input type="number" step="0.1" min="0" max="5" {...form.register("rating")} />
              </FormField>
              <FormField label="Description" className="sm:col-span-2">
                <Textarea rows={3} {...form.register("description")} />
              </FormField>
              <FormField label="Seller Name" error={errors.sellerName?.message}>
                <Input {...form.register("sellerName")} />
              </FormField>
              <FormField label="Seller Phone / WhatsApp" hint="Buyers contact the seller on this number">
                <Input placeholder="e.g. 024 123 4567" {...form.register("sellerPhone")} />
              </FormField>
              <FormField label="Seller Location" className="sm:col-span-2">
                <Input placeholder="e.g. KNH Annex, Room B12" {...form.register("sellerLocation")} />
              </FormField>
              <FormField label="Display Order" hint="Lower numbers appear first">
                <Input type="number" min={0} {...form.register("sortOrder")} />
              </FormField>
            </div>

            <Controller
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FileUploadField
                  label="Product Image (optional)"
                  helpText="JPEG, PNG, or WebP. Shown uncropped on white — square images work best."
                  folder="market-images"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            <div className="flex flex-wrap gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input type="checkbox" className="h-4 w-4 rounded border-input" {...form.register("isFeatured")} />
                Show in Top Deals
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input type="checkbox" className="h-4 w-4 rounded border-input" {...form.register("isActive")} />
                Visible on the E-Market
              </label>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Add Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---- Categories -----------------------------------------------------------

const categorySchema = z.object({
  name: z.string().trim().min(2, "Required").max(100),
  icon: z.string().min(1),
  description: z.string().max(255),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  isActive: z.boolean(),
})
type CategoryFormInput = z.input<typeof categorySchema>
type CategoryFormValues = z.output<typeof categorySchema>

const EMPTY_CATEGORY: CategoryFormInput = {
  name: "",
  icon: "shopping-bag",
  description: "",
  sortOrder: 0,
  isActive: true,
}

function CategoriesTab({
  canEdit,
  categories,
  isLoading,
}: {
  canEdit: boolean
  categories: Array<CategoryRow>
  isLoading: boolean
}) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryRow | null>(null)

  const form = useForm<CategoryFormInput, unknown, CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: EMPTY_CATEGORY,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["market"] })

  const saveMutation = useMutation({
    mutationFn: ({ id, values }: { id?: number; values: CategoryFormValues }) =>
      id ? api.patch(`/market/categories/${id}`, values) : api.post("/market/categories", values),
    onSuccess: (_, { id }) => {
      toast.success(id ? "Category updated." : "Category added.")
      invalidate()
      setDialogOpen(false)
    },
    onError: errorMessage("Couldn't save the category."),
  })

  const toggleMutation = useMutation({
    mutationFn: (c: CategoryRow) => api.patch(`/market/categories/${c.id}`, { isActive: !c.is_active }),
    onSuccess: invalidate,
    onError: errorMessage("Couldn't update the category."),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/market/categories/${id}`),
    onSuccess: () => {
      toast.success("Category deleted.")
      invalidate()
    },
    onError: errorMessage("Couldn't delete the category."),
  })

  const openCreate = () => {
    setEditing(null)
    form.reset(EMPTY_CATEGORY)
    setDialogOpen(true)
  }

  const openEdit = (c: CategoryRow) => {
    setEditing(c)
    form.reset({
      name: c.name,
      icon: c.icon,
      description: c.description ?? "",
      sortOrder: c.sort_order,
      isActive: c.is_active === 1,
    })
    setDialogOpen(true)
  }

  return (
    <>
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add Category
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading && <p className="px-6 py-4 text-muted-foreground">Loading...</p>}
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && categories.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No categories yet. Add one before adding products.
                </TableCell>
              </TableRow>
            )}
            {categories.map((c) => {
              const Icon = marketIcon(c.icon)
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </div>
                      <span className="font-medium text-foreground">{c.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-72 truncate">{c.description ?? <TableEmptyValue />}</TableCell>
                  <TableCell>{c.product_count}</TableCell>
                  <TableCell>{c.sort_order}</TableCell>
                  <TableCell>
                    <Badge variant={c.is_active ? "success" : "danger"}>{c.is_active ? "Visible" : "Hidden"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canEdit && (
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" disabled={toggleMutation.isPending} onClick={() => toggleMutation.mutate(c)}>
                          {c.is_active ? "Hide" : "Show"}
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${c.name}`} title="Edit category" onClick={() => openEdit(c)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${c.name}`}
                          title={c.product_count > 0 ? "Move or delete its products first" : "Delete category"}
                          disabled={deleteMutation.isPending || c.product_count > 0}
                          onClick={() => {
                            if (confirm(`Delete the "${c.name}" category?`)) deleteMutation.mutate(c.id)
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
      <p className="text-xs text-muted-foreground">
        Hiding a category also hides all of its products from the public page. The first three
        categories appear as banners on the E-Market.
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit — ${editing.name}` : "Add Category"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((values) => saveMutation.mutate({ id: editing?.id, values }))}
            className="flex flex-col gap-4"
          >
            <FormField label="Name" error={form.formState.errors.name?.message}>
              <Input {...form.register("name")} />
            </FormField>
            <FormField label="Icon">
              <Controller
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Category icon">
                    {Object.entries(MARKET_ICONS).map(([key, { icon: Icon, label }]) => (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={field.value === key}
                        aria-label={label}
                        title={label}
                        onClick={() => field.onChange(key)}
                        className={cn(
                          "flex size-10 items-center justify-center rounded-md border transition-colors",
                          field.value === key
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary hover:text-primary",
                        )}
                      >
                        <Icon className="size-5" />
                      </button>
                    ))}
                  </div>
                )}
              />
            </FormField>
            <FormField label="Description (optional)">
              <Input {...form.register("description")} />
            </FormField>
            <FormField label="Display Order" hint="Lower numbers appear first">
              <Input type="number" min={0} {...form.register("sortOrder")} />
            </FormField>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4 rounded border-input" {...form.register("isActive")} />
              Visible on the E-Market
            </label>
            <DialogFooter>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Add Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
