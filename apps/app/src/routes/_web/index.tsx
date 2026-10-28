import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, ChevronRight, Star } from 'lucide-react'
import { getHubContent } from '#/server/hub'
import { homeHead } from '#/lib/seo'
import { formatEventDates, postSlug } from '#/lib/posts'
import { DecorativeBackground } from '#/components/decorative-background'
import { SpotlightHero } from '#/components/spotlight-hero'
import { AnnouncementCard, EventCard, NewsCard } from '#/components/hub-posts'

// Home: the KNH Hub feed (spotlights, news, announcements, events), managed
// in Admin → KNH Hub. Each post is read on its own page (/news/…,
// /announcements/…, /events/…). The old /knh-hub address redirects here.
export const Route = createFileRoute('/_web/')({
  loader: () => getHubContent(),
  head: ({ loaderData }) => (loaderData ? homeHead(loaderData.siteUrl) : {}),
  component: HomePage,
})

const NEWS_PREVIEW_COUNT = 3

function ViewAll({ to, children }: { to: '/news' | '/announcements' | '/events'; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-foreground/90 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      {children}
      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
    </Link>
  )
}

function HomePage() {
  const data = Route.useLoaderData()
  const news = data.news.slice(0, NEWS_PREVIEW_COUNT)
  const featuredEvent = data.events.find((e) => e.is_featured)
  const events = data.events.filter((e) => e !== featuredEvent)

  return (
    <div className="relative">
      <DecorativeBackground />
      <SpotlightHero slides={data.spotlights} />

      {news.length > 0 && (
        <section
          aria-labelledby="news-heading"
          className="relative overflow-hidden bg-gradient-to-b from-card via-secondary/60 to-card py-16 sm:py-20"
        >
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 id="news-heading" className="text-2xl font-bold tracking-tight text-foreground md:text-4xl">
                Latest News
              </h2>
              <p className="mt-2 text-base leading-7 text-muted-foreground md:mt-4 md:text-lg md:leading-8">
                Stay informed with the latest news and updates from Kwame Nkrumah Hall
              </p>
            </div>
            <div className="mx-auto mt-12 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
              {news.map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <ViewAll to="/news">View All News</ViewAll>
            </div>
          </div>
        </section>
      )}

      {data.announcements.length > 0 && (
        <section aria-labelledby="announcements-heading" className="border-y border-border bg-card py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Star className="size-3.5 fill-current" aria-hidden="true" />
                  Latest
                </div>
                <h2 id="announcements-heading" className="text-xl font-bold text-balance text-foreground md:text-2xl">
                  Latest Announcements
                </h2>
                <p className="mt-1 text-sm text-pretty text-muted-foreground">Most recent updates from the hall</p>
              </div>
              <Link to="/announcements" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80">
                All announcements <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {data.announcements.map((post) => (
                <AnnouncementCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        </section>
      )}

      {(events.length > 0 || featuredEvent) && (
        <div className="mx-auto max-w-6xl space-y-12 px-4 py-12 pb-20 sm:px-6">
          <section aria-labelledby="events-heading">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <h2 id="events-heading" className="text-xl font-bold text-foreground md:text-2xl">
                Upcoming Events
              </h2>
              <Link to="/events" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80">
                All events <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((post) => (
                <EventCard key={post.id} post={post} />
              ))}
            </div>

            {featuredEvent && (
              <div className="mt-6 rounded-xl bg-primary p-8 text-center text-primary-foreground">
                <h3 className="text-xl font-bold">Featured Event</h3>
                <p className="mt-2">
                  {featuredEvent.excerpt ?? `Don't miss ${featuredEvent.title}`} -{' '}
                  {formatEventDates(featuredEvent.event_start ?? featuredEvent.published_on, featuredEvent.event_end)}
                </p>
                <Link
                  to="/events/$slug"
                  params={{ slug: postSlug(featuredEvent) }}
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow-xs hover:bg-secondary/80"
                >
                  Learn More
                </Link>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
