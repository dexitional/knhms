import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ExternalLink,
  ImageIcon,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from 'lucide-react'
import { api, ApiError } from '#/lib/api-client'
import { formatDate } from '#/lib/sellers'
import { cn } from '#/lib/utils'
import { FileUploadField } from '#/components/file-upload-field'
import { FormField } from '#/components/form-field'
import { RichTextEditor } from '#/components/rich-text-editor'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'

export const Route = createFileRoute('/admin/_admin/hub/')({
  component: HubAdminPage,
})

type PostType = 'spotlight' | 'announcement' | 'news' | 'event'

interface HubPost {
  id: number
  type: PostType
  title: string
  excerpt: string | null
  body: string | null
  category: string | null
  category_url: string | null
  link_url: string | null
  image_url: string | null
  published_on: string
  event_start: string | null
  event_end: string | null
  event_time: string | null
  location: string | null
  is_featured: 0 | 1
  is_published: 0 | 1
  sort_order: number
}

const TABS: Array<{
  type: PostType
  label: string
  singular: string
  hint: string
}> = [
  {
    type: 'spotlight',
    label: 'Spotlights',
    singular: 'Spotlight',
    hint: 'Slides in the hero carousel at the top of the KNH Hub (up to 5 shown).',
  },
  {
    type: 'announcement',
    label: 'Announcements',
    singular: 'Announcement',
    hint: 'The Latest Announcements cards (6 most recent shown).',
  },
  {
    type: 'news',
    label: 'News',
    singular: 'News story',
    hint: 'The Latest News cards.',
  },
  {
    type: 'event',
    label: 'Events',
    singular: 'Event',
    hint: 'Upcoming Events. Past events drop off the page automatically; the featured one gets the banner.',
  },
]

const ANNOUNCEMENT_CATEGORIES = ['Important', 'General']
const NEWS_CATEGORIES = [
  'General',
  'Hall Life',
  'Student in Focus',
  'Sports',
  'Academics',
]

const errorMessage = (fallback: string) => (err: unknown) =>
  toast.error(err instanceof ApiError ? err.message : fallback)

function today() {
  return new Date().toISOString().slice(0, 10)
}

function HubAdminPage() {
  const { admin } = Route.useRouteContext()
  const canEdit = admin.role === 'super_admin' || admin.role === 'admin'
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<PostType>('spotlight')
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<{ editing: HubPost | null } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['hub', 'posts'],
    queryFn: () => api.get<{ posts: Array<HubPost> }>('/hub/posts'),
  })
  const posts = data?.posts ?? []
  const current = TABS.find((t) => t.type === tab)!

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['hub'] })

  const patchMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) =>
      api.patch(`/hub/posts/${id}`, body),
    onSuccess: invalidate,
    onError: errorMessage("Couldn't update the post."),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/hub/posts/${id}`),
    onSuccess: () => {
      toast.success('Deleted.')
      invalidate()
    },
    onError: errorMessage("Couldn't delete the post."),
  })

  const query = search.trim().toLowerCase()
  const visible = posts.filter(
    (p) =>
      p.type === tab &&
      (!query ||
        [p.title, p.excerpt, p.category, p.location].some((f) =>
          f?.toLowerCase().includes(query),
        )),
  )
  const isPastEvent = (p: HubPost) =>
    p.type === 'event' && (p.event_end ?? p.event_start ?? '') < today()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">KNH Hub</h1>
          <p className="text-sm text-muted-foreground">
            Spotlights, announcements, news, and events on the KNH Hub page.
          </p>
        </div>
        <a
          href="/knh-hub"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          View public page <ExternalLink className="size-3.5" />
        </a>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap gap-1 rounded-lg bg-secondary p-1"
          role="tablist"
        >
          {TABS.map((t) => (
            <button
              key={t.type}
              type="button"
              role="tab"
              aria-selected={tab === t.type}
              onClick={() => setTab(t.type)}
              className={cn(
                'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                tab === t.type
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
              <span className="ml-1.5 text-xs text-muted-foreground">
                {posts.filter((p) => p.type === t.type).length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          {canEdit && (
            <Button onClick={() => setDialog({ editing: null })}>
              <Plus className="size-4" />
              Add {current.singular}
            </Button>
          )}
        </div>
      </div>
      <p className="-mt-3 text-sm text-muted-foreground">{current.hint}</p>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading && (
          <p className="px-6 py-4 text-muted-foreground">Loading...</p>
        )}
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Title</TableHead>
              <TableHead>
                {tab === 'event' ? 'Event date' : 'Category'}
              </TableHead>
              <TableHead>{tab === 'event' ? 'Venue' : 'Published'}</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && visible.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  Nothing here yet.
                </TableCell>
              </TableRow>
            )}
            {visible.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt=""
                        className="size-10 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                        <ImageIcon className="size-4" />
                      </div>
                    )}
                    <p className="line-clamp-2 max-w-80 font-medium text-foreground">
                      {p.title}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {p.type === 'event'
                    ? `${formatDate(p.event_start)}${p.event_end && p.event_end !== p.event_start ? ` – ${formatDate(p.event_end)}` : ''}`
                    : (p.category ?? '—')}
                </TableCell>
                <TableCell className="max-w-48 truncate">
                  {p.type === 'event'
                    ? (p.location ?? '—')
                    : formatDate(p.published_on)}
                </TableCell>
                <TableCell>{p.sort_order}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={p.is_published ? 'success' : 'secondary'}>
                      {p.is_published ? 'Published' : 'Draft'}
                    </Badge>
                    {p.is_featured === 1 && (
                      <Badge variant="warning">Featured</Badge>
                    )}
                    {isPastEvent(p) && <Badge variant="secondary">Past</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {canEdit && (
                    <div className="flex items-center justify-end gap-1">
                      {p.type === 'event' && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={
                            p.is_featured
                              ? `Unfeature ${p.title}`
                              : `Feature ${p.title}`
                          }
                          title={
                            p.is_featured
                              ? 'Remove Featured Event banner'
                              : 'Show as the Featured Event banner'
                          }
                          disabled={patchMutation.isPending}
                          onClick={() =>
                            patchMutation.mutate({
                              id: p.id,
                              body: { isFeatured: !p.is_featured },
                            })
                          }
                        >
                          <Star
                            className={cn(
                              'size-4',
                              p.is_featured && 'fill-amber-400 text-amber-400',
                            )}
                          />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={patchMutation.isPending}
                        onClick={() =>
                          patchMutation.mutate({
                            id: p.id,
                            body: { isPublished: !p.is_published },
                          })
                        }
                      >
                        {p.is_published ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${p.title}`}
                        onClick={() => setDialog({ editing: p })}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${p.title}`}
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (
                            confirm(
                              `Delete "${p.title}"? This can't be undone.`,
                            )
                          )
                            deleteMutation.mutate(p.id)
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

      {dialog && (
        <PostDialog
          key={dialog.editing?.id ?? `new-${tab}`}
          type={dialog.editing?.type ?? tab}
          editing={dialog.editing}
          onClose={() => setDialog(null)}
          onSaved={invalidate}
        />
      )}
    </div>
  )
}

