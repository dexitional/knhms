import { useState } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ChevronDown, ExternalLink, ImageIcon, Pencil, Plus, Trash2, X } from "lucide-react"
import { api, ApiError } from "#/lib/api-client"
import { cn } from "#/lib/utils"
import { FRESHMEN_ICON_NAMES, TOPIC_LAYOUT_LABELS } from "#/lib/freshmen"
import type { FreshmenContent, FreshmenFaq, FreshmenGuide, FreshmenSection, FreshmenTopic } from "#/lib/freshmen"
import { FRESHMEN_ICONS, freshmenIcon } from "#/components/freshmen-icons"
import { FileUploadField } from "#/components/file-upload-field"
import { FormField } from "#/components/form-field"
import { RichTextEditor } from "#/components/rich-text-editor"
import { Badge } from "#/components/ui/badge.tsx"
import { Button } from "#/components/ui/button.tsx"
import { Input } from "#/components/ui/input.tsx"
import { Textarea } from "#/components/ui/textarea.tsx"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog.tsx"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "#/components/ui/select.tsx"
import { canManage } from "#/lib/permissions"

export const Route = createFileRoute("/admin/_admin/freshmen/")({
  component: FreshmenAdminPage,
})

const QUERY_KEY = ["freshmen", "admin"]

const errorMessage = (fallback: string) => (err: unknown) =>
  toast.error(err instanceof ApiError ? err.message : fallback)

// Next free position after the siblings, so new items land at the end.
const nextOrder = (items: Array<{ sort_order: number }>) =>
  items.length === 0 ? 0 : Math.max(...items.map((i) => i.sort_order)) + 1

const isRichEmpty = (html: string) => html.replace(/<[^>]*>/g, "").trim() === "" && !/<img\s/i.test(html)

type DialogState =
  | { kind: "guide"; editing: FreshmenGuide | null }
  | { kind: "section"; editing: FreshmenSection | null; guideId: number }
  | { kind: "topic"; editing: FreshmenTopic | null; sectionId: number }
  | { kind: "faq"; editing: FreshmenFaq | null }

