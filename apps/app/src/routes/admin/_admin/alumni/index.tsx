import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Check, ChevronDown, ExternalLink, Mail, Pencil, Phone, Plus, Trash2, X } from "lucide-react"
import { z } from "zod"
import { api } from "#/lib/api-client"
import { cn } from "#/lib/utils"
import { canManage } from "#/lib/permissions"
import {
  CHANNEL_TYPE_LABELS,
  DONATION_METHOD_LABELS,
  DONATION_STATUS_LABELS,
  MEMBERSHIP_INTERESTS,
  MEMBERSHIP_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  formatCedis,
} from "#/lib/alumni"
import type {
  AlumniDonation,
  AlumniExecutive,
  AlumniProject,
  DonationChannel,
  DonationStatus,
  GalleryImage,
  MembershipApplication,
  MembershipStatus,
} from "#/lib/alumni"
import { PAGE_SIZE, RecordDialog, ResourceTab, errorMessage, toBody } from "#/components/admin/alumni/resource-tab"
import { Pagination } from "#/components/pagination"
import type { FieldDef, FormValues } from "#/components/admin/alumni/resource-tab"
import { Badge } from "#/components/ui/badge.tsx"
import { Button } from "#/components/ui/button.tsx"
import { Textarea } from "#/components/ui/textarea.tsx"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select.tsx"
import { Table, TableBody, TableCell, TableEmptyValue, TableHead, TableHeader, TableRow } from "#/components/ui/table.tsx"

const TABS = ["memberships", "donations", "projects", "executives", "gallery", "channels"] as const
type Tab = (typeof TABS)[number]
const TAB_LABELS: Record<Tab, string> = {
  memberships: "Memberships",
  donations: "Donations",
  projects: "Projects",
  executives: "Executives",
  gallery: "Gallery",
  channels: "Donation details",
}

export const Route = createFileRoute("/admin/_admin/alumni/")({
  validateSearch: z.object({ tab: z.enum(TABS).optional() }),
  component: AlumniAdminPage,
})

const options = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }))
const str = (v: unknown) => (v == null ? "" : String(v))

function Thumb({ url }: { url: string | null }) {
  return url ? (
    <img src={url} alt="" className="size-10 shrink-0 rounded-md object-cover" />
  ) : (
    <div className="size-10 shrink-0 rounded-md bg-gradient-to-br from-primary/30 to-amber-200" />
  )
}

function AlumniAdminPage() {
  const { admin } = Route.useRouteContext()
  const canEdit = canManage(admin.role, "alumni")
  const tab = Route.useSearch().tab ?? "memberships"
  const navigate = Route.useNavigate()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alumni</h1>
          <p className="text-sm text-muted-foreground">
            Membership sign-ups, donations, projects, alumni executives, gallery and donation details on the Alumni
            page. Alumni profiles themselves are managed in Yellow Pages.
          </p>
        </div>
        <a href="/alumni" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          View public page <ExternalLink className="size-3.5" />
        </a>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg bg-secondary p-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => navigate({ search: { tab: t }, replace: true })}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "memberships" && <MembershipsTab canEdit={canEdit} />}
      {tab === "donations" && <DonationsTab canEdit={canEdit} />}
      {tab === "projects" && <ProjectsTab canEdit={canEdit} />}
      {tab === "executives" && <ExecutivesTab canEdit={canEdit} />}
      {tab === "gallery" && <GalleryTab canEdit={canEdit} />}
      {tab === "channels" && <ChannelsTab canEdit={canEdit} />}
    </div>
  )
}

// ---- Projects -----------------------------------------------------------------------