// ---- Form ----------------------------------------------------------------------

const optionalUrl = z.union([
  z.literal(''),
  z.string().url('Enter a full URL, e.g. https://…'),
])
const optionalDate = z.union([
  z.literal(''),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
])

const formSchema = z
  .object({
    title: z.string().trim().min(3, 'Required').max(255),
    excerpt: z.string().max(1000),
    body: z.string().max(20_000),
    category: z.string().max(60),
    categoryUrl: optionalUrl,
    linkUrl: optionalUrl,
    imageUrl: z.string().url().optional(),
    publishedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Required'),
    eventStart: optionalDate,
    eventEnd: optionalDate,
    eventTime: z.string().max(60),
    location: z.string().max(255),
    isFeatured: z.boolean(),
    isPublished: z.boolean(),
    sortOrder: z.coerce.number().int().min(0).max(9999),
    // Only announcements and news require content; set per dialog below.
    contentRequired: z.boolean(),
  })
  .refine(
    (v) =>
      !v.contentRequired ||
      v.body.replace(/<[^>]*>/g, '').trim() !== '' ||
      /<img\s/i.test(v.body),
    {
      message: 'Add the content.',
      path: ['body'],
    },
  )
type FormInput = z.input<typeof formSchema>
type FormValues = z.output<typeof formSchema>

function toFormValues(p: HubPost | null, type: PostType): FormInput {
  return {
    contentRequired: type === 'announcement' || type === 'news',
    title: p?.title ?? '',
    excerpt: p?.excerpt ?? '',
    body: p?.body ?? '',
    category: p?.category ?? '',
    categoryUrl: p?.category_url ?? '',
    linkUrl: p?.link_url ?? '',
    imageUrl: p?.image_url ?? undefined,
    publishedOn: p?.published_on ?? today(),
    eventStart: p?.event_start ?? '',
    eventEnd: p?.event_end ?? '',
    eventTime: p?.event_time ?? '',
    location: p?.location ?? '',
    isFeatured: p?.is_featured === 1,
    isPublished: p ? p.is_published === 1 : true,
    sortOrder: p?.sort_order ?? 0,
  }
}