function FreshmenAdminPage() {
  const { admin } = Route.useRouteContext()
  const canEdit = canManage(admin.role, "freshmen")
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<"guides" | "faqs">("guides")
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<FreshmenContent>("/freshmen"),
  })
  const guides = data?.guides ?? []
  const faqs = data?.faqs ?? []
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["freshmen"] })

  const patch = useMutation({
    mutationFn: ({ path, body }: { path: string; body: object }) => api.patch(path, body),
    onSuccess: invalidate,
    onError: errorMessage("Couldn't update."),
  })
  const remove = useMutation({
    mutationFn: (path: string) => api.delete(path),
    onSuccess: () => {
      toast.success("Deleted.")
      invalidate()
    },
    onError: errorMessage("Couldn't delete."),
  })
  const confirmDelete = (path: string, message: string) => {
    if (confirm(message)) remove.mutate(path)
  }
  const toggleCollapsed = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Freshmen Guide</h1>
          <p className="text-sm text-muted-foreground">
            Guides, sections and topics on the Freshmen page, plus the FAQs. The journey infographic, stats and mandatory
            checklist are built from these automatically.
          </p>
        </div>
        <a
          href="/freshmen"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          View public page <ExternalLink className="size-3.5" />
        </a>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-secondary p-1" role="tablist">
          {(
            [
              ["guides", "Guides", guides.length],
              ["faqs", "FAQs", faqs.length],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                tab === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              <span className="ml-1.5 text-xs text-muted-foreground">{count}</span>
            </button>
          ))}
        </div>
        {canEdit &&
          (tab === "guides" ? (
            <Button onClick={() => setDialog({ kind: "guide", editing: null })}>
              <Plus className="size-4" /> Add guide
            </Button>
          ) : (
            <Button onClick={() => setDialog({ kind: "faq", editing: null })}>
              <Plus className="size-4" /> Add FAQ
            </Button>
          ))}
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}

      {tab === "guides" && !isLoading && (
        <div className="flex flex-col gap-4">
          {guides.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              No guides yet. Add the first one to build the Freshmen page.
            </p>
          )}
          {guides.map((guide, gi) => {
            const GuideIcon = freshmenIcon(guide.icon)
            const open = !collapsed.has(guide.id)
            return (
              <div key={guide.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex flex-wrap items-center gap-3 border-b border-border bg-secondary/40 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleCollapsed(guide.id)}
                    aria-expanded={open}
                    aria-label={open ? `Collapse ${guide.title}` : `Expand ${guide.title}`}
                    className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} />
                  </button>
                  {guide.image_url ? (
                    <img src={guide.image_url} alt="" className="size-10 rounded-lg object-cover" />
                  ) : (
                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-white">
                      <GuideIcon className="size-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                      Guide {gi + 1} · order {guide.sort_order}
                    </p>
                    <p className="font-semibold text-foreground">{guide.title}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant={guide.is_published ? "success" : "secondary"}>
                      {guide.is_published ? "Published" : "Draft"}
                    </Badge>
                    {canEdit && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={patch.isPending}
                          onClick={() =>
                            patch.mutate({ path: `/freshmen/guides/${guide.id}`, body: { isPublished: !guide.is_published } })
                          }
                        >
                          {guide.is_published ? "Unpublish" : "Publish"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDialog({ kind: "section", editing: null, guideId: guide.id })}
                        >
                          <Plus className="size-4" /> Section
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${guide.title}`}
                          onClick={() => setDialog({ kind: "guide", editing: guide })}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${guide.title}`}
                          disabled={remove.isPending}
                          onClick={() =>
                            confirmDelete(
                              `/freshmen/guides/${guide.id}`,
                              `Delete the guide "${guide.title}" with all its sections and topics? This can't be undone.`,
                            )
                          }
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {open && (
                  <div className="flex flex-col divide-y divide-border">
                    {guide.summary && <p className="px-4 py-3 text-sm text-muted-foreground">{guide.summary}</p>}
                    {guide.sections.length === 0 && (
                      <p className="px-4 py-3 text-sm text-muted-foreground">No sections yet.</p>
                    )}
                    {guide.sections.map((section) => (
                      <div key={section.id} className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="min-w-0 flex-1 font-medium text-foreground">
                            {section.title}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">order {section.sort_order}</span>
                          </p>
                          {section.is_mandatory === 1 && <Badge variant="warning">Mandatory</Badge>}
                          {section.image_url && (
                            <Badge variant="secondary">
                              <ImageIcon className="size-3" /> Image
                            </Badge>
                          )}
                          <Badge variant={section.is_published ? "success" : "secondary"}>
                            {section.is_published ? "Published" : "Draft"}
                          </Badge>
                          {canEdit && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={patch.isPending}
                                onClick={() =>
                                  patch.mutate({
                                    path: `/freshmen/sections/${section.id}`,
                                    body: { isPublished: !section.is_published },
                                  })
                                }
                              >
                                {section.is_published ? "Unpublish" : "Publish"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDialog({ kind: "topic", editing: null, sectionId: section.id })}
                              >
                                <Plus className="size-4" /> Topic
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Edit ${section.title}`}
                                onClick={() => setDialog({ kind: "section", editing: section, guideId: guide.id })}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Delete ${section.title}`}
                                disabled={remove.isPending}
                                onClick={() =>
                                  confirmDelete(
                                    `/freshmen/sections/${section.id}`,
                                    `Delete the section "${section.title}" and its topics? This can't be undone.`,
                                  )
                                }
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                        {section.topics.length > 0 && (
                          <ul className="mt-2 ml-3 flex flex-col border-l-2 border-border">
                            {section.topics.map((topic) => (
                              <li key={topic.id} className="flex flex-wrap items-center gap-2 py-1 pl-3 text-sm">
                                <span className="min-w-0 flex-1 text-foreground/90">
                                  {topic.title}
                                  <span className="ml-2 text-xs text-muted-foreground">order {topic.sort_order}</span>
                                </span>
                                {topic.layout !== "text" && (
                                  <Badge variant="secondary">
                                    {topic.layout === "steps" ? "Steps" : "Cards"} · {topic.items?.length ?? 0}
                                  </Badge>
                                )}
                                {canEdit && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      aria-label={`Edit ${topic.title}`}
                                      onClick={() => setDialog({ kind: "topic", editing: topic, sectionId: section.id })}
                                    >
                                      <Pencil className="size-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      aria-label={`Delete ${topic.title}`}
                                      disabled={remove.isPending}
                                      onClick={() =>
                                        confirmDelete(`/freshmen/topics/${topic.id}`, `Delete the topic "${topic.title}"?`)
                                      }
                                    >
                                      <Trash2 className="size-4 text-destructive" />
                                    </Button>
                                  </>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === "faqs" && !isLoading && (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {faqs.length === 0 && <p className="p-8 text-center text-muted-foreground">No FAQs yet.</p>}
          {faqs.map((faq) => (
            <div key={faq.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
              <p className="min-w-0 flex-1 font-medium text-foreground">
                {faq.question}
                <span className="ml-2 text-xs font-normal text-muted-foreground">order {faq.sort_order}</span>
              </p>
              <Badge variant={faq.is_published ? "success" : "secondary"}>{faq.is_published ? "Published" : "Draft"}</Badge>
              {canEdit && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={patch.isPending}
                    onClick={() => patch.mutate({ path: `/freshmen/faqs/${faq.id}`, body: { isPublished: !faq.is_published } })}
                  >
                    {faq.is_published ? "Unpublish" : "Publish"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${faq.question}`}
                    onClick={() => setDialog({ kind: "faq", editing: faq })}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${faq.question}`}
                    disabled={remove.isPending}
                    onClick={() => confirmDelete(`/freshmen/faqs/${faq.id}`, `Delete the FAQ "${faq.question}"?`)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {dialog?.kind === "guide" && (
        <GuideDialog
          editing={dialog.editing}
          defaultOrder={nextOrder(guides)}
          onClose={() => setDialog(null)}
          onSaved={invalidate}
        />
      )}
      {dialog?.kind === "section" && (
        <SectionDialog
          editing={dialog.editing}
          guideId={dialog.guideId}
          guides={guides}
          onClose={() => setDialog(null)}
          onSaved={invalidate}
        />
      )}
      {dialog?.kind === "topic" && (
        <TopicDialog
          editing={dialog.editing}
          sectionId={dialog.sectionId}
          guides={guides}
          onClose={() => setDialog(null)}
          onSaved={invalidate}
        />
      )}
      {dialog?.kind === "faq" && (
        <FaqDialog editing={dialog.editing} defaultOrder={nextOrder(faqs)} onClose={() => setDialog(null)} onSaved={invalidate} />
      )}
    </div>
  )
}

// ---- Shared form bits ------------------------------------------------------------

const sortOrderField = z.coerce.number().int().min(0).max(9999)

function useSave(label: string, isEdit: boolean, onSaved: () => void, onClose: () => void) {
  return {
    onSuccess: () => {
      toast.success(isEdit ? `${label} updated.` : `${label} added.`)
      onSaved()
      onClose()
    },
    onError: errorMessage("Couldn't save."),
  }
}

function IconPicker({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-10" role="radiogroup" aria-label="Icon">
      {FRESHMEN_ICON_NAMES.map((name) => {
        const Icon = FRESHMEN_ICONS[name]
        const selected = value === name
        return (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={name}
            title={name}
            onClick={() => onChange(name)}
            className={cn(
              "flex aspect-square items-center justify-center rounded-md border transition-colors",
              selected ? "border-primary bg-primary text-white" : "border-border text-muted-foreground hover:border-primary hover:text-primary",
            )}
          >
            <Icon className="size-4" />
          </button>
        )
      })}
    </div>
  )
}

function CheckboxField({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
      <input type="checkbox" className="h-4 w-4 rounded border-input" {...props} />
      {label}
    </label>
  )
}

// ---- Guide -------------------------------------------------------------------------

const guideSchema = z.object({
  title: z.string().trim().min(2, "Required").max(150),
  summary: z.string().max(500),
  icon: z.string(),
  imageUrl: z.string().url().optional(),
  sortOrder: sortOrderField,
  isPublished: z.boolean(),
})

function GuideDialog({
  editing,
  defaultOrder,
  onClose,
  onSaved,
}: {
  editing: FreshmenGuide | null
  defaultOrder: number
  onClose: () => void
  onSaved: () => void
}) {
  const form = useForm<z.input<typeof guideSchema>, unknown, z.output<typeof guideSchema>>({
    resolver: zodResolver(guideSchema),
    defaultValues: {
      title: editing?.title ?? "",
      summary: editing?.summary ?? "",
      icon: editing?.icon ?? "book-open",
      imageUrl: editing?.image_url ?? undefined,
      sortOrder: editing?.sort_order ?? defaultOrder,
      isPublished: editing ? editing.is_published === 1 : true,
    },
  })
  const errors = form.formState.errors
  const mutation = useMutation({
    mutationFn: (v: z.output<typeof guideSchema>) => {
      const body = { ...v, imageUrl: v.imageUrl ?? "" }
      return editing ? api.patch(`/freshmen/guides/${editing.id}`, body) : api.post("/freshmen/guides", body)
    },
    ...useSave("Guide", !!editing, onSaved, onClose),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit guide" : "Add guide"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <FormField label="Title" error={errors.title?.message}>
            <Input placeholder="e.g. Before you arrive" {...form.register("title")} />
          </FormField>
          <FormField label="Summary" hint="Shown on the guide banner and in the journey infographic">
            <Textarea rows={2} {...form.register("summary")} />
          </FormField>
          <FormField label="Icon" hint="Used on the banner and the journey infographic">
            <Controller
              control={form.control}
              name="icon"
              render={({ field }) => <IconPicker value={field.value} onChange={field.onChange} />}
            />
          </FormField>
          <FileUploadField
            label="Cover image (optional)"
            helpText="Shown behind the guide banner with the theme colour over it. Landscape works best."
            folder="hub-images"
            value={form.watch("imageUrl")}
            onChange={(url) => form.setValue("imageUrl", url, { shouldDirty: true })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Display order" hint="Lower numbers come first" error={errors.sortOrder?.message}>
              <Input type="number" min={0} {...form.register("sortOrder")} />
            </FormField>
            <div className="flex items-end pb-2">
              <CheckboxField label="Published" {...form.register("isPublished")} />
            </div>
          </div>
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

// ---- Section -----------------------------------------------------------------------

const sectionSchema = z.object({
  guideId: z.coerce.number().int().positive(),
  title: z.string().trim().min(2, "Required").max(150),
  intro: z.string().max(500_000),
  imageUrl: z.string().url().optional(),
  isMandatory: z.boolean(),
  sortOrder: sortOrderField,
  isPublished: z.boolean(),
})

function SectionDialog({
  editing,
  guideId,
  guides,
  onClose,
  onSaved,
}: {
  editing: FreshmenSection | null
  guideId: number
  guides: Array<FreshmenGuide>
  onClose: () => void
  onSaved: () => void
}) {
  const siblings = guides.find((g) => g.id === guideId)?.sections ?? []
  const form = useForm<z.input<typeof sectionSchema>, unknown, z.output<typeof sectionSchema>>({
    resolver: zodResolver(sectionSchema),
    defaultValues: {
      guideId,
      title: editing?.title ?? "",
      intro: editing?.intro ?? "",
      imageUrl: editing?.image_url ?? undefined,
      isMandatory: editing?.is_mandatory === 1,
      sortOrder: editing?.sort_order ?? nextOrder(siblings),
      isPublished: editing ? editing.is_published === 1 : true,
    },
  })
  const errors = form.formState.errors
  const mutation = useMutation({
    mutationFn: (v: z.output<typeof sectionSchema>) => {
      const body = { ...v, intro: isRichEmpty(v.intro) ? "" : v.intro, imageUrl: v.imageUrl ?? "" }
      return editing ? api.patch(`/freshmen/sections/${editing.id}`, body) : api.post("/freshmen/sections", body)
    },
    ...useSave("Section", !!editing, onSaved, onClose),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit section" : "Add section"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Guide">
              <Controller
                control={form.control}
                name="guideId"
                render={({ field }) => (
                  <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {guides.map((g, i) => (
                        <SelectItem key={g.id} value={String(g.id)}>
                          Guide {i + 1}: {g.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Title" error={errors.title?.message}>
              <Input placeholder="e.g. Register on the KNH portal" {...form.register("title")} />
            </FormField>
          </div>
          <FormField label="Introduction (optional)" hint="Shown under the section heading, before its topics">
            <Controller
              control={form.control}
              name="intro"
              render={({ field }) => (
                <RichTextEditor value={field.value} onChange={field.onChange} placeholder="A short introduction…" />
              )}
            />
          </FormField>
          <FileUploadField
            label="Image (optional)"
            helpText="Shown wide under the introduction. Landscape works best."
            folder="hub-images"
            value={form.watch("imageUrl")}
            onChange={(url) => form.setValue("imageUrl", url, { shouldDirty: true })}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Display order" error={errors.sortOrder?.message}>
              <Input type="number" min={0} {...form.register("sortOrder")} />
            </FormField>
            <div className="flex items-end pb-2">
              <CheckboxField label="Mandatory" {...form.register("isMandatory")} />
            </div>
            <div className="flex items-end pb-2">
              <CheckboxField label="Published" {...form.register("isPublished")} />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            Mandatory sections get a badge and appear in the page's mandatory checklist.
          </p>
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

// ---- Topic -------------------------------------------------------------------------

const topicSchema = z
  .object({
    sectionId: z.coerce.number().int().positive(),
    title: z.string().trim().min(2, "Required").max(150),
    body: z.string().max(500_000),
    layout: z.enum(["text", "steps", "cards"]),
    items: z.array(
      z.object({
        title: z.string().trim().min(1, "Required").max(150),
        note: z.string().max(300),
        icon: z.string(),
      }),
    ),
    sortOrder: sortOrderField,
  })
  .refine((t) => !isRichEmpty(t.body) || (t.layout !== "text" && t.items.length > 0), {
    message: "Add some content, or items for the steps/cards layout.",
    path: ["body"],
  })

function TopicDialog({
  editing,
  sectionId,
  guides,
  onClose,
  onSaved,
}: {
  editing: FreshmenTopic | null
  sectionId: number
  guides: Array<FreshmenGuide>
  onClose: () => void
  onSaved: () => void
}) {
  const siblings = guides.flatMap((g) => g.sections).find((s) => s.id === sectionId)?.topics ?? []
  const form = useForm<z.input<typeof topicSchema>, unknown, z.output<typeof topicSchema>>({
    resolver: zodResolver(topicSchema),
    defaultValues: {
      sectionId,
      title: editing?.title ?? "",
      body: editing?.body ?? "",
      layout: editing?.layout ?? "text",
      items: (editing?.items ?? []).map((i) => ({ title: i.title, note: i.note ?? "", icon: i.icon ?? "sparkles" })),
      sortOrder: editing?.sort_order ?? nextOrder(siblings),
    },
  })
  const errors = form.formState.errors
  const items = useFieldArray({ control: form.control, name: "items" })
  const layout = form.watch("layout")

  const mutation = useMutation({
    mutationFn: (v: z.output<typeof topicSchema>) => {
      const body = {
        ...v,
        body: isRichEmpty(v.body) ? "" : v.body,
        items:
          v.layout === "text"
            ? null
            : v.items.map((i) => ({ title: i.title, note: i.note, icon: v.layout === "cards" ? i.icon : null })),
      }
      return editing ? api.patch(`/freshmen/topics/${editing.id}`, body) : api.post("/freshmen/topics", body)
    },
    ...useSave("Topic", !!editing, onSaved, onClose),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit topic" : "Add topic"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Section">
              <Controller
                control={form.control}
                name="sectionId"
                render={({ field }) => (
                  <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {guides.map((g, i) => (
                        <SelectGroup key={g.id}>
                          <SelectLabel>
                            Guide {i + 1}: {g.title}
                          </SelectLabel>
                          {g.sections.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.title}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Title" error={errors.title?.message}>
              <Input placeholder="e.g. Step by step" {...form.register("title")} />
            </FormField>
          </div>
          <FormField label="Content" error={errors.body?.message} hint="Blockquotes are shown as highlighted callouts">
            <Controller
              control={form.control}
              name="body"
              render={({ field }) => (
                <RichTextEditor value={field.value} onChange={field.onChange} invalid={Boolean(errors.body)} />
              )}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Layout">
              <Controller
                control={form.control}
                name="layout"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TOPIC_LAYOUT_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Display order" error={errors.sortOrder?.message}>
              <Input type="number" min={0} {...form.register("sortOrder")} />
            </FormField>
          </div>

          {layout !== "text" && (
            <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-3">
              <legend className="px-1 text-sm font-medium">
                {layout === "steps" ? "Steps (shown as a numbered timeline)" : "Cards (shown as an icon grid)"}
              </legend>
              {items.fields.length === 0 && <p className="text-sm text-muted-foreground">No items yet.</p>}
              {items.fields.map((item, i) => (
                <div key={item.id} className="flex items-start gap-2">
                  <span className="mt-2 w-5 shrink-0 text-right text-xs font-semibold text-muted-foreground">{i + 1}.</span>
                  {layout === "cards" && (
                    <Controller
                      control={form.control}
                      name={`items.${i}.icon`}
                      render={({ field }) => {
                        const Current = freshmenIcon(field.value)
                        return (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-16 shrink-0" aria-label="Icon">
                              <Current className="size-4" />
                            </SelectTrigger>
                            <SelectContent>
                              {FRESHMEN_ICON_NAMES.map((name) => {
                                const Icon = FRESHMEN_ICONS[name]
                                return (
                                  <SelectItem key={name} value={name}>
                                    <Icon className="size-4" /> {name}
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        )
                      }}
                    />
                  )}
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                    <Input
                      placeholder={layout === "steps" ? "What to do" : "Title"}
                      aria-label="Item title"
                      aria-invalid={Boolean(errors.items?.[i]?.title)}
                      {...form.register(`items.${i}.title`)}
                    />
                    <Input placeholder="Note (optional)" aria-label="Item note" {...form.register(`items.${i}.note`)} />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove item ${i + 1}`}
                    onClick={() => items.remove(i)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              {items.fields.length < 24 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => items.append({ title: "", note: "", icon: "sparkles" })}
                >
                  <Plus className="size-4" /> Add {layout === "steps" ? "step" : "card"}
                </Button>
              )}
            </fieldset>
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

// ---- FAQ ---------------------------------------------------------------------------

const faqSchema = z
  .object({
    question: z.string().trim().min(5, "Required").max(255),
    answer: z.string().max(500_000),
    sortOrder: sortOrderField,
    isPublished: z.boolean(),
  })
  .refine((f) => !isRichEmpty(f.answer), { message: "Add the answer.", path: ["answer"] })

function FaqDialog({
  editing,
  defaultOrder,
  onClose,
  onSaved,
}: {
  editing: FreshmenFaq | null
  defaultOrder: number
  onClose: () => void
  onSaved: () => void
}) {
  const form = useForm<z.input<typeof faqSchema>, unknown, z.output<typeof faqSchema>>({
    resolver: zodResolver(faqSchema),
    defaultValues: {
      question: editing?.question ?? "",
      answer: editing?.answer ?? "",
      sortOrder: editing?.sort_order ?? defaultOrder,
      isPublished: editing ? editing.is_published === 1 : true,
    },
  })
  const errors = form.formState.errors
  const mutation = useMutation({
    mutationFn: (v: z.output<typeof faqSchema>) =>
      editing ? api.patch(`/freshmen/faqs/${editing.id}`, v) : api.post("/freshmen/faqs", v),
    ...useSave("FAQ", !!editing, onSaved, onClose),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit FAQ" : "Add FAQ"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <FormField label="Question" error={errors.question?.message}>
            <Input {...form.register("question")} />
          </FormField>
          <FormField label="Answer" error={errors.answer?.message}>
            <Controller
              control={form.control}
              name="answer"
              render={({ field }) => (
                <RichTextEditor value={field.value} onChange={field.onChange} invalid={Boolean(errors.answer)} />
              )}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Display order" error={errors.sortOrder?.message}>
              <Input type="number" min={0} {...form.register("sortOrder")} />
            </FormField>
            <div className="flex items-end pb-2">
              <CheckboxField label="Published" {...form.register("isPublished")} />
            </div>
          </div>
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