const PROJECT_FIELDS: Array<FieldDef> = [
  { name: "title", label: "Title", type: "text", required: true, wide: true },
  { name: "summary", label: "Summary", type: "textarea", hint: "One or two sentences shown on the card" },
  { name: "category", label: "Category", type: "text", placeholder: "e.g. Infrastructure, Scholarship" },
  { name: "status", label: "Status", type: "select", required: true, options: options(PROJECT_STATUS_LABELS) },
  { name: "goalAmount", label: "Funding goal (GH₵)", type: "number", hint: "Leave blank if there's no target" },
  { name: "ledBy", label: "Led by", type: "text", placeholder: "e.g. Class of 2010 Alumni" },
  { name: "yearLabel", label: "Year", type: "text", placeholder: "e.g. 2026" },
  { name: "sortOrder", label: "Display order", type: "number" },
  { name: "imageUrl", label: "Cover image (optional)", type: "image", hint: "Landscape images work best." },
  { name: "isPublished", label: "Published", type: "checkbox" },
]

function ProjectsTab({ canEdit }: { canEdit: boolean }) {
  return (
    <ResourceTab<AlumniProject>
      endpoint="projects"
      singular="Project"
      description="Projects alumni lead or fund. What's raised is the total of confirmed donations to each project."
      fields={PROJECT_FIELDS}
      canEdit={canEdit}
      emptyText="No projects yet."
      searchText={(p) => [p.title, p.category, p.led_by].join(" ")}
      toForm={(p) => ({
        title: str(p?.title),
        summary: str(p?.summary),
        category: str(p?.category),
        status: p?.status ?? "ongoing",
        goalAmount: str(p?.goal_amount),
        ledBy: str(p?.led_by),
        yearLabel: str(p?.year_label),
        sortOrder: str(p?.sort_order ?? 0),
        imageUrl: p?.image_url ?? undefined,
        isPublished: p ? p.is_published === 1 : true,
      })}
      columns={[
        {
          header: "Project",
          cell: (p) => (
            <div className="flex items-center gap-3">
              <Thumb url={p.image_url} />
              <div>
                <p className="max-w-72 font-medium text-foreground">{p.title}</p>
                <p className="text-xs text-muted-foreground">{[p.category, p.year_label].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
          ),
        },
        { header: "Status", cell: (p) => <Badge variant={p.status === "completed" ? "success" : p.status === "ongoing" ? "info" : "secondary"}>{PROJECT_STATUS_LABELS[p.status]}</Badge> },
        {
          header: "Raised",
          cell: (p) => (
            <div className="text-sm">
              <p className="font-semibold">{formatCedis(p.raised_amount)}</p>
              {p.goal_amount && <p className="text-xs text-muted-foreground">of {formatCedis(p.goal_amount)}</p>}
            </div>
          ),
        },
        { header: "Order", cell: (p) => p.sort_order },
        { header: "Visibility", cell: (p) => <Badge variant={p.is_published ? "success" : "secondary"}>{p.is_published ? "Published" : "Draft"}</Badge> },
      ]}
    />
  )
}

// ---- Executives -----------------------------------------------------------------------

const EXECUTIVE_FIELDS: Array<FieldDef> = [
  { name: "name", label: "Full name", type: "text", required: true },
  { name: "position", label: "Position", type: "text", required: true, placeholder: "e.g. President" },
  { name: "classYear", label: "Class", type: "text", placeholder: "e.g. Class of 2004" },
  { name: "sortOrder", label: "Display order", type: "number" },
  { name: "bio", label: "Short bio", type: "textarea" },
  { name: "email", label: "Email", type: "text" },
  { name: "phone", label: "Phone", type: "text" },
  { name: "linkedinUrl", label: "LinkedIn URL", type: "text", placeholder: "https://linkedin.com/in/…", wide: true },
  { name: "photoUrl", label: "Photo (optional)", type: "image", hint: "Portrait images work best." },
  { name: "isActive", label: "Show on the Alumni page", type: "checkbox" },
]

function ExecutivesTab({ canEdit }: { canEdit: boolean }) {
  return (
    <ResourceTab<AlumniExecutive>
      endpoint="executives"
      singular="Executive"
      description="The alumni association's executives, shown in the slider on the Alumni page."
      fields={EXECUTIVE_FIELDS}
      canEdit={canEdit}
      emptyText="No alumni executives yet."
      searchText={(e) => [e.name, e.position, e.class_year].join(" ")}
      toForm={(e) => ({
        name: str(e?.name),
        position: str(e?.position),
        classYear: str(e?.class_year),
        sortOrder: str(e?.sort_order ?? 0),
        bio: str(e?.bio),
        email: str(e?.email),
        phone: str(e?.phone),
        linkedinUrl: str(e?.linkedin_url),
        photoUrl: e?.photo_url ?? undefined,
        isActive: e ? e.is_active === 1 : true,
      })}
      columns={[
        {
          header: "Executive",
          cell: (e) => (
            <div className="flex items-center gap-3">
              <Thumb url={e.photo_url} />
              <div>
                <p className="font-medium text-foreground">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.class_year}</p>
              </div>
            </div>
          ),
        },
        { header: "Position", cell: (e) => e.position },
        { header: "Contact", cell: (e) => <span className="text-sm text-muted-foreground">{e.email ?? e.phone ?? "—"}</span> },
        { header: "Order", cell: (e) => e.sort_order },
        { header: "Visibility", cell: (e) => <Badge variant={e.is_active ? "success" : "secondary"}>{e.is_active ? "Shown" : "Hidden"}</Badge> },
      ]}
    />
  )
}

