import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, ExternalLink, Link2, MapPin } from 'lucide-react'
import type { HubPostRow } from '@knh/db'
import { ARTICLE_SECTIONS, formatEventDates, formatPostDate, postPath } from '#/lib/posts'
import type { ArticleType } from '#/lib/posts'
import { DecorativeBackground } from '#/components/decorative-background'
import { RichContent } from '#/components/rich-content'
import { AnnouncementCard, CategoryBadge, EventCard, NewsCard, postImageSrc } from '#/components/hub-posts'

// Page furniture for /news, /announcements, /events and their articles.

const SECTION_ORDER: Array<ArticleType> = ['news', 'announcement', 'event']

function Breadcrumbs({ trail }: { trail: Array<{ label: string; to?: '/news' | '/announcements' | '/events' }> }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs font-medium text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link to="/" className="hover:text-primary">Home</Link>
        </li>
        {trail.map((crumb) => (
          <li key={crumb.label} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5" aria-hidden="true" />
            {crumb.to ? (
              <Link to={crumb.to} className="hover:text-primary">{crumb.label}</Link>
            ) : (
              <span aria-current="page" className="line-clamp-1 text-foreground">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function SectionHeader({ type }: { type: ArticleType }) {
  const section = ARTICLE_SECTIONS[type]
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-card via-secondary/60 to-card py-10 sm:py-14">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <Breadcrumbs trail={[{ label: section.label }]} />
        <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[0.16em] text-primary uppercase">Kwame Nkrumah Hall</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">{section.title}</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground md:text-lg">{section.intro}</p>
          </div>
          <nav aria-label="News sections" className="flex flex-wrap gap-2">
            {SECTION_ORDER.map((t) => (
              <Link
                key={t}
                to={ARTICLE_SECTIONS[t].path}
                className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                activeProps={{ className: 'border-primary! bg-primary! text-white! hover:text-white!' }}
              >
                {ARTICLE_SECTIONS[t].label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </section>
  )
}

export function EmptyList({ text }: { text: string }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <CalendarDays className="mx-auto size-9 text-primary/40" aria-hidden="true" />
      <p className="mt-3 text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

export function Pager({ path, page, total, perPage }: { path: '/news' | '/announcements'; page: number; total: number; perPage: number }) {
  const pages = Math.max(1, Math.ceil(total / perPage))
  if (pages <= 1) return null
  const cls = 'inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary'
  return (
    <nav aria-label="Pages" className="mt-12 flex items-center justify-center gap-3">
      {page > 1 ? (
        <Link to={path} search={page - 1 > 1 ? { page: page - 1 } : {}} rel="prev" className={cls}>
          <ChevronLeft className="size-4" aria-hidden="true" /> Newer
        </Link>
      ) : null}
      <span className="text-sm text-muted-foreground">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link to={path} search={{ page: page + 1 }} rel="next" className={cls}>
          Older <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </nav>
  )
}

function ShareLinks({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)
  const text = encodeURIComponent(`${title} ${url}`)
  const enc = encodeURIComponent(url)
  const cls = 'inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary'
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground">Share:</span>
      <a className={cls} href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a className={cls} href={`https://www.facebook.com/sharer/sharer.php?u=${enc}`} target="_blank" rel="noopener noreferrer">Facebook</a>
      <a className={cls} href={`https://x.com/intent/post?url=${enc}&text=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer">X</a>
      <button
        type="button"
        className={cls}
        onClick={() => navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })}
      >
        {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Link2 className="size-3.5" aria-hidden="true" />}
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  )
}

export function RelatedPosts({ posts, type }: { posts: Array<HubPostRow>; type: ArticleType }) {
  if (!posts.length) return null
  const Card = type === 'news' ? NewsCard : type === 'event' ? EventCard : AnnouncementCard
  return (
    <section aria-labelledby="related-heading" className="border-t border-border bg-card/60 py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 id="related-heading" className="text-xl font-bold text-foreground md:text-2xl">
            More {ARTICLE_SECTIONS[type].label.toLowerCase()}
          </h2>
          <Link to={ARTICLE_SECTIONS[type].path} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80">
            View all <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Card key={p.id} post={p} />
          ))}
        </div>
      </div>
    </section>
  )
}

export function ArticleView({ post, related, siteUrl }: { post: HubPostRow; related: Array<HubPostRow>; siteUrl: string }) {
  const type = post.type as ArticleType
  const section = ARTICLE_SECTIONS[type]
  const url = `${siteUrl}${postPath({ id: post.id, title: post.title, type })}`
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <div className="relative">
      <DecorativeBackground />
      <article className="relative mx-auto max-w-5xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14">
        <Breadcrumbs trail={[{ label: section.label, to: section.path }, { label: post.title }]} />
        <header className="mt-6">
          {post.category && <CategoryBadge category={post.category} />}
          <h1 className="mt-3 text-3xl leading-tight font-bold tracking-tight text-balance text-foreground md:text-4xl">{post.title}</h1>
          {type === 'event' ? (
            <dl className="mt-5 grid gap-2 rounded-xl border border-border bg-card p-4 text-sm sm:grid-cols-3">
              <div className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <dt className="sr-only">Date</dt>
                  <dd className="font-medium text-foreground">{formatEventDates(post.event_start ?? post.published_on, post.event_end)}</dd>
                </div>
              </div>
              {post.event_time && (
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <dt className="sr-only">Time</dt>
                    <dd className="font-medium text-foreground">{post.event_time}</dd>
                  </div>
                </div>
              )}
              {post.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <dt className="sr-only">Venue</dt>
                    <dd className="font-medium text-foreground">{post.location}</dd>
                  </div>
                </div>
              )}
            </dl>
          ) : (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4" aria-hidden="true" />
              <time dateTime={post.published_on}>{formatPostDate(post.published_on)}</time>
            </p>
          )}
        </header>

        {post.image_url && !imageFailed && (
          <figure className="mt-8 overflow-hidden rounded-2xl border border-border bg-secondary shadow-sm">
            <img
              src={postImageSrc(post.image_url)}
              alt={post.title}
              onError={() => setImageFailed(true)}
              className="max-h-[480px] w-full object-cover"
            />
          </figure>
        )}

        <div className="mt-8">
          {post.body ? (
            <RichContent html={post.body} size="article" />
          ) : (
            post.excerpt && <p className="text-base leading-relaxed text-foreground/85 md:text-lg">{post.excerpt}</p>
          )}
        </div>

        {post.link_url && (
          <a
            href={post.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            Read the original <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        )}

        <footer className="mt-10 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Link to={section.path} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80">
            <ArrowLeft className="size-4" aria-hidden="true" /> All {section.label.toLowerCase()}
          </Link>
          <ShareLinks url={url} title={post.title} />
        </footer>
      </article>
      <RelatedPosts posts={related} type={type} />
    </div>
  )
}

export function ArticleNotFound({ type }: { type: ArticleType }) {
  const section = ARTICLE_SECTIONS[type]
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-foreground">This page isn't available</h1>
      <p className="mt-3 text-muted-foreground">It may have been removed or unpublished.</p>
      <Link to={section.path} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80">
        <ArrowLeft className="size-4" aria-hidden="true" /> Browse {section.label.toLowerCase()}
      </Link>
    </div>
  )
}
