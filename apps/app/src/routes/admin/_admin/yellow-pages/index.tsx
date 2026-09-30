import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ExternalLink, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { api, ApiError } from "#/lib/api-client"
import { FileUploadField } from "#/components/file-upload-field"
import { FormField } from "#/components/form-field"
import { Button } from "#/components/ui/button.tsx"
import { Badge } from "#/components/ui/badge.tsx"
import { Input } from "#/components/ui/input.tsx"
import { Label } from "#/components/ui/label.tsx"
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
import { canManage } from "#/lib/permissions"
import { Pagination } from "#/components/pagination"

const PAGE_SIZE = 15

export const Route = createFileRoute("/admin/_admin/yellow-pages/")({
  component: YellowPagesAdminPage,
})

type Category = "personnel" | "business" | "executive" | "alumni" | "page_personnel"

const CATEGORY_LABELS: Record<Category, string> = {
  personnel: "Key Personnel",
  business: "Campus Business",
  executive: "KNH Executive",
  alumni: "Alumni",
  page_personnel: "Page Personnel",
}

const CATEGORY_BADGE = {
  personnel: "secondary",
  business: "info",
  executive: "purple",
  alumni: "success",
  page_personnel: "warning",
} as const

// Kept in the admin only — never shown on the public Yellow Pages.
const ADMIN_ONLY_CATEGORIES: ReadonlySet<Category> = new Set(["page_personnel"])

interface DirectoryEntry {
  id: number
  category: Category
  name: string
  title: string
  subtitle: string | null
  phone: string | null
  show_phone: 0 | 1
  email: string | null
  location: string | null
  hours: string | null
  photo_url: string | null
  map_query: string | null
  website_url: string | null
  tags: string[] | null
  sort_order: number
  is_active: 0 | 1
}

const MAX_TAGS = 8