function PostDialog({
  type,
  editing,
  onClose,
  onSaved,
}: {
  type: PostType
  editing: HubPost | null
  onClose: () => void
  onSaved: () => void
}) {
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(editing, type),
  })
  const errors = form.formState.errors
  const label = TABS.find((t) => t.type === type)!.singular

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const { contentRequired: _, ...fields } = values
      const body = { ...fields, imageUrl: fields.imageUrl ?? '' }
      return editing
        ? api.patch(`/hub/posts/${editing.id}`, body)
        : api.post('/hub/posts', { ...body, type })
    },
    onSuccess: () => {
      toast.success(editing ? `${label} updated.` : `${label} added.`)
      onSaved()
      onClose()
    },
    onError: errorMessage("Couldn't save."),
  })

  const categories =
    type === 'announcement' ? ANNOUNCEMENT_CATEGORIES : NEWS_CATEGORIES

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? `Edit ${label.toLowerCase()}`
              : `Add ${label.toLowerCase()}`}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          className="flex flex-col gap-4"
        >
          <FormField label="Title" error={errors.title?.message}>
            <Input {...form.register('title')} />
          </FormField>

          <FormField
            label={
              type === 'event' ? 'Short description (optional)' : 'Summary'
            }
            hint={
              type === 'spotlight'
                ? 'Shown under the title on the slide'
                : type === 'event'
                  ? undefined
                  : 'Shown on the card'
            }
          >
            <Textarea rows={2} {...form.register('excerpt')} />
          </FormField>

          {(type === 'announcement' || type === 'news' || type === 'event') && (
            <FormField
              label={type === 'event' ? 'Content (optional)' : 'Content'}
              hint={
                type === 'event'
                  ? 'Shown when someone opens the event'
                  : 'The full article, shown when someone clicks Read more'
              }
              error={errors.body?.message}
            >
              <Controller
                control={form.control}
                name="body"
                render={({ field }) => (
                  <RichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    invalid={Boolean(errors.body)}
                    placeholder={
                      type === 'event'
                        ? 'Agenda, dress code, how to register…'
                        : 'Write the full article — use the toolbar for headings, lists, links, and images.'
                    }
                  />
                )}
              />
            </FormField>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {type !== 'event' && (
              <FormField
                label="Category"
                hint={
                  type === 'spotlight'
                    ? 'Badge on the slide (optional)'
                    : undefined
                }
              >
                <Input
                  list={`hub-categories-${type}`}
                  {...form.register('category')}
                />
                <datalist id={`hub-categories-${type}`}>
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </FormField>
            )}
            {type !== 'event' && (
              <FormField
                label="Publish date"
                error={errors.publishedOn?.message}
              >
                <Input type="date" {...form.register('publishedOn')} />
              </FormField>
            )}

            {type === 'spotlight' && (
              <>
                <FormField
                  label="Link (optional)"
                  hint="Title links here (opens in a new tab)"
                  error={errors.linkUrl?.message}
                >
                  <Input placeholder="https://" {...form.register('linkUrl')} />
                </FormField>
                <FormField
                  label="Category link (optional)"
                  error={errors.categoryUrl?.message}
                >
                  <Input
                    placeholder="https://"
                    {...form.register('categoryUrl')}
                  />
                </FormField>
              </>
            )}

            {type === 'event' && (
              <>
                <FormField
                  label="Start date"
                  error={errors.eventStart?.message}
                >
                  <Input type="date" {...form.register('eventStart')} />
                </FormField>
                <FormField
                  label="End date (optional)"
                  hint="For events spanning several days"
                >
                  <Input type="date" {...form.register('eventEnd')} />
                </FormField>
                <FormField label="Time (optional)">
                  <Input
                    placeholder="e.g. 9:00 AM - 5:00 PM"
                    {...form.register('eventTime')}
                  />
                </FormField>
                <FormField label="Venue (optional)">
                  <Input
                    placeholder="e.g. Hall Auditorium"
                    {...form.register('location')}
                  />
                </FormField>
              </>
            )}

            <FormField label="Display order" hint="Lower numbers appear first">
              <Input type="number" min={0} {...form.register('sortOrder')} />
            </FormField>
          </div>

          {type !== 'event' && (
            <Controller
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FileUploadField
                  label={
                    type === 'spotlight'
                      ? 'Background photo (optional)'
                      : 'Photo (optional)'
                  }
                  helpText={
                    type === 'spotlight'
                      ? 'Wide landscape photos work best — shown full-width behind the slide.'
                      : 'JPEG, PNG, or WebP. Landscape works best.'
                  }
                  folder="hub-images"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          )}

          <div className="flex flex-wrap gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                {...form.register('isPublished')}
              />
              Published (visible on the KNH Hub)
            </label>
            {type === 'event' && (
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  {...form.register('isFeatured')}
                />
                Featured Event banner
              </label>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? 'Saving...'
                : editing
                  ? 'Save Changes'
                  : `Add ${label}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
