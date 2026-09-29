import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clock,
  MapPin,
  Star,
  Tag,
} from 'lucide-react'
import { asset } from '#/lib/asset'
import type { HubPostRow } from '@knh/db'
import { getHubContent } from '#/server/hub'
import { DecorativeBackground } from '#/components/decorative-background'
import { RichContent } from '#/components/rich-content'
import { FeaturedCarousel } from '#/components/featured-carousel'
import type { FeaturedSlide } from '#/components/featured-carousel'
import { Button } from '#/components/ui/button.tsx'
import { Card, CardContent } from '#/components/ui/card.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'

export const Route = createFileRoute('/_web/knh-hub')({
  loader: () => getHubContent(),
  component: KnhHubPage,
})

type Announcement = {
  id: number
  title: string
  excerpt: string
  body: string | null // sanitised HTML from the server
  date: string // YYYY-MM-DD
  category: string
}

type NewsItem = Announcement & {
  image?: string // public/ path or absolute URL; falls back to a branded tile
}

// Anything that opens in the reading pop-up. `body` is sanitised HTML;
// `summary` is plain text shown when there's no body.
type ReadingItem = {
  title: string
  date: string
  dateLabel?: string
  category?: string
  body: string | null
  summary?: string
  details?: Array<{ icon: 'time' | 'venue'; text: string }>
}

// "2026-08-06" → "Aug 06, 2026"
function formatAnnouncementDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// "Oct 1, 2026", "Oct 1 – 7, 2026", "Oct 28 – Nov 2, 2026", or
// "Dec 30, 2026 – Jan 2, 2027"
function formatEventDates(start: string, end: string | null) {
  const parts = (v: string) => {
    const d = new Date(`${v}T00:00:00Z`)
    return {
      month: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
      day: d.getUTCDate(),
      year: d.getUTCFullYear(),
    }
  }
  const a = parts(start)
  if (!end || end === start) return `${a.month} ${a.day}, ${a.year}`
  const b = parts(end)
  if (a.year !== b.year) {
    return `${a.month} ${a.day}, ${a.year} – ${b.month} ${b.day}, ${b.year}`
  }
  if (a.month !== b.month) {
    return `${a.month} ${a.day} – ${b.month} ${b.day}, ${b.year}`
  }
  return `${a.month} ${a.day} – ${b.day}, ${b.year}`
}

function toCardPost(p: HubPostRow): NewsItem {
  return {
    id: p.id,
    title: p.title,
    excerpt: p.excerpt ?? '',
    body: p.body,
    date: p.published_on,
    category: p.category ?? '',
    image: p.image_url ?? undefined,
  }
}

function toSlide(p: HubPostRow): FeaturedSlide {
  return {
    id: p.id,
    title: p.title,
    excerpt: p.excerpt ?? '',
    href: p.link_url ?? undefined,
    category: p.category ?? undefined,
    categoryHref: p.category_url ?? undefined,
    date: p.published_on,
    dateLabel: formatAnnouncementDate(p.published_on),
    image: p.image_url ?? undefined,
  }
}

function toReading(item: Announcement): ReadingItem {
  return {
    title: item.title,
    date: item.date,
    category: item.category || undefined,
    body: item.body,
    summary: item.excerpt || undefined,
  }
}

function eventToReading(event: HubPostRow): ReadingItem {
  const details: ReadingItem['details'] = []
  if (event.event_time) details.push({ icon: 'time', text: event.event_time })
  if (event.location) details.push({ icon: 'venue', text: event.location })
  return {
    title: event.title,
    date: event.event_start!,
    dateLabel: formatEventDates(event.event_start!, event.event_end),
    body: event.body,
    summary: event.excerpt ?? undefined,
    details,
  }
}

const NEWS_PREVIEW_COUNT = 3

