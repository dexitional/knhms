import { createFileRoute } from '@tanstack/react-router'
import { getEventList } from '#/server/posts'
import { listHead } from '#/lib/seo'
import { ARTICLE_SECTIONS } from '#/lib/posts'
import { EventCard } from '#/components/hub-posts'
import { EmptyList, SectionHeader } from '#/components/article-pages'

// Upcoming events soonest first, then recent past ones (Admin → KNH Hub).
export const Route = createFileRoute('/_web/events/')({
  loader: () => getEventList(),
  head: ({ loaderData }) => (loaderData ? listHead('event', loaderData.siteUrl) : {}),
  component: EventsPage,
})

function EventsPage() {
  const { upcoming, past } = Route.useLoaderData()
  return (
    <div className="relative">
      <SectionHeader type="event" />
      <div className="mx-auto max-w-6xl space-y-14 px-4 pb-20 sm:px-6">
        {!upcoming.length && !past.length ? (
          <EmptyList text={ARTICLE_SECTIONS.event.empty} />
        ) : (
          <>
            <section aria-labelledby="upcoming-heading">
              <h2 id="upcoming-heading" className="mb-5 text-xl font-bold text-foreground md:text-2xl">Upcoming</h2>
              {upcoming.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map((post) => (
                    <EventCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming events right now. Check back soon.</p>
              )}
            </section>
            {past.length > 0 && (
              <section aria-labelledby="past-heading">
                <h2 id="past-heading" className="mb-5 text-xl font-bold text-foreground md:text-2xl">Past events</h2>
                <div className="grid gap-4 opacity-90 sm:grid-cols-2 lg:grid-cols-3">
                  {past.map((post) => (
                    <EventCard key={post.id} post={post} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
