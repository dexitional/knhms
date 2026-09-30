import { useMemo, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react"
import type { DirectoryEntryRow } from "@knh/db"
import { ArrowUpRight, Globe, HandHeart, Mail, MapPin, Phone, Search, Sparkles, UserPlus, Users, X } from "lucide-react"
import { getAlumni } from "#/server/directory"
import { asset } from "#/lib/asset"
import { cn } from "#/lib/utils"
import { Dialog, DialogContent, DialogTitle } from "#/components/ui/dialog.tsx"
import { ExecutivesSlider } from "#/components/alumni/executives-slider"
import { EventsSection } from "#/components/alumni/events-section"
import { ProjectsSection } from "#/components/alumni/projects-section"
import { DonationsSection } from "#/components/alumni/donations-section"
import { GallerySection } from "#/components/alumni/gallery-section"
import { GiveSection } from "#/components/alumni/give-section"
import { MembershipWizard } from "#/components/alumni/membership-wizard"
import { scrollToSection } from "#/components/alumni/shared"

// Public alumni network. Profiles are the "Alumni" entries managed in
// Admin → Yellow Pages (title = current role, subtitle = class/programme,
// website = LinkedIn or personal site, tags = filters). Executives, projects,
// donations, gallery and donation details come from Admin → Alumni.
export const Route = createFileRoute("/_web/alumni")({
  loader: () => getAlumni(),
  component: AlumniPage,
})

type Alumnus = DirectoryEntryRow & { tags: Array<string> }

const imageSrc = (url: string) => (/^https?:\/\//.test(url) ? url : asset(url))

function initials(name: string) {
  return name
    .replace(/^(Dr|Prof|Mr|Mrs|Ms|Rev|Hon)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")
}

// "+233 (0) 24 …" → "+23324…"
const telHref = (phone: string) => `tel:${phone.replace(/\(0\)/g, "").replace(/[^\d+]/g, "")}`

function AlumniPage() {
  const { alumni, executives, projects, donations, donationTotals, gallery, channels, hubEvents, hubAnnouncements } =
    Route.useLoaderData()
  const people = alumni as Array<Alumnus>
  // "Support this project" pre-selects the project in the donation form.
  const [supportProject, setSupportProject] = useState<number | null>(null)
  const support = (projectId: number) => {
    setSupportProject(projectId)
    scrollToSection("give")
  }
  const [query, setQuery] = useState("")
  const [tag, setTag] = useState<string | null>(null)
  const [open, setOpen] = useState<Alumnus | null>(null)

  // Tags ranked by how many alumni use them — these become the filter chips.
  const tags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of people) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 14)
  }, [people])

  const q = query.trim().toLowerCase()
  const visible = people.filter(
    (p) =>
      (!tag || p.tags.includes(tag)) &&
      (!q ||
        [p.name, p.title, p.subtitle, p.location, ...p.tags].some((f) => f?.toLowerCase().includes(q))),
  )

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative bg-[#f7f5f2]">
        <Hero
          people={people}
          tagCount={tags.length}
          sections={[
            ["directory", "Directory", people.length > 0],
            ["events", "Events", hubEvents.length + hubAnnouncements.length > 0],
            ["executives", "Executives", executives.length > 0],
            ["projects", "Projects", projects.length > 0],
            ["donations", "Donations", true],
            ["gallery", "Gallery", true],
            ["give", "Give", true],
            ["join", "Join", true],
          ]}
        />

        {/* Directory: the filter bar sticks only while the directory is on screen. */}
        <div id="directory" className="scroll-mt-16">
        <div className="sticky top-14 z-30 border-b border-black/5 bg-white/70 backdrop-blur-xl md:top-16">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center">
            <label className="relative flex-1 md:max-w-sm">
              <span className="sr-only">Search alumni</span>
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, role, class or city"
                className="h-11 w-full rounded-full border border-black/10 bg-white pr-10 pl-10 text-sm shadow-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/15"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-secondary"
                >
                  <X className="size-4" />
                </button>
              )}
            </label>
            {tags.length > 0 && (
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:pb-0" role="group" aria-label="Filter by tag">
                <Chip active={tag === null} onClick={() => setTag(null)}>
                  All
                </Chip>
                {tags.map(([t, n]) => (
                  <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                    {t}
                    <span className={cn("ml-1.5 text-[11px]", tag === t ? "text-white/70" : "text-muted-foreground")}>
                      {n}
                    </span>
                  </Chip>
                ))}
              </div>
            )}
          </div>
        </div>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16" aria-live="polite">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">The network</p>
              <h2 className="mt-1 text-3xl font-black tracking-tight text-foreground md:text-4xl">Meet our alumni</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {visible.length === people.length
                ? `${people.length} alumni`
                : `${visible.length} of ${people.length} alumni`}
              {tag && (
                <>
                  {" "}
                  tagged <span className="font-semibold text-foreground">{tag}</span>
                </>
              )}
            </p>
          </div>

          {people.length === 0 ? (
            <EmptyState title="The alumni network is launching soon" body="Profiles of former KNH residents will appear here." />
          ) : visible.length === 0 ? (
            <EmptyState title="No alumni match" body="Try another name, or clear the filters." />
          ) : (
            <LayoutGroup>
              <motion.ul layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <AnimatePresence mode="popLayout">
                  {visible.map((p, i) => (
                    <motion.li
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: 24, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.04, ease: "easeOut" }}
                    >
                      <AlumnusCard person={p} onOpen={() => setOpen(p)} />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            </LayoutGroup>
          )}
        </section>
        </div>

        <EventsSection events={hubEvents} announcements={hubAnnouncements} />
        <ExecutivesSlider executives={executives} />
        <ProjectsSection projects={projects} onSupport={support} />
        <DonationsSection donations={donations} totals={donationTotals} onGive={() => scrollToSection("give")} />
        <GallerySection images={gallery} />
        <GiveSection channels={channels} projects={projects} projectId={supportProject} />
        <MembershipWizard />
      </div>

      <ProfileDialog person={open} onClose={() => setOpen(null)} />
    </MotionConfig>
  )
}

