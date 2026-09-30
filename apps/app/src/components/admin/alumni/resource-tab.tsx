import { useState } from "react"
import type { ReactNode } from "react"
import { Controller, useForm } from "react-hook-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"
import { api, ApiError } from "#/lib/api-client"
import { FileUploadField } from "#/components/file-upload-field"
import { FormField } from "#/components/form-field"
import { Pagination } from "#/components/pagination"
import { Button } from "#/components/ui/button.tsx"
import { Input } from "#/components/ui/input.tsx"
import { Textarea } from "#/components/ui/textarea.tsx"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog.tsx"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select.tsx"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table.tsx"

// A small config-driven list + form for the Alumni admin collections
// (projects, executives, gallery, donation channels, donations). Each field
// maps an API body key to an input; the API does the real validation and its
// messages are shown as toasts.

export type FieldType = "text" | "textarea" | "number" | "select" | "image" | "checkbox" | "date"

export interface FieldDef {
  name: string
  label: string
  type: FieldType
  required?: boolean
  hint?: string
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  wide?: boolean
}

export interface Column<T> {
  header: string
  cell: (item: T) => ReactNode
  className?: string
}

export type FormValues = Record<string, string | boolean | undefined>

// Rows per page on every Alumni admin tab.
export const PAGE_SIZE = 12

export const errorMessage = (fallback: string) => (err: unknown) =>
  toast.error(err instanceof ApiError ? err.message : fallback)

// Form strings → API body: blank text becomes "" (the API stores NULL),
// numbers are parsed, and blank numbers become null.
export function toBody(fields: Array<FieldDef>, values: FormValues) {
  const body: Record<string, unknown> = {}
  for (const f of fields) {
    const v = values[f.name]
    if (f.type === "checkbox") body[f.name] = Boolean(v)
    else if (f.type === "number") body[f.name] = v === "" || v === undefined ? null : Number(v)
    else if (f.type === "image") body[f.name] = v ?? ""
    else if (f.type === "select" && (v === "" || v === undefined)) continue
    else body[f.name] = v ?? ""
  }
  return body
}

export function RecordDialog({
  title,
  fields,
  initial,
  onSubmit,
  saving,
  onClose,
}: {
  title: string
  fields: Array<FieldDef>
  initial: FormValues
  onSubmit: (values: FormValues) => void
  saving: boolean
  onClose: () => void
}) {
  const form = useForm<FormValues>({ defaultValues: initial })
  const errors = form.formState.errors

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => {
              const wide = f.wide || f.type === "textarea" || f.type === "image"
              const error = errors[f.name] ? "Required" : undefined
              if (f.type === "checkbox") {
                return (
                  <label key={f.name} className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm font-medium">
                    <input type="checkbox" className="h-4 w-4 rounded border-input" {...form.register(f.name)} />
                    {f.label}
                  </label>
                )
              }
              if (f.type === "image") {
                return (
                  <div key={f.name} className="sm:col-span-2">
                    <Controller
                      control={form.control}
                      name={f.name}
                      rules={{ required: f.required }}
                      render={({ field }) => (
                        <FileUploadField
                          label={f.label}
                          helpText={f.hint}
                          folder="alumni-images"
                          value={field.value as string | undefined}
                          onChange={field.onChange}
                        />
                      )}
                    />
                    {error && <p className="mt-1 text-xs text-destructive">Add an image.</p>}
                  </div>
                )
              }
              return (
                <FormField
                  key={f.name}
                  label={f.required ? f.label : `${f.label} (optional)`}
                  hint={f.hint}
                  error={error}
                  className={wide ? "sm:col-span-2" : undefined}
                >
                  {f.type === "textarea" ? (
                    <Textarea rows={3} placeholder={f.placeholder} {...form.register(f.name, { required: f.required })} />
                  ) : f.type === "select" ? (
                    <Controller
                      control={form.control}
                      name={f.name}
                      rules={{ required: f.required }}
                      render={({ field }) => (
                        <Select value={(field.value as string | undefined) ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full" aria-invalid={Boolean(error)}>
                            <SelectValue placeholder={f.placeholder ?? "Choose…"} />
                          </SelectTrigger>
                          <SelectContent>
                            {(f.options ?? []).map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  ) : (
                    <Input
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      step={f.type === "number" ? "0.01" : undefined}
                      min={f.type === "number" ? 0 : undefined}
                      placeholder={f.placeholder}
                      aria-invalid={Boolean(error)}
                      {...form.register(f.name, { required: f.required })}
                    />
                  )}
                </FormField>
              )
            })}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ResourceTab<T extends { id: number }>({
  endpoint,
  singular,
  description,
  fields,
  columns,
  toForm,
  searchText,
  canEdit,
  emptyText,
}: {
  endpoint: string
  singular: string
  description: string
  fields: Array<FieldDef>
  columns: Array<Column<T>>
  toForm: (item: T | null) => FormValues
  searchText: (item: T) => string
  canEdit: boolean
  emptyText: string
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<T | null | "new">(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const queryKey = ["alumni", "admin", endpoint]
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => api.get<{ items: Array<T> }>(`/alumni/${endpoint}`),
  })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["alumni"] })

  const save = useMutation({
    mutationFn: ({ id, values }: { id?: number; values: FormValues }) => {
      const body = toBody(fields, values)
      return id ? api.patch(`/alumni/${endpoint}/${id}`, body) : api.post(`/alumni/${endpoint}`, body)
    },
    onSuccess: (_d, { id }) => {
      toast.success(id ? `${singular} updated.` : `${singular} added.`)
      setEditing(null)
      invalidate()
    },
    onError: errorMessage("Couldn't save."),
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/alumni/${endpoint}/${id}`),
    onSuccess: () => {
      toast.success(`${singular} deleted.`)
      invalidate()
    },
    onError: errorMessage("Couldn't delete."),
  })

  const q = search.trim().toLowerCase()
  const items = (data?.items ?? []).filter((i) => !q || searchText(i).toLowerCase().includes(q))
  const currentPage = Math.min(page, Math.max(1, Math.ceil(items.length / PAGE_SIZE)))
  const pageItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex items-center gap-2">
          <div className="relative w-52">
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
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" /> Add {singular.toLowerCase()}
            </Button>
          )}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((c) => (
                <TableHead key={c.header} className={c.className}>
                  {c.header}
                </TableHead>
              ))}
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(isLoading || items.length === 0) && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length + 1} className="py-8 text-center text-muted-foreground">
                  {isLoading ? "Loading..." : q ? "Nothing matches your search." : emptyText}
                </TableCell>
              </TableRow>
            )}
            {pageItems.map((item) => (
              <TableRow key={item.id}>
                {columns.map((c) => (
                  <TableCell key={c.header} className={c.className}>
                    {c.cell(item)}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  {canEdit && (
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${singular.toLowerCase()}`} onClick={() => setEditing(item)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${singular.toLowerCase()}`}
                        disabled={remove.isPending}
                        onClick={() => {
                          if (confirm(`Delete this ${singular.toLowerCase()}? This can't be undone.`)) remove.mutate(item.id)
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
        {items.length > PAGE_SIZE && (
          <Pagination page={currentPage} pageSize={PAGE_SIZE} total={items.length} onPageChange={setPage} />
        )}
      </div>
      {editing && (
        <RecordDialog
          title={editing === "new" ? `Add ${singular.toLowerCase()}` : `Edit ${singular.toLowerCase()}`}
          fields={fields}
          initial={toForm(editing === "new" ? null : editing)}
          saving={save.isPending}
          onSubmit={(values) => save.mutate({ id: editing === "new" ? undefined : editing.id, values })}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
