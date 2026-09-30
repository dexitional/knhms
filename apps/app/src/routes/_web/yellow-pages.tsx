import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Clock,
  Globe,
  Landmark,
  Mail,
  MapPin,
  MapPinned,
  Phone,
  Search,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DirectoryCategory, DirectoryEntryRow } from '@knh/db'
import { getDirectoryEntries } from '#/server/directory'
import { Button } from '#/components/ui/button.tsx'
import { Card, CardContent } from '#/components/ui/card.tsx'
import { asset } from '#/lib/asset'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/_web/yellow-pages')({
  loader: () => getDirectoryEntries(),
  component: YellowPagesPage,
})

type Entry = {
  id: number
  name: string
  title: string
  subtitle: string
  details: Array<{ icon: LucideIcon; value: string }>
  phone?: string
  email?: string
  photo?: string
  tags: Array<string>
  business?: { mapQuery: string; website?: string }
}

function toEntry(row: DirectoryEntryRow): Entry {
  const details: Entry['details'] = []
  if (row.phone) details.push({ icon: Phone, value: row.phone })
  if (row.email) details.push({ icon: Mail, value: row.email })
  if (row.location) details.push({ icon: MapPin, value: row.location })
  if (row.hours) details.push({ icon: Clock, value: row.hours })
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    subtitle: row.subtitle ?? '',
    details,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    photo: row.photo_url ?? undefined,
    tags: row.tags ?? [],
    business:
      row.category === 'business'
        ? {
            mapQuery:
              row.map_query ||
              [row.name, row.location, 'University of Cape Coast']
                .filter(Boolean)
                .join(', '),
            website: row.website_url ?? undefined,
          }
        : undefined,
  }
}

// Rounded badges for an entry's tags (e.g. "Class of 2015", "Mentor").
function TagBadges({
  tags,
  className,
}: {
  tags: Array<string>
  className?: string
}) {
  if (tags.length === 0) return null
  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)} aria-label="Tags">
      {tags.map((tag) => (
        <li
          key={tag}
          className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
        >
          {tag}
        </li>
      ))}
    </ul>
  )
}

function googleMapsUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function initials(name: string) {
  return name
    .replace(/^(Dr|Prof|Chief|Mr|Mrs|Ms)\.?\s+/i, '')
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// `logo` shows the whole image on a white tile (business logos must not be
// cropped); the default crops to fill, which suits headshots.
function EntryPhoto({
  name,
  photo,
  logo = false,
}: {
  name: string
  photo?: string
  logo?: boolean
}) {
  const [failed, setFailed] = useState(!photo)
  const imgRef = useRef<HTMLImageElement>(null)

  // With SSR the image can fail before hydration attaches onError.
  useEffect(() => {
    const img = imgRef.current
    if (img?.complete && img.naturalWidth === 0) setFailed(true)
  }, [])

  return (
    <div
      className={cn(
        'flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-xl font-bold text-primary ring-2',
        logo && !failed
          ? 'bg-white p-2 ring-border'
          : 'bg-primary/10 ring-primary/20',
      )}
    >
      {failed || !photo ? (
        <span aria-hidden="true">{initials(name)}</span>
      ) : (
        <img
          ref={imgRef}
          // Uploaded photos are absolute storage URLs; bare paths live in public/.
          src={/^https?:\/\//.test(photo) ? photo : asset(photo)}
          alt={logo ? `${name} logo` : `Photo of ${name}`}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn('size-full', logo ? 'object-contain' : 'object-cover')}
        />
      )}
    </div>
  )
}

// `byName: "surname"` sections are browsed A–Z by the person's last name;
// businesses are browsed by the first letter of the business name.
const SECTIONS: Array<{
  category: DirectoryCategory
  heading: string
  label: string
  byName: 'surname' | 'name'
}> = [
  {
    category: 'personnel',
    heading: 'Key Personnel',
    label: 'personnel',
    byName: 'surname',
  },
  {
    category: 'business',
    heading: 'Campus Businesses',
    label: 'businesses',
    byName: 'name',
  },
  {
    category: 'executive',
    heading: 'KNH Executives',
    label: 'executives',
    byName: 'surname',
  },
  {
    category: 'alumni',
    heading: 'Alumni',
    label: 'alumni',
    byName: 'surname',
  },
]

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function initialOf(entry: Entry, byName: 'surname' | 'name') {
  const word =
    byName === 'surname' ? entry.name.trim().split(/\s+/).at(-1) : entry.name
  return (word ?? '').charAt(0).toUpperCase()
}

function matches(entry: Entry, query: string) {
  return [
    entry.name,
    entry.title,
    entry.subtitle,
    ...entry.details.map((d) => d.value),
    ...entry.tags,
  ].some((field) => field.toLowerCase().includes(query))
}

function YellowPagesPage() {
  const { entries: rows } = Route.useLoaderData()
  const sections = SECTIONS.map((s) => ({
    ...s,
    entries: rows.filter((r) => r.category === s.category).map(toEntry),
  }))
  const totalEntries = rows.length
  // Rank follows the admin's display order and stays fixed while filtering.
  const personnelRank = new Map(
    sections
      .find((s) => s.category === 'personnel')
      ?.entries.map((e, i) => [e.id, i + 1] as const) ?? [],
  )
  const availableLetters = new Set(
    sections.flatMap((s) => s.entries.map((e) => initialOf(e, s.byName))),
  )

  const [search, setSearch] = useState('')
  const [letter, setLetter] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const comboRef = useRef<HTMLDivElement>(null)
  const suggestionsRef = useRef<HTMLUListElement>(null)
  const azRef = useRef<HTMLElement>(null)

  const query = search.trim().toLowerCase()
  const filteredSections = sections
    .map((section) => ({
      ...section,
      entries: section.entries.filter(
        (entry) =>
          (!query || matches(entry, query)) &&
          (!letter || initialOf(entry, section.byName) === letter),
      ),
    }))
    .filter((section) => section.entries.length > 0)
  const resultCount = filteredSections.reduce((n, s) => n + s.entries.length, 0)
  const suggestions = query
    ? filteredSections
        .flatMap((s) =>
          s.entries.map((entry) => ({ entry, heading: s.heading })),
        )
        .slice(0, 6)
    : []
  const showSuggestions = open && suggestions.length > 0

  // "/" focuses the search box from anywhere on the page, unless typing elsewhere.
  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName ?? ''
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(tag)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const onClick = (e: globalThis.MouseEvent) => {
      if (!comboRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function options() {
    return suggestionsRef.current
      ? Array.from(
          suggestionsRef.current.querySelectorAll<HTMLElement>('[role=option]'),
        )
      : []
  }

  function move(step: number) {
    setOpen(true)
    const items = options()
    if (!items.length) return
    const at = items.indexOf(document.activeElement as HTMLElement)
    const next =
      at < 0
        ? step > 0
          ? 0
          : items.length - 1
        : (at + step + items.length) % items.length
    items[next]?.focus()
  }

  function close() {
    setOpen(false)
    searchRef.current?.focus()
  }

  function pick(name: string) {
    setSearch(name)
    close()
  }

  function onComboKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      move(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      move(-1)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  // Dock-style magnification: letters near the pointer grow and lift.
  function zoom(e: MouseEvent<HTMLElement>) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    azRef.current
      ?.querySelectorAll<HTMLButtonElement>('button')
      .forEach((b) => {
        const r = b.getBoundingClientRect()
        const d = Math.abs(e.clientX - (r.left + r.width / 2))
        const s = Math.max(1, 1.75 - d / 80)
        b.style.transform =
          s > 1 ? `translateY(${-(s - 1) * 9}px) scale(${s})` : ''
        b.style.zIndex = s > 1 ? String(Math.round(s * 100)) : ''
      })
  }

  function resetZoom() {
    azRef.current
      ?.querySelectorAll<HTMLButtonElement>('button')
      .forEach((b) => {
        b.style.transform = ''
        b.style.zIndex = ''
      })
  }

  return (
    <div className="relative">
      <section
        className="relative overflow-hidden"
        style={{
          background:
            'linear-gradient(160deg, color-mix(in srgb, var(--primary) 11%, var(--background)) 0%, var(--background) 55%, color-mix(in srgb, var(--primary) 6%, var(--background)) 100%)',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 size-96 rounded-full blur-3xl"
          style={{
            background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -left-24 size-96 rounded-full blur-3xl"
          style={{
            background: 'color-mix(in srgb, var(--primary) 9%, transparent)',
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 pt-12 pb-12 sm:px-6 sm:pt-16 sm:pb-14">
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
            <h1 className="max-w-4xl text-4xl leading-tight font-black tracking-tight text-foreground sm:text-5xl">
              Your Hall Contacts,
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    'linear-gradient(90deg, var(--primary), color-mix(in srgb, var(--primary) 55%, var(--foreground)))',
                }}
              >
                Every Business Around Campus
              </span>
            </h1>
            <p className="mt-5 max-w-3xl text-base text-muted-foreground sm:text-lg">
              The Kwame Nkrumah Hall directory — reach{' '}
              <strong className="text-primary tabular-nums">
                {totalEntries}
              </strong>{' '}
              hall officers, executives, and trusted shops, eateries, and
              services around campus.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {sections.map((s, i) => (
                <span key={s.heading}>
                  {i > 0 && ' · '}
                  <span className="text-foreground tabular-nums">
                    {s.entries.length}
                  </span>{' '}
                  {s.label}
                </span>
              ))}
            </p>
          </div>

          <div
            ref={comboRef}
            className="relative mt-6 w-full"
            onKeyDown={onComboKeyDown}
          >
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="sr-only"
            >
              {query || letter
                ? `${resultCount} result${resultCount === 1 ? '' : 's'} found`
                : ''}
            </div>
            <Search
              aria-hidden="true"
              className="absolute top-6.5 left-4 size-5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setOpen(false)
              }}
              placeholder="Search hall officers, shops, eateries, or services..."
              aria-label="Search the directory"
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-controls="dhr-suggestions"
              aria-expanded={showSuggestions}
              aria-describedby="directory-search-hint"
              className="w-full border border-border bg-card py-3.5 pr-28 pl-12 text-base text-foreground shadow-sm transition outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              style={{ borderRadius: 'calc(var(--radius) + .3rem)' }}
            />
            <p id="directory-search-hint" className="sr-only">
              Type to search as you go. Use the arrow keys to move through
              suggestions and press Enter to pick one.
            </p>
            <span className="absolute top-6.5 right-4 hidden -translate-y-1/2 items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
              <kbd className="rounded-md border border-border bg-secondary px-1.5 py-0.5 font-semibold">
                /
              </kbd>{' '}
              to search
            </span>

            {showSuggestions && (
              <ul
                ref={suggestionsRef}
                id="dhr-suggestions"
                role="listbox"
                aria-label="Suggestions"
                className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-lg"
              >
                {suggestions.map(({ entry, heading }) => (
                  <li
                    key={`${heading}-${entry.id}`}
                    role="option"
                    aria-selected="false"
                    tabIndex={-1}
                    onClick={() => pick(entry.name)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        pick(entry.name)
                      }
                    }}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent"
                  >
                    <span>
                      <span className="font-semibold text-foreground">
                        {entry.name}
                      </span>
                      <span className="text-muted-foreground">
                        {' '}
                        · {entry.title}
                      </span>
                    </span>
                    <span className="text-[11px] tracking-widest whitespace-nowrap text-muted-foreground uppercase">
                      {heading}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <nav
            ref={azRef}
            aria-label="Browse people by surname initial"
            onMouseMove={zoom}
            onMouseLeave={resetZoom}
            className="mt-10 mb-4 flex flex-wrap items-center gap-1.5"
          >
            <span className="mr-1.5 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
              Browse A–Z
            </span>
            {LETTERS.map((l) => {
              const pressed = letter === l
              return (
                <button
                  key={l}
                  type="button"
                  aria-pressed={pressed}
                  disabled={!availableLetters.has(l)}
                  onClick={() => setLetter(pressed ? null : l)}
                  className={cn(
                    'relative flex size-8 origin-bottom items-center justify-center rounded-md border text-xs font-semibold transition-[transform,background-color,color,border-color] duration-150 ease-out outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40',
                    pressed
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:border-primary hover:text-primary',
                  )}
                >
                  {l}
                </button>
              )
            })}
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 pt-10 pb-20 sm:px-6">
        {letter && (
          <p className="text-sm text-muted-foreground">
            Showing entries starting with{' '}
            <span className="font-semibold text-foreground">{letter}</span> ·{' '}
            <button
              type="button"
              onClick={() => setLetter(null)}
              className="font-semibold text-primary hover:underline"
            >
              Clear
            </button>
          </p>
        )}

        {filteredSections.length === 0 && (
          <p className="text-center text-muted-foreground">
            {totalEntries === 0
              ? 'The directory is being updated. Please check back soon.'
              : 'No entries match your search. Try a different name or keyword.'}
          </p>
        )}

        {filteredSections.map((section) =>
          section.category === 'personnel' ? (
            <section key={section.heading}>
              <h2 className="mb-4 text-2xl font-bold text-foreground">
                {section.heading}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {section.entries.map((entry) => (
                  <PersonnelCard
                    key={entry.id}
                    entry={entry}
                    rank={personnelRank.get(entry.id) ?? 0}
                  />
                ))}
              </div>
            </section>
          ) : (
            <section key={section.heading}>
              <h2 className="mb-4 text-2xl font-bold text-foreground">
                {section.heading}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.entries.map((entry) => (
                  <Card
                    key={entry.id}
                    className="border-0 bg-card shadow-md transition-shadow hover:shadow-lg"
                  >
                    <CardContent className="flex h-full flex-col gap-3">
                      <div className="flex items-center gap-4">
                        {(entry.photo ||
                          section.category === 'executive' ||
                          section.category === 'alumni') && (
                          <EntryPhoto
                            name={entry.name}
                            photo={entry.photo}
                            logo={section.category === 'business'}
                          />
                        )}
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {entry.name}
                          </h3>
                          <p className="text-sm font-medium text-primary">
                            {entry.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {entry.subtitle}
                          </p>
                        </div>
                      </div>
                      <TagBadges tags={entry.tags} />
                      <div className="space-y-1.5 text-sm text-muted-foreground">
                        {entry.details.map((detail) => (
                          <p
                            key={detail.value}
                            className="flex items-center gap-2"
                          >
                            <detail.icon className="size-4 shrink-0 text-primary" />
                            {detail.value}
                          </p>
                        ))}
                      </div>
                      {entry.business && (
                        <div className="mt-auto flex flex-wrap gap-2 pt-2">
                          <Button asChild size="sm">
                            <a
                              href={googleMapsUrl(entry.business.mapQuery)}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Open ${entry.name} in Google Maps`}
                            >
                              <MapPinned /> View on Map
                            </a>
                          </Button>
                          {entry.business.website && (
                            <Button asChild size="sm" variant="outline">
                              <a
                                href={entry.business.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Visit ${entry.name} website`}
                              >
                                <Globe /> Website
                              </a>
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ),
        )}
      </div>
    </div>
  )
}

// Spotlight card: centred avatar with a rank badge; the top three ranks are
// tinted with the brand colour, the rest stay neutral.
function PersonnelCard({ entry, rank }: { entry: Entry; rank: number }) {
  const [photoFailed, setPhotoFailed] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // With SSR the image can fail before hydration attaches onError.
  useEffect(() => {
    const img = imgRef.current
    if (img?.complete && img.naturalWidth === 0) setPhotoFailed(true)
  }, [])

  const rankStyle =
    rank === 1
      ? {
          background: 'color-mix(in srgb, var(--primary) 28%, transparent)',
          color: 'var(--primary)',
        }
      : rank <= 3
        ? {
            background: 'color-mix(in srgb, var(--primary) 14%, transparent)',
            color: 'var(--primary)',
          }
        : { background: 'var(--secondary)', color: 'var(--muted-foreground)' }

  return (
    <article className="relative">
      <div className="relative flex h-full flex-col items-center rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-shadow hover:shadow-lg">
        {rank > 0 && (
          <span
            className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full text-sm font-bold shadow-sm"
            style={rankStyle}
            aria-label={`Rank ${rank}`}
          >
            {rank}
          </span>
        )}

        <span className="relative mx-auto inline-flex size-24 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary shadow ring-4 ring-ring select-none">
          <svg
            className="size-full"
            viewBox="0 0 100 100"
            aria-hidden="true"
            focusable="false"
          >
            <text
              x="50"
              y="50"
              dy=".35em"
              textAnchor="middle"
              fontSize="40"
              fontWeight="600"
              fill="currentColor"
            >
              {initials(entry.name)}
            </text>
          </svg>
          {entry.photo && !photoFailed && (
            <img
              ref={imgRef}
              src={
                /^https?:\/\//.test(entry.photo)
                  ? entry.photo
                  : asset(entry.photo)
              }
              alt={entry.name}
              width={96}
              height={96}
              loading="lazy"
              onError={() => setPhotoFailed(true)}
              className="absolute inset-0 size-full object-cover object-top"
            />
          )}
        </span>

        <h3 className="mt-4 text-base leading-snug font-bold text-foreground">
          {entry.name}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{entry.title}</p>
        {entry.subtitle && (
          <span
            className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground"
            title={entry.subtitle}
          >
            <Landmark
              className="size-3.5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span className="truncate">{entry.subtitle}</span>
          </span>
        )}
        <TagBadges tags={entry.tags} className="mt-2 justify-center" />

        {(entry.phone || entry.email) && (
          <div className="mt-4 flex items-center gap-2">
            {entry.phone && (
              <a
                // "+233 (0) 55 …" → "+23355…": the (0) trunk digit isn't dialled internationally.
                href={`tel:${entry.phone.replace(/\(0\)/g, '').replace(/[^\d+]/g, '')}`}
                className="flex size-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors outline-none hover:bg-primary hover:text-primary-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                aria-label={`Call ${entry.name}`}
                title={entry.phone}
              >
                <Phone className="size-4" />
              </a>
            )}
            {entry.email && (
              <a
                href={`mailto:${entry.email}`}
                className="flex size-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors outline-none hover:bg-primary hover:text-primary-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                aria-label={`Email ${entry.name}`}
                title={entry.email}
              >
                <Mail className="size-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