// ---- Hero -------------------------------------------------------------------------

function Hero({
  people,
  tagCount,
  sections,
}: {
  people: Array<Alumnus>
  tagCount: number
  sections: Array<[id: string, label: string, show: boolean]>
}) {
  const withPhotos = people.filter((p) => p.photo_url)
  // "Cape Coast, Ghana" → "cape coast"
  const cities = new Set(people.map((p) => p.location?.split(",")[0]?.trim().toLowerCase()).filter(Boolean)).size

  return (
    <section className="relative isolate overflow-hidden bg-[#0b0b10] text-white">
      {/* Aurora light */}
      <motion.div
        aria-hidden="true"
        className="absolute -top-40 -left-32 size-[34rem] rounded-full bg-primary/40 blur-3xl"
        animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute top-10 -right-40 size-[30rem] rounded-full bg-amber-400/25 blur-3xl"
        animate={{ x: [0, -50, 0], y: [0, 60, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute -bottom-48 left-1/3 size-[28rem] rounded-full bg-rose-500/20 blur-3xl"
        animate={{ x: [0, 40, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Fine grid, faded at the edges */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] bg-[size:48px_48px]"
      />

      <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6 md:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium tracking-wide text-white/80 backdrop-blur"
        >
          <Sparkles className="size-3.5 text-amber-300" />
          Kwame Nkrumah Hall Alumni Network
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 text-5xl leading-[0.95] font-black tracking-tighter text-balance sm:text-6xl md:text-7xl lg:text-8xl"
        >
          Once KNH,
          <br />
          <span className="bg-gradient-to-r from-primary via-amber-300 to-rose-400 bg-clip-text text-transparent">
            always KNH.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-6 max-w-xl text-lg text-pretty text-white/70"
        >
          The people who lived <em className="text-white not-italic">Leadership by Example</em> — now leading across
          industries, campuses and continents. Find them, learn from them, connect with them.
        </motion.p>

        <motion.dl
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-10 grid max-w-lg grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur"
        >
          {[
            { label: "Alumni", value: people.length },
            { label: "Cities", value: cities },
            { label: "Communities", value: tagCount },
          ].map((s) => (
            <div key={s.label} className="px-4 py-4 sm:px-6">
              <dd className="text-3xl font-black tracking-tight">{s.value}</dd>
              <dt className="text-xs tracking-widest text-white/60 uppercase">{s.label}</dt>
            </div>
          ))}
        </motion.dl>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-8 flex flex-wrap gap-3"
        >
          <button
            type="button"
            onClick={() => scrollToSection("join")}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-foreground transition hover:bg-amber-300"
          >
            <UserPlus className="size-4" /> Join the network
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("give")}
            className="inline-flex h-12 items-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 text-sm font-bold text-white backdrop-blur transition hover:border-white/60 hover:bg-white/10"
          >
            <HandHeart className="size-4" /> Give back
          </button>
        </motion.div>

        {/* In-page section menu */}
        <nav aria-label="Alumni page sections" className="mt-10 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {sections
            .filter(([, , show]) => show)
            .map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => {
                  e.preventDefault()
                  scrollToSection(id)
                }}
                className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold tracking-wide text-white/75 uppercase backdrop-blur transition hover:border-amber-300/60 hover:text-white"
              >
                {label}
              </a>
            ))}
        </nav>
      </div>

      {withPhotos.length >= 4 && <FaceMarquee people={withPhotos} />}
    </section>
  )
}

// Endless strip of alumni faces; the list is doubled so the loop is seamless.
function FaceMarquee({ people }: { people: Array<Alumnus> }) {
  const strip = [...people, ...people]
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden border-t border-white/10 py-6 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]"
    >
      <motion.div
        className="flex w-max gap-4"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: Math.max(20, people.length * 4), repeat: Infinity, ease: "linear" }}
      >
        {strip.map((p, i) => (
          <div key={`${p.id}-${i}`} className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 py-1.5 pr-4 pl-1.5">
            <img src={imageSrc(p.photo_url!)} alt="" loading="lazy" className="size-9 rounded-full object-cover" />
            <div className="leading-tight">
              <p className="text-sm font-semibold whitespace-nowrap">{p.name}</p>
              <p className="text-xs whitespace-nowrap text-white/60">{p.title}</p>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

// ---- Cards --------------------------------------------------------------------------

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-all",
        active
          ? "border-foreground bg-foreground text-white shadow-md"
          : "border-black/10 bg-white text-foreground hover:border-primary/40 hover:text-primary",
      )}
    >
      {children}
    </button>
  )
}