// ---- Gallery ----------------------------------------------------------------------------

const GALLERY_FIELDS: Array<FieldDef> = [
  { name: "imageUrl", label: "Photo", type: "image", required: true },
  { name: "caption", label: "Caption", type: "text", wide: true },
  { name: "album", label: "Album", type: "text", placeholder: "e.g. Homecoming 2025", hint: "Albums become filters on the page" },
  { name: "takenOn", label: "Date taken", type: "date" },
  { name: "sortOrder", label: "Display order", type: "number" },
  { name: "isPublished", label: "Published", type: "checkbox" },
]

function GalleryTab({ canEdit }: { canEdit: boolean }) {
  return (
    <ResourceTab<GalleryImage>
      endpoint="gallery"
      singular="Photo"
      description="Photos from reunions, projects and events. Group them into albums."
      fields={GALLERY_FIELDS}
      canEdit={canEdit}
      emptyText="No photos yet."
      searchText={(g) => [g.caption, g.album].join(" ")}
      toForm={(g) => ({
        imageUrl: g?.image_url ?? undefined,
        caption: str(g?.caption),
        album: str(g?.album),
        takenOn: str(g?.taken_on).slice(0, 10),
        sortOrder: str(g?.sort_order ?? 0),
        isPublished: g ? g.is_published === 1 : true,
      })}
      columns={[
        {
          header: "Photo",
          cell: (g) => (
            <div className="flex items-center gap-3">
              <img src={g.image_url} alt="" className="h-12 w-16 rounded-md object-cover" />
              <p className="max-w-72 text-sm">{g.caption ?? <TableEmptyValue />}</p>
            </div>
          ),
        },
        { header: "Album", cell: (g) => g.album ?? <TableEmptyValue /> },
        { header: "Taken", cell: (g) => (g.taken_on ? String(g.taken_on).slice(0, 10) : <TableEmptyValue />) },
        { header: "Visibility", cell: (g) => <Badge variant={g.is_published ? "success" : "secondary"}>{g.is_published ? "Published" : "Draft"}</Badge> },
      ]}
    />
  )
}

// ---- Donation channels -------------------------------------------------------------------

const CHANNEL_FIELDS: Array<FieldDef> = [
  { name: "type", label: "Type", type: "select", required: true, options: options(CHANNEL_TYPE_LABELS) },
  { name: "label", label: "Label", type: "text", required: true, placeholder: "e.g. MTN Mobile Money" },
  { name: "accountName", label: "Account name", type: "text" },
  { name: "accountNumber", label: "Number / account no.", type: "text" },
  { name: "provider", label: "Network / bank", type: "text", placeholder: "e.g. MTN, GCB Bank" },
  { name: "branch", label: "Branch", type: "text" },
  { name: "linkUrl", label: "Online payment link", type: "text", placeholder: "https://…", wide: true },
  { name: "instructions", label: "Instructions", type: "textarea", placeholder: "e.g. Use your name and class year as the reference" },
  { name: "sortOrder", label: "Display order", type: "number" },
  { name: "isActive", label: "Show on the Alumni page", type: "checkbox" },
]