// "Mentor, Class of 2015 ,mentor" → ["Mentor", "Class of 2015"]
function parseTags(value: string) {
  const seen = new Set<string>()
  return value
    .split(",")
    .map((t) => t.trim())
    .filter((t) => {
      const key = t.toLowerCase()
      if (!t || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

// Rounded tag badges, as on the public Yellow Pages cards.
function TagBadges({ tags }: { tags: Array<string> }) {
  if (tags.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span
          key={t}
          className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
        >
          {t}
        </span>
      ))}
    </div>
  )
}

const optionalUrl = z.union([z.string().url("Enter a full URL, e.g. https://…"), z.literal("")])

const entrySchema = z.object({
  category: z.enum(["personnel", "business", "executive", "alumni", "page_personnel"]),
  name: z.string().trim().min(2, "Required").max(150),
  title: z.string().trim().min(1, "Required").max(150),
  subtitle: z.string().max(255),
  phone: z.string().max(30),
  showPhone: z.boolean(),
  email: z.union([z.string().email("Enter a valid email"), z.literal("")]),
  location: z.string().max(255),
  hours: z.string().max(150),
  photoUrl: optionalUrl.optional(),
  mapQuery: z.string().max(255),
  websiteUrl: optionalUrl,
  // Comma-separated in the form; sent to the API as a list.
  tags: z.string().refine((v) => parseTags(v).length <= MAX_TAGS, `Use at most ${MAX_TAGS} tags.`).refine(
    (v) => parseTags(v).every((t) => t.length <= 30),
    "Keep each tag to 30 characters.",
  ),
  sortOrder: z.number().int().min(0).max(9999),
  isActive: z.boolean(),
})
type EntryFormValues = z.infer<typeof entrySchema>

const EMPTY_FORM: EntryFormValues = {
  category: "personnel",
  name: "",
  title: "",
  subtitle: "",
  phone: "",
  showPhone: true,
  email: "",
  location: "",
  hours: "",
  photoUrl: undefined,
  mapQuery: "",
  websiteUrl: "",
  tags: "",
  sortOrder: 0,
  isActive: true,
}

function toFormValues(e: DirectoryEntry): EntryFormValues {
  return {
    category: e.category,
    name: e.name,
    title: e.title,
    subtitle: e.subtitle ?? "",
    phone: e.phone ?? "",
    showPhone: e.show_phone === 1,
    email: e.email ?? "",
    location: e.location ?? "",
    hours: e.hours ?? "",
    photoUrl: e.photo_url ?? undefined,
    mapQuery: e.map_query ?? "",
    websiteUrl: e.website_url ?? "",
    tags: (e.tags ?? []).join(", "),
    sortOrder: e.sort_order,
    isActive: e.is_active === 1,
  }
}

function YellowPagesAdminPage() {
  const { admin } = Route.useRouteContext()
  const canEdit = canManage(admin.role, "yellowPages")
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<Category | "all">("all")
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<DirectoryEntry | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["directory"],
    queryFn: () => api.get<{ entries: Array<DirectoryEntry> }>("/directory"),
  })

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: EMPTY_FORM,
  })
  const errors = form.formState.errors
  const isBusiness = form.watch("category") === "business"
  const isAlumni = form.watch("category") === "alumni"
  const isAdminOnly = ADMIN_ONLY_CATEGORIES.has(form.watch("category"))

  const onSaved = (message: string) => {
    toast.success(message)
    queryClient.invalidateQueries({ queryKey: ["directory"] })
    setDialogOpen(false)
    setEditing(null)
  }
  const onFailed = (fallback: string) => (err: unknown) =>
    toast.error(err instanceof ApiError ? err.message : fallback)

  const saveMutation = useMutation({
    mutationFn: ({ id, values }: { id?: number; values: EntryFormValues }) => {
      const body = { ...values, photoUrl: values.photoUrl ?? "", tags: parseTags(values.tags) }
      return id ? api.patch(`/directory/${id}`, body) : api.post("/directory", body)
    },
    onSuccess: (_, { id }) => onSaved(id ? "Entry updated." : "Entry added."),
    onError: onFailed("Couldn't save the entry."),
  })

  const toggleMutation = useMutation({
    mutationFn: (e: DirectoryEntry) => api.patch(`/directory/${e.id}`, { isActive: !e.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["directory"] }),
    onError: onFailed("Couldn't update visibility."),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/directory/${id}`),
    onSuccess: () => {
      toast.success("Entry deleted.")
      queryClient.invalidateQueries({ queryKey: ["directory"] })
    },
    onError: onFailed("Couldn't delete the entry."),
  })

  const openCreate = () => {
    setEditing(null)
    const initial = category === "all" ? "personnel" : category
    // Alumni phone numbers are hidden by default.
    form.reset({ ...EMPTY_FORM, category: initial, showPhone: initial !== "alumni" })
    setDialogOpen(true)
  }

  const openEdit = (entry: DirectoryEntry) => {
    setEditing(entry)
    form.reset(toFormValues(entry))
    setDialogOpen(true)
  }

  const query = search.trim().toLowerCase()
  const entries = (data?.entries ?? []).filter(
    (e) =>
      (category === "all" || e.category === category) &&
      (!query ||
        [e.name, e.title, e.subtitle, e.phone, e.email, e.location, ...(e.tags ?? [])].some((f) =>
          f?.toLowerCase().includes(query),
        )),
  )
  // Stay on a real page when filtering or deleting shrinks the list.
  const currentPage = Math.min(page, Math.max(1, Math.ceil(entries.length / PAGE_SIZE)))
  const pageEntries = entries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Yellow Pages</h1>
          <p className="text-sm text-muted-foreground">
            Contacts and businesses shown on the public Yellow Pages.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v as Category | "all")
              setPage(1)
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-48">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-8"
            />
          </div>
          {canEdit && (
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Add Entry
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading && <p className="px-6 py-4 text-muted-foreground">Loading...</p>}
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Role / Type</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && entries.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No entries found.
                </TableCell>
              </TableRow>
            )}
            {pageEntries.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {e.photo_url ? (
                      <img
                        src={e.photo_url}
                        alt=""
                        className={
                          e.category === "business"
                            ? "size-9 rounded-lg border border-border bg-white object-contain p-0.5"
                            : "size-9 rounded-lg object-cover"
                        }
                      />
                    ) : (
                      <div className="size-9 rounded-lg bg-primary/10" />
                    )}
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-foreground">{e.name}</span>
                      <TagBadges tags={e.tags ?? []} />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={CATEGORY_BADGE[e.category]}>{CATEGORY_LABELS[e.category]}</Badge>
                </TableCell>
                <TableCell>{e.title}</TableCell>
                <TableCell>{e.phone ?? <TableEmptyValue />}</TableCell>
                <TableCell className="max-w-56 truncate">{e.location ?? <TableEmptyValue />}</TableCell>
                <TableCell>{e.sort_order}</TableCell>
                <TableCell>
                  {ADMIN_ONLY_CATEGORIES.has(e.category) ? (
                    <Badge variant="secondary">Admin only</Badge>
                  ) : (
                    <Badge variant={e.is_active ? "success" : "danger"}>
                      {e.is_active ? "Visible" : "Hidden"}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {canEdit && (
                    <div className="flex items-center justify-end gap-1">
                      {!ADMIN_ONLY_CATEGORIES.has(e.category) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleMutation.mutate(e)}
                          disabled={toggleMutation.isPending}
                        >
                          {e.is_active ? "Hide" : "Show"}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${e.name}`}
                        title="Edit entry"
                        onClick={() => openEdit(e)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${e.name}`}
                        title="Delete entry"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (confirm(`Delete ${e.name} from the Yellow Pages? This can't be undone.`))
                            deleteMutation.mutate(e.id)
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
        {entries.length > PAGE_SIZE && (
          <Pagination page={currentPage} pageSize={PAGE_SIZE} total={entries.length} onPageChange={setPage} />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit — ${editing.name}` : "Add Directory Entry"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((values) => saveMutation.mutate({ id: editing?.id, values }))}
            className="flex flex-col gap-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Category</Label>
                <Controller
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v)
                        // New entries: alumni phone numbers start hidden.
                        if (!editing) form.setValue("showPhone", v !== "alumni")
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <FormField label={isBusiness ? "Business Name" : "Full Name"} error={errors.name?.message}>
                <Input {...form.register("name")} />
              </FormField>
              <FormField
                label={isBusiness ? "Business Type" : isAlumni ? "Current Role" : "Role / Position"}
                error={errors.title?.message}
              >
                <Input
                  placeholder={
                    isBusiness ? "e.g. Food & Beverage" : isAlumni ? "e.g. Software Engineer, Google" : "e.g. JCR President"
                  }
                  {...form.register("title")}
                />
              </FormField>
              <FormField label={isBusiness ? "Description" : isAlumni ? "Class / Programme" : "Office / Department"}>
                <Input
                  placeholder={isAlumni ? "e.g. Class of 2015 · BSc Computer Science" : undefined}
                  {...form.register("subtitle")}
                />
              </FormField>
              <FormField label="Phone" hint={form.watch("showPhone") ? "Shown on the public page" : "Hidden on the public page"}>
                <Input {...form.register("phone")} />
                <label className="mt-1 flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
                  <input type="checkbox" className="h-3.5 w-3.5 rounded border-input" {...form.register("showPhone")} />
                  Show phone number publicly
                </label>
              </FormField>
              <FormField label="Email" error={errors.email?.message}>
                <Input type="email" {...form.register("email")} />
              </FormField>
              <FormField label="Location">
                <Input {...form.register("location")} />
              </FormField>
              {isBusiness && (
                <FormField label="Opening Hours">
                  <Input placeholder="e.g. Mon-Fri: 8AM-6PM" {...form.register("hours")} />
                </FormField>
              )}
              {isBusiness && (
                <FormField
                  label="Google Maps Search"
                  hint="Place name and area, a Plus Code, or lat,lng"
                >
                  <Input
                    placeholder="e.g. Green Cafe, University of Cape Coast"
                    {...form.register("mapQuery")}
                  />
                </FormField>
              )}
              {(isBusiness || isAlumni) && (
                <FormField label={isAlumni ? "LinkedIn or Website" : "Website"} error={errors.websiteUrl?.message}>
                  <Input placeholder="https://" {...form.register("websiteUrl")} />
                </FormField>
              )}
              <FormField
                label="Tags (optional)"
                hint="Separate with commas, e.g. Class of 2015, Mentor"
                error={errors.tags?.message}
                className="sm:col-span-2"
              >
                <Input placeholder="e.g. Class of 2015, Mentor" {...form.register("tags")} />
                <TagBadges tags={parseTags(form.watch("tags"))} />
              </FormField>
              <FormField label="Display Order" hint="Lower numbers appear first">
                <Input type="number" min={0} {...form.register("sortOrder", { valueAsNumber: true })} />
              </FormField>
            </div>

            <Controller
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FileUploadField
                  label={isBusiness ? "Business Logo (optional)" : "Photo (optional)"}
                  helpText={
                    isBusiness
                      ? "JPEG, PNG, or WebP. Shown uncropped on a white tile — a PNG with a transparent background looks best."
                      : "JPEG, PNG, or WebP. Square images look best."
                  }
                  folder="directory-photos"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            {isAdminOnly ? (
              <p className="rounded-md bg-secondary px-3 py-2 text-sm text-muted-foreground">
                {CATEGORY_LABELS[form.watch("category")]} entries are kept in the admin only and
                are never shown on the public Yellow Pages.
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="directory-is-active"
                  className="h-4 w-4 rounded border-input"
                  {...form.register("isActive")}
                />
                <Label htmlFor="directory-is-active" className="cursor-pointer">
                  Visible on the public Yellow Pages
                </Label>
              </div>
            )}

            <DialogFooter className="items-center sm:justify-between">
              <a
                href="/yellow-pages"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
              >
                View public page <ExternalLink className="size-3.5" />
              </a>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Add Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
