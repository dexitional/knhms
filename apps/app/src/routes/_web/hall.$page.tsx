import { useEffect, useRef, useState } from 'react'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Mail, Phone, Users } from 'lucide-react'
import { asset } from '#/lib/asset'
import { HALL_PAGES, hallPage } from '#/lib/hall'
import { getHallPage } from '#/server/hall'
import { DecorativeBackground } from '#/components/decorative-background'
import { NewsCard } from '#/components/hub-posts'
import { pageHead } from '#/lib/seo'

// The hall pages under the Home menu: Hall Council, Management, Tutors,
// Projects and Executives (JCRC). See lib/hall.ts for where each page's
// content is managed.
export const Route = createFileRoute('/_web/hall/$page')({
  beforeLoad: ({ params }) => {
    if (!hallPage(params.page)) throw redirect({ to: '/' })
  },
  loader: ({ params }) => getHallPage({ data: params.page }),
  head: ({ loaderData, params }) => {
    const page = hallPage(params.page)
    return loaderData && page
      ? pageHead({ title: page.label, description: page.intro, path: `/hall/${page.slug}`, siteUrl: loaderData.siteUrl })
      : {}
  },
  component: HallPageView,
})

type Person = Awaited<ReturnType<typeof getHallPage>>['people'][number]

function HallPageView() {
  const { page: slug } = Route.useParams()
  const page = hallPage(slug)!
  const { people, projects } = Route.useLoaderData()
  const isEmpty = page.source.kind === 'projects' ? projects.length === 0 : people.length === 0

  return (
    <div className="relative">
      <DecorativeBackground />
      <section className="relative overflow-hidden bg-gradient-to-b from-card via-secondary/60 to-card py-12 sm:py-16">
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <nav aria-label="Hall pages" className="mb-8 flex flex-wrap justify-center gap-2">
            {HALL_PAGES.map((p) => (
              <Link
                key={p.slug}
                to="/hall/$page"
                params={{ page: p.slug }}
                className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                activeProps={{ className: 'border-primary! bg-primary! text-white! hover:text-white!' }}
              >
                {p.label}
              </Link>
            ))}
          </nav>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold tracking-[0.16em] text-primary uppercase">Kwame Nkrumah Hall</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">{page.label}</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground md:text-lg">{page.intro}</p>
          </div>
        </div>
      </section>

      <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
        {isEmpty ? (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <Users className="mx-auto size-9 text-primary/40" aria-hidden="true" />
            <p className="mt-3 text-sm text-muted-foreground">{page.empty}</p>
          </div>
        ) : page.source.kind === 'projects' ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((post) => (
              <NewsCard key={post.id} post={post} headingLevel="h2" />
            ))}
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {people.map((person) => (
              <li key={person.id}>
                <PersonCard person={person} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function initials(name: string) {
  return name
    .replace(/^(Dr|Prof|Rev|Mr|Mrs|Ms|Miss)\.?\s+/i, '')
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// Same look as the Yellow Pages personnel card.
function PersonCard({ person }: { person: Person }) {
  const [photoFailed, setPhotoFailed] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // With SSR the image can fail before hydration attaches onError.
  useEffect(() => {
    const img = imgRef.current
    if (img?.complete && img.naturalWidth === 0) setPhotoFailed(true)
  }, [])

  return (
    <article className="flex h-full flex-col items-center rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-shadow hover:shadow-lg">
      <span className="relative mx-auto inline-flex size-24 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-2xl font-semibold text-primary shadow ring-4 ring-ring select-none">
        <span aria-hidden="true">{initials(person.name)}</span>
        {person.photo_url && !photoFailed && (
          <img
            ref={imgRef}
            src={/^https?:\/\//.test(person.photo_url) ? person.photo_url : asset(person.photo_url)}
            alt={person.name}
            width={96}
            height={96}
            loading="lazy"
            onError={() => setPhotoFailed(true)}
            className="absolute inset-0 size-full object-cover object-top"
          />
        )}
      </span>
      <h2 className="mt-4 text-base leading-snug font-bold text-foreground">{person.name}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{person.title}</p>
      {person.subtitle && (
        <p className="mt-2 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">{person.subtitle}</p>
      )}
      {(person.phone || person.email) && (
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
          {person.phone && (
            <a
              href={`tel:${person.phone.replace(/[^\d+]/g, '')}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-medium text-foreground hover:border-primary hover:text-primary"
            >
              <Phone className="size-3.5" aria-hidden="true" />
              Call
            </a>
          )}
          {person.email && (
            <a
              href={`mailto:${person.email}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-medium text-foreground hover:border-primary hover:text-primary"
            >
              <Mail className="size-3.5" aria-hidden="true" />
              Email
            </a>
          )}
        </div>
      )}
    </article>
  )
}