function ChannelsTab({ canEdit }: { canEdit: boolean }) {
  return (
    <ResourceTab<DonationChannel>
      endpoint="channels"
      singular="Donation channel"
      description="How people can give: Mobile Money numbers, bank accounts and online payment links. Double-check every number."
      fields={CHANNEL_FIELDS}
      canEdit={canEdit}
      emptyText="No donation details yet."
      searchText={(c) => [c.label, c.provider, c.account_number].join(" ")}
      toForm={(c) => ({
        type: c?.type ?? "momo",
        label: str(c?.label),
        accountName: str(c?.account_name),
        accountNumber: str(c?.account_number),
        provider: str(c?.provider),
        branch: str(c?.branch),
        linkUrl: str(c?.link_url),
        instructions: str(c?.instructions),
        sortOrder: str(c?.sort_order ?? 0),
        isActive: c ? c.is_active === 1 : true,
      })}
      columns={[
        {
          header: "Channel",
          cell: (c) => (
            <div>
              <p className="font-medium text-foreground">{c.label}</p>
              <p className="text-xs text-muted-foreground">{CHANNEL_TYPE_LABELS[c.type]}</p>
            </div>
          ),
        },
        {
          header: "Details",
          cell: (c) => (
            <div className="text-sm">
              <p className="font-mono">{c.account_number ?? c.link_url ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{[c.account_name, c.provider, c.branch].filter(Boolean).join(" · ")}</p>
            </div>
          ),
        },
        { header: "Order", cell: (c) => c.sort_order },
        { header: "Visibility", cell: (c) => <Badge variant={c.is_active ? "success" : "secondary"}>{c.is_active ? "Shown" : "Hidden"}</Badge> },
      ]}
    />
  )
}

// ---- Donations -------------------------------------------------------------------------------

const DONATION_STATUS_BADGE = { pledged: "warning", confirmed: "success", declined: "danger" } as const

function donationFields(projects: Array<AlumniProject>): Array<FieldDef> {
  return [
    { name: "donorName", label: "Donor name", type: "text", required: true },
    { name: "amount", label: "Amount (GH₵)", type: "number", required: true },
    {
      name: "projectId",
      label: "Project",
      type: "select",
      options: [{ value: "none", label: "General fund" }, ...projects.map((p) => ({ value: String(p.id), label: p.title }))],
    },
    { name: "method", label: "Method", type: "select", required: true, options: options(DONATION_METHOD_LABELS) },
    { name: "reference", label: "Reference", type: "text", placeholder: "MoMo ID or bank reference" },
    { name: "donatedOn", label: "Date", type: "date", required: true },
    { name: "phone", label: "Phone", type: "text" },
    { name: "email", label: "Email", type: "text" },
    { name: "message", label: "Message", type: "textarea" },
    { name: "status", label: "Status", type: "select", required: true, options: options(DONATION_STATUS_LABELS) },
    { name: "isAnonymous", label: "Show as Anonymous on the page", type: "checkbox" },
  ]
}

function DonationsTab({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<DonationStatus | "all">("all")
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<AlumniDonation | null | "new">(null)
  const { data, isLoading } = useQuery({
    queryKey: ["alumni", "admin", "donations"],
    queryFn: () => api.get<{ items: Array<AlumniDonation> }>("/alumni/donations"),
  })
  const projects = useQuery({
    queryKey: ["alumni", "admin", "projects"],
    queryFn: () => api.get<{ items: Array<AlumniProject> }>("/alumni/projects"),
  })
  const fields = donationFields(projects.data?.items ?? [])
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["alumni"] })

  const save = useMutation({
    mutationFn: ({ id, values }: { id?: number; values: FormValues }) => {
      const body = toBody(fields, values)
      body.projectId = values.projectId && values.projectId !== "none" ? Number(values.projectId) : null
      return id ? api.patch(`/alumni/donations/${id}`, body) : api.post("/alumni/donations", body)
    },
    onSuccess: (_d, { id }) => {
      toast.success(id ? "Donation updated." : "Donation recorded.")
      setEditing(null)
      invalidate()
    },
    onError: errorMessage("Couldn't save the donation."),
  })
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: DonationStatus }) => api.patch(`/alumni/donations/${id}`, { status }),
    onSuccess: (_d, { status }) => {
      toast.success(status === "confirmed" ? "Donation confirmed. The donor will get a thank-you SMS." : "Donation updated.")
      invalidate()
    },
    onError: errorMessage("Couldn't update the donation."),
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/alumni/donations/${id}`),
    onSuccess: () => {
      toast.success("Donation deleted.")
      invalidate()
    },
    onError: errorMessage("Couldn't delete the donation."),
  })

  const all = data?.items ?? []
  const items = all.filter((d) => filter === "all" || d.status === filter)
  // Stay on a real page when confirming, declining or deleting shrinks the list.
  const currentPage = Math.min(page, Math.max(1, Math.ceil(items.length / PAGE_SIZE)))
  const pageItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const confirmedTotal = all.filter((d) => d.status === "confirmed").reduce((s, d) => s + d.amount, 0)
  const pledgedTotal = all.filter((d) => d.status === "pledged").reduce((s, d) => s + d.amount, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Confirmed", formatCedis(confirmedTotal), "text-emerald-600"],
          ["Awaiting confirmation", formatCedis(pledgedTotal), "text-amber-600"],
          ["Donations", String(all.length), "text-foreground"],
        ].map(([label, value, tone]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={cn("mt-1 text-2xl font-bold", tone)}>{value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-secondary p-1" role="tablist" aria-label="Filter by status">
          {(["all", "pledged", "confirmed", "declined"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => {
                setFilter(f)
                setPage(1)
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "all" ? "All" : DONATION_STATUS_LABELS[f]}
              <span className="ml-1.5 text-xs text-muted-foreground">
                {f === "all" ? all.length : all.filter((d) => d.status === f).length}
              </span>
            </button>
          ))}
        </div>
        {canEdit && (
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" /> Record donation
          </Button>
        )}
      </div>
      <p className="-mt-2 text-sm text-muted-foreground">
        Pledges come from the Alumni page. Confirm them once the money is received; only confirmed donations show on
        the page and count toward totals.
      </p>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Donor</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(isLoading || items.length === 0) && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  {isLoading ? "Loading..." : "No donations here."}
                </TableCell>
              </TableRow>
            )}
            {pageItems.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <p className="font-medium text-foreground">
                    {d.donor_name}
                    {d.is_anonymous === 1 && <span className="ml-2 text-xs text-muted-foreground">(anonymous)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{[d.phone, d.email].filter(Boolean).join(" · ") || String(d.donated_on).slice(0, 10)}</p>
                  {d.message && <p className="mt-0.5 line-clamp-1 max-w-64 text-xs italic text-muted-foreground">“{d.message}”</p>}
                </TableCell>
                <TableCell className="font-semibold">{formatCedis(d.amount)}</TableCell>
                <TableCell className="max-w-48 truncate">{d.project_title ?? <span className="text-muted-foreground">General fund</span>}</TableCell>
                <TableCell>
                  <p>{DONATION_METHOD_LABELS[d.method]}</p>
                  {d.reference && <p className="font-mono text-xs text-muted-foreground">{d.reference}</p>}
                </TableCell>
                <TableCell>
                  <Badge variant={DONATION_STATUS_BADGE[d.status]}>{DONATION_STATUS_LABELS[d.status]}</Badge>
                  {d.confirmed_by_name && <p className="mt-0.5 text-xs text-muted-foreground">by {d.confirmed_by_name}</p>}
                </TableCell>
                <TableCell className="text-right">
                  {canEdit && (
                    <div className="flex items-center justify-end gap-1">
                      {d.status === "pledged" && (
                        <>
                          <Button size="sm" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: d.id, status: "confirmed" })}>
                            <Check className="size-4" /> Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={setStatus.isPending}
                            onClick={() => {
                              if (confirm("Mark this pledge as declined (not received)?")) setStatus.mutate({ id: d.id, status: "declined" })
                            }}
                          >
                            <X className="size-4" /> Decline
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon-sm" aria-label="Edit donation" onClick={() => setEditing(d)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete donation"
                        disabled={remove.isPending}
                        onClick={() => {
                          if (confirm("Delete this donation record? This can't be undone.")) remove.mutate(d.id)
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
          title={editing === "new" ? "Record donation" : "Edit donation"}
          fields={fields}
          saving={save.isPending}
          initial={
            editing === "new"
              ? { donorName: "", amount: "", projectId: "none", method: "momo", reference: "", donatedOn: new Date().toISOString().slice(0, 10), phone: "", email: "", message: "", status: "confirmed", isAnonymous: false }
              : {
                  donorName: editing.donor_name,
                  amount: String(editing.amount),
                  projectId: editing.project_id ? String(editing.project_id) : "none",
                  method: editing.method,
                  reference: str(editing.reference),
                  donatedOn: String(editing.donated_on).slice(0, 10),
                  phone: str(editing.phone),
                  email: str(editing.email),
                  message: str(editing.message),
                  status: editing.status,
                  isAnonymous: editing.is_anonymous === 1,
                }
          }
          onSubmit={(values) => save.mutate({ id: editing === "new" ? undefined : editing.id, values })}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// ---- Memberships -------------------------------------------------------------------------------

const MEMBERSHIP_BADGE = { new: "warning", contacted: "info", archived: "secondary" } as const
const interestLabel = new Map(MEMBERSHIP_INTERESTS.map((i) => [i.key, i.label]))

function MembershipsTab({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<MembershipStatus | "all">("new")
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<number | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ["alumni", "admin", "memberships"],
    queryFn: () => api.get<{ items: Array<MembershipApplication> }>("/alumni/memberships"),
  })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["alumni", "admin", "memberships"] })
  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => api.patch(`/alumni/memberships/${id}`, body),
    onSuccess: () => {
      toast.success("Application updated.")
      invalidate()
    },
    onError: errorMessage("Couldn't update the application."),
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/alumni/memberships/${id}`),
    onSuccess: () => {
      toast.success("Application deleted.")
      invalidate()
    },
    onError: errorMessage("Couldn't delete the application."),
  })

  const all = data?.items ?? []
  const items = all.filter((m) => filter === "all" || m.status === filter)
  // Stay on a real page when a status change moves items out of this filter.
  const currentPage = Math.min(page, Math.max(1, Math.ceil(items.length / PAGE_SIZE)))
  const pageItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-secondary p-1" role="tablist" aria-label="Filter by status">
          {(["new", "contacted", "archived", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => {
                setFilter(f)
                setPage(1)
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "all" ? "All" : MEMBERSHIP_STATUS_LABELS[f]}
              <span className="ml-1.5 text-xs text-muted-foreground">
                {f === "all" ? all.length : all.filter((m) => m.status === f).length}
              </span>
            </button>
          ))}
        </div>
      </div>
      <p className="-mt-2 text-sm text-muted-foreground">
        Sign-ups from the Alumni page wizard. Each member automatically gets an Alumni directory profile (city and
        occupation as tags) with their phone number hidden. Show it from here when they agree.
      </p>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {(isLoading || items.length === 0) && (
          <p className="py-8 text-center text-sm text-muted-foreground">{isLoading ? "Loading..." : "No applications here."}</p>
        )}
        {pageItems.map((m) => {
          const open = openId === m.id
          return (
            <div key={m.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => setOpenId(open ? null : m.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={open}>
                  <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {m.full_name} <span className="text-sm font-normal text-muted-foreground">· {m.class_year}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[m.occupation, m.employer, m.location].filter(Boolean).join(" · ") || m.email}
                    </p>
                  </div>
                </button>
                {m.directory_entry_id ? (
                  <Badge variant={m.show_phone ? "success" : "secondary"} title="Phone number on their Alumni profile">
                    {m.show_phone ? "Phone shown" : "Phone hidden"}
                  </Badge>
                ) : (
                  <Badge variant="secondary">No profile</Badge>
                )}
                <span className="text-xs text-muted-foreground">{String(m.created_at).slice(0, 10)}</span>
                {canEdit ? (
                  <Select value={m.status} onValueChange={(v) => update.mutate({ id: m.id, body: { status: v } })}>
                    <SelectTrigger size="sm" className="w-32" aria-label="Status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MEMBERSHIP_STATUS_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={MEMBERSHIP_BADGE[m.status]}>{MEMBERSHIP_STATUS_LABELS[m.status]}</Badge>
                )}
              </div>
              {open && (
                <div className="mt-3 ml-7 grid gap-4 rounded-lg bg-secondary/40 p-4 text-sm sm:grid-cols-2">
                  <dl className="grid gap-2">
                    {[
                      ["Email", m.email],
                      ["Phone", m.phone],
                      ["Programme", m.programme],
                      ["Occupation", [m.occupation, m.employer].filter(Boolean).join(" at ")],
                      ["Location", m.location],
                      ["Updates", m.wants_updates ? "Wants news and updates" : "No updates"],
                    ].map(([label, value]) =>
                      value ? (
                        <div key={label}>
                          <dt className="text-xs text-muted-foreground">{label}</dt>
                          <dd className="font-medium break-words">{value}</dd>
                        </div>
                      ) : null,
                    )}
                    {m.linkedin_url && (
                      <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        LinkedIn profile
                      </a>
                    )}
                  </dl>
                  <div className="flex flex-col gap-3">
                    {m.interests.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground">Wants to help with</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {m.interests.map((i) => (
                            <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              {interestLabel.get(i) ?? i}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <a href={`mailto:${m.email}`}>
                          <Mail className="size-4" /> Email
                        </a>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <a href={`tel:${m.phone.replace(/[^\d+]/g, "")}`}>
                          <Phone className="size-4" /> Call
                        </a>
                      </Button>
                    </div>
                    {m.directory_entry_id ? (
                      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Alumni directory profile</p>
                        <ProfileToggle
                          label="Show phone number publicly"
                          hint="Hidden by default. When on, it appears on their profile on the Alumni page and in the Yellow Pages."
                          checked={m.show_phone === 1}
                          disabled={!canEdit || update.isPending}
                          onChange={(showPhone) => update.mutate({ id: m.id, body: { showPhone } })}
                        />
                        <ProfileToggle
                          label="Listed in the Alumni directory"
                          checked={m.listed === 1}
                          disabled={!canEdit || update.isPending}
                          onChange={(listed) => update.mutate({ id: m.id, body: { listed } })}
                        />
                        <a href="/admin/yellow-pages" className="w-fit text-xs font-medium text-primary hover:underline">
                          Edit the full profile in Yellow Pages
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Their directory profile was removed. Add one in Yellow Pages if needed.
                      </p>
                    )}
                    {canEdit && <NotesEditor application={m} onSave={(notes) => update.mutate({ id: m.id, body: { notes } })} />}
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-fit text-destructive"
                        onClick={() => {
                          if (confirm(`Delete ${m.full_name}'s application?`)) remove.mutate(m.id)
                        }}
                      >
                        <Trash2 className="size-4" /> Delete
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {items.length > PAGE_SIZE && (
          <Pagination page={currentPage} pageSize={PAGE_SIZE} total={items.length} onPageChange={setPage} />
        )}
      </div>
    </div>
  )
}

// A labelled on/off switch.
function ProfileToggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
          checked ? "bg-primary" : "bg-slate-300",
        )}
      >
        <span className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
      </button>
    </div>
  )
}

function NotesEditor({ application, onSave }: { application: MembershipApplication; onSave: (notes: string) => void }) {
  const [notes, setNotes] = useState(application.notes ?? "")
  return (
    <div className="flex flex-col gap-2">
      <Textarea rows={2} placeholder="Internal notes (not shown to the applicant)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
      <Button size="sm" variant="outline" className="w-fit" disabled={notes === (application.notes ?? "")} onClick={() => onSave(notes)}>
        Save notes
      </Button>
    </div>
  )
}