function KnhHubPage() {
  const data = Route.useLoaderData()
  const featuredSlides = data.spotlights.map(toSlide)
  const announcements = data.announcements.map(toCardPost)
  const news = data.news.map(toCardPost)
  const featuredEvent = data.events.find((e) => e.is_featured)
  const events = data.events.filter((e) => e !== featuredEvent)

  const [reading, setReading] = useState<ReadingItem | null>(null)
  const [showAllNews, setShowAllNews] = useState(false)
  const visibleNews = showAllNews ? news : news.slice(0, NEWS_PREVIEW_COUNT)

  return (
    <div className="relative">
      <DecorativeBackground />
      <FeaturedCarousel slides={featuredSlides} />

      {news.length > 0 && (
        <section
          aria-labelledby="news-heading"
          className="relative overflow-hidden bg-gradient-to-b from-card via-secondary/60 to-card py-16 sm:py-20"
        >
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2
                id="news-heading"
                className="text-2xl font-bold tracking-tight text-foreground md:text-4xl"
              >
                Latest News
              </h2>
              <p className="mt-2 text-base leading-7 text-muted-foreground md:mt-4 md:text-lg md:leading-8">
                Stay informed with the latest news and updates from Kwame
                Nkrumah Hall
              </p>
            </div>
            <div className="mx-auto mt-12 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
              {visibleNews.map((item) => (
                <NewsCard
                  key={item.id}
                  item={item}
                  onOpen={() => setReading(toReading(item))}
                />
              ))}
            </div>
            {news.length > NEWS_PREVIEW_COUNT && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAllNews((v) => !v)}
                  aria-expanded={showAllNews}
                  className="group inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-foreground/90 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                  {showAllNews ? 'Show Less' : 'View All News'}
                  <ArrowRight
                    className={`size-4 transition-transform duration-300 ${showAllNews ? '-rotate-90' : 'group-hover:translate-x-1'}`}
                    aria-hidden="true"
                  />
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {announcements.length > 0 && (
        <section
          aria-labelledby="announcements-heading"
          className="border-y border-border bg-card py-12"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-8">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Star className="size-3.5 fill-current" aria-hidden="true" />
                Latest
              </div>
              <h2
                id="announcements-heading"
                className="text-xl font-bold text-balance text-foreground md:text-2xl"
              >
                Latest Announcements
              </h2>
              <p className="mt-1 text-sm text-pretty text-muted-foreground">
                Most recent updates from the hall
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {announcements.map((item) => (
                <AnnouncementCard
                  key={item.id}
                  announcement={item}
                  onOpen={() => setReading(toReading(item))}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <Dialog
        open={reading != null}
        onOpenChange={(o) => !o && setReading(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {reading && (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="text-xl leading-snug">
                  {reading.title}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <time dateTime={reading.date}>
                    {reading.dateLabel ?? formatAnnouncementDate(reading.date)}
                  </time>
                  {reading.category && (
                    <CategoryBadge category={reading.category} />
                  )}
                </div>
              </DialogHeader>
              <DialogDescription className="sr-only">
                {reading.summary ?? reading.title}
              </DialogDescription>
              {reading.details && reading.details.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {reading.details.map((d) => (
                    <span
                      key={d.icon}
                      className="inline-flex items-center gap-1.5"
                    >
                      {d.icon === 'time' ? (
                        <Clock className="size-4 text-primary" />
                      ) : (
                        <MapPin className="size-4 text-primary" />
                      )}
                      {d.text}
                    </span>
                  ))}
                </div>
              )}
              {reading.body ? (
                <RichContent html={reading.body} />
              ) : (
                reading.summary && (
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {reading.summary}
                  </p>
                )
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {(events.length > 0 || featuredEvent) && (
        <div className="mx-auto max-w-6xl space-y-12 px-4 py-12 pb-20 sm:px-6">
          <section>
            <h2 className="mb-4 text-xl font-bold text-foreground md:text-2xl">
              Upcoming Events
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Card
                  key={event.id}
                  className="glass-panel group relative border-0 transition-shadow hover:shadow-lg"
                >
                  <CardContent className="space-y-3">
                    <h3 className="font-semibold text-foreground group-hover:text-primary">
                      {/* Stretched button: the whole card opens the event. */}
                      <button
                        type="button"
                        onClick={() => setReading(eventToReading(event))}
                        className="text-left focus:outline-none"
                      >
                        <span className="absolute inset-0 rounded-xl group-focus-within:ring-2 group-focus-within:ring-primary" />
                        {event.title}
                      </button>
                    </h3>
                    {event.excerpt && (
                      <p className="text-sm text-muted-foreground">
                        {event.excerpt}
                      </p>
                    )}
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <CalendarDays className="size-4 text-primary" />{' '}
                        {formatEventDates(event.event_start!, event.event_end)}
                      </p>
                      {event.event_time && (
                        <p className="flex items-center gap-2">
                          <Clock className="size-4 text-primary" />{' '}
                          {event.event_time}
                        </p>
                      )}
                      {event.location && (
                        <p className="flex items-center gap-2">
                          <MapPin className="size-4 text-primary" />{' '}
                          {event.location}
                        </p>
                      )}
                    </div>
                    {event.body && (
                      <p className="flex items-center gap-1 text-xs font-medium text-primary">
                        Details <ChevronRight className="size-3.5" />
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {featuredEvent && (
              <div className="mt-6 rounded-xl bg-primary p-8 text-center text-primary-foreground">
                <h3 className="text-xl font-bold">Featured Event</h3>
                <p className="mt-2">
                  {featuredEvent.excerpt ?? `Don't miss ${featuredEvent.title}`}{' '}
                  -{' '}
                  {formatEventDates(
                    featuredEvent.event_start!,
                    featuredEvent.event_end,
                  )}
                </p>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() => setReading(eventToReading(featuredEvent))}
                >
                  Learn More
                </Button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
      {category}
    </span>
  )
}

function AnnouncementCard({
  announcement,
  onOpen,
}: {
  announcement: Announcement
  onOpen: () => void
}) {
  return (
    <article className="group rounded-2xl border border-border bg-card p-4 shadow-sm transition focus-within:ring-2 focus-within:ring-primary hover:shadow-md sm:p-6">
      <header>
        <button
          type="button"
          onClick={onOpen}
          className="block text-left focus:outline-none"
        >
          <h3 className="text-lg leading-snug font-semibold tracking-tight text-foreground group-hover:text-primary sm:text-xl">
            {announcement.title}
          </h3>
        </button>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <time dateTime={announcement.date}>
            {formatAnnouncementDate(announcement.date)}
          </time>
          <CategoryBadge category={announcement.category} />
        </div>
      </header>
      <p className="mt-3 line-clamp-4 text-sm text-foreground/80">
        {announcement.excerpt}
      </p>
      <div className="mt-4">
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Read more: ${announcement.title}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 focus:outline-none"
        >
          Read more
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  )
}

function NewsImage({ item }: { item: NewsItem }) {
  const [failed, setFailed] = useState(false)
  const imageClass =
    'size-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1'
  if (!item.image || failed) {
    return (
      <div className={`flex items-center justify-center ${imageClass}`}>
        <img
          src={asset('logo.png')}
          alt=""
          className="h-28 w-auto opacity-30"
        />
      </div>
    )
  }
  return (
    <img
      src={/^https?:\/\//.test(item.image) ? item.image : asset(item.image)}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={imageClass}
    />
  )
}

function NewsCard({ item, onOpen }: { item: NewsItem; onOpen: () => void }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl">
      <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
        <NewsImage item={item} />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <span className="absolute top-4 left-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 text-xs font-semibold text-primary shadow-md backdrop-blur-sm">
          <Tag className="size-3.5" aria-hidden="true" />
          {item.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <CalendarDays className="size-4" aria-hidden="true" />
          <time dateTime={item.date}>{formatAnnouncementDate(item.date)}</time>
        </div>
        <h3 className="mb-3 text-xl leading-snug font-bold text-foreground transition-colors duration-300 group-hover:text-primary">
          {/* Stretched button: the whole card opens the story. */}
          <button
            type="button"
            onClick={onOpen}
            className="text-left focus:outline-none"
          >
            <span className="absolute inset-0 rounded-2xl group-focus-within:ring-2 group-focus-within:ring-primary" />
            {item.title}
          </button>
        </h3>
        <p className="mb-4 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          {item.excerpt}
        </p>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors duration-300 group-hover:text-primary">
          <span>Read more</span>
          <ArrowRight
            className="size-3.5 transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </div>
      </div>
    </article>
  )
}