function Avatar({ person, className }: { person: Alumnus; className?: string }) {
  return person.photo_url ? (
    <img
      src={imageSrc(person.photo_url)}
      alt={person.name}
      loading="lazy"
      className={cn("size-full object-cover object-top", className)}
    />
  ) : (
    <div
      className={cn(
        "flex size-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,var(--color-amber-300),var(--primary)_45%,#7c2d12)] text-5xl font-black text-white/90",
        className,
      )}
    >
      {initials(person.name)}
    </div>
  )
}

function TagList({ tags, dark = false }: { tags: Array<string>; dark?: boolean }) {
  if (tags.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
      {tags.map((t) => (
        <li
          key={t}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            dark ? "border border-white/20 bg-white/10 text-white" : "border border-primary/20 bg-primary/10 text-primary",
          )}
        >
          {t}
        </li>
      ))}
    </ul>
  )
}

function AlumnusCard({ person, onOpen }: { person: Alumnus; onOpen: () => void }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.15)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_24px_48px_-16px_rgba(250,100,0,0.35)]">
      <div className="relative aspect-[4/5] overflow-hidden">
        <Avatar person={person} className="transition-transform duration-700 ease-out group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <h3 className="text-xl leading-tight font-bold tracking-tight">
            {/* Stretched button: the whole card opens the profile. */}
            <button type="button" onClick={onOpen} className="text-left after:absolute after:inset-0 focus-visible:outline-none">
              {person.name}
            </button>
          </h3>
          <p className="mt-1 text-sm text-white/80">{person.title}</p>
        </div>
        <span className="absolute top-4 right-4 flex size-9 translate-y-2 items-center justify-center rounded-full bg-white/90 text-foreground opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        {(person.subtitle || person.location) && (
          <div className="space-y-1 text-sm text-muted-foreground">
            {person.subtitle && <p className="font-medium text-foreground/80">{person.subtitle}</p>}
            {person.location && (
              <p className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-primary" />
                {person.location}
              </p>
            )}
          </div>
        )}
        <div className="mt-auto">
          <TagList tags={person.tags.slice(0, 4)} />
        </div>
      </div>
    </article>
  )
}

// ---- Profile ----------------------------------------------------------------------------

function ProfileDialog({ person, onClose }: { person: Alumnus | null; onClose: () => void }) {
  return (
    <Dialog open={person != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="overflow-hidden border-0 p-0 sm:max-w-3xl">
        {person && (
          <div className="grid sm:grid-cols-[2fr_3fr]">
            <div className="relative aspect-square sm:aspect-auto sm:min-h-[26rem]">
              <Avatar person={person} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-black/10" />
            </div>
            <div className="flex flex-col gap-5 p-6 sm:p-8">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">KNH Alumni</p>
                <DialogTitle className="mt-2 text-3xl leading-tight font-black tracking-tight">{person.name}</DialogTitle>
                <p className="mt-1 text-lg text-muted-foreground">{person.title}</p>
              </div>
              {person.subtitle && (
                <p className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm font-medium text-foreground/80">{person.subtitle}</p>
              )}
              <TagList tags={person.tags} />
              <ul className="space-y-2 text-sm">
                {person.location && (
                  <li className="flex items-center gap-2.5 text-muted-foreground">
                    <MapPin className="size-4 text-primary" /> {person.location}
                  </li>
                )}
                {person.email && (
                  <li className="flex items-center gap-2.5 text-muted-foreground">
                    <Mail className="size-4 text-primary" /> {person.email}
                  </li>
                )}
                {person.phone && (
                  <li className="flex items-center gap-2.5 text-muted-foreground">
                    <Phone className="size-4 text-primary" /> {person.phone}
                  </li>
                )}
              </ul>
              <div className="mt-auto flex flex-wrap gap-2">
                {person.email && (
                  <a
                    href={`mailto:${person.email}`}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-white transition hover:bg-primary"
                  >
                    <Mail className="size-4" /> Email
                  </a>
                )}
                {person.phone && (
                  <a
                    href={telHref(person.phone)}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 px-5 text-sm font-semibold transition hover:border-primary hover:text-primary"
                  >
                    <Phone className="size-4" /> Call
                  </a>
                )}
                {person.website_url && (
                  <a
                    href={person.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 px-5 text-sm font-semibold transition hover:border-primary hover:text-primary"
                  >
                    <Globe className="size-4" /> Profile <ArrowUpRight className="size-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ---- Empty & CTA ---------------------------------------------------------------------------

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-black/10 bg-white/60 px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Users className="size-7" />
      </span>
      <p className="mt-4 text-lg font-bold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
