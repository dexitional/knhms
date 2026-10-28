import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, CalendarDays, ChevronRight, Clock, MapPin, Tag } from 'lucide-react'
import type { HubPostRow } from '@knh/db'
import { asset } from '#/lib/asset'
import { formatEventDates, formatPostDate, postSlug, summaryOf } from '#/lib/posts'
import { Card, CardContent } from '#/components/ui/card.tsx'

// KNH Hub post cards, shared by Home, the /news, /announcements and /events
// pages, article "read next" lists and Hall Projects. Every card links to
// the post's own page (lib/posts.ts).

// The post's page. Spotlights have none: they use their link, if any.
export function PostLink({
  post,
  className,
  children,
  label,
}: {
  post: HubPostRow
  className?: string
  children: React.ReactNode
  label?: string
}) {
  const slug = postSlug(post)
  const props = { className, 'aria-label': label }
  if (post.type === 'news') return <Link to="/news/$slug" params={{ slug }} {...props}>{children}</Link>
  if (post.type === 'announcement') return <Link to="/announcements/$slug" params={{ slug }} {...props}>{children}</Link>
  if (post.type === 'event') return <Link to="/events/$slug" params={{ slug }} {...props}>{children}</Link>
  if (post.link_url) return <a href={post.link_url} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
  return <span className={className}>{children}</span>
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
      {category}
    </span>
  )
}

export function postImageSrc(url: string) {
  return /^https?:\/\//.test(url) ? url : asset(url)
}

function PostImage({ image, className }: { image: string | null; className: string }) {
  const [failed, setFailed] = useState(false)
  if (!image || failed) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <img src={asset('logo.png')} alt="" className="h-28 w-auto opacity-30" />
      </div>
    )
  }
  return (
    <img
      src={postImageSrc(image)}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  )
}

export function NewsCard({ post, headingLevel = 'h3' }: { post: HubPostRow; headingLevel?: 'h2' | 'h3' }) {
  const Heading = headingLevel
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl">
      <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
        <PostImage
          image={post.image_url}
          className="size-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {post.category && (
          <span className="absolute top-4 left-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 text-xs font-semibold text-primary shadow-md backdrop-blur-sm">
            <Tag className="size-3.5" aria-hidden="true" />
            {post.category}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <CalendarDays className="size-4" aria-hidden="true" />
          <time dateTime={post.published_on}>{formatPostDate(post.published_on)}</time>
        </div>
        <Heading className="mb-3 text-xl leading-snug font-bold text-foreground transition-colors duration-300 group-hover:text-primary">
          {/* Stretched link: the whole card opens the story. */}
          <PostLink post={post} className="focus:outline-none">
            <span className="absolute inset-0 rounded-2xl group-focus-within:ring-2 group-focus-within:ring-primary" />
            {post.title}
          </PostLink>
        </Heading>
        <p className="mb-4 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">{summaryOf(post, 220)}</p>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors duration-300 group-hover:text-primary">
          <span>Read more</span>
          <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
        </div>
      </div>
    </article>
  )
}

export function AnnouncementCard({ post, headingLevel = 'h3' }: { post: HubPostRow; headingLevel?: 'h2' | 'h3' }) {
  const Heading = headingLevel
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-border bg-card p-4 shadow-sm transition focus-within:ring-2 focus-within:ring-primary hover:shadow-md sm:p-6">
      <header>
        <Heading className="text-lg leading-snug font-semibold tracking-tight text-foreground group-hover:text-primary sm:text-xl">
          <PostLink post={post} className="focus:outline-none">
            {post.title}
          </PostLink>
        </Heading>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <time dateTime={post.published_on}>{formatPostDate(post.published_on)}</time>
          {post.category && <CategoryBadge category={post.category} />}
        </div>
      </header>
      <p className="mt-3 line-clamp-4 flex-1 text-sm text-foreground/80">{summaryOf(post, 260)}</p>
      <div className="mt-4">
        <PostLink
          post={post}
          label={`Read more: ${post.title}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 focus:outline-none"
        >
          Read more
          <ChevronRight className="size-4" aria-hidden="true" />
        </PostLink>
      </div>
    </article>
  )
}

export function EventCard({ post, headingLevel = 'h3' }: { post: HubPostRow; headingLevel?: 'h2' | 'h3' }) {
  const Heading = headingLevel
  const start = post.event_start ?? post.published_on
  return (
    <Card className="glass-panel group relative h-full border-0 transition-shadow hover:shadow-lg">
      <CardContent className="space-y-3">
        <Heading className="font-semibold text-foreground group-hover:text-primary">
          {/* Stretched link: the whole card opens the event. */}
          <PostLink post={post} className="focus:outline-none">
            <span className="absolute inset-0 rounded-xl group-focus-within:ring-2 group-focus-within:ring-primary" />
            {post.title}
          </PostLink>
        </Heading>
        {post.excerpt && <p className="text-sm text-muted-foreground">{post.excerpt}</p>}
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" aria-hidden="true" /> {formatEventDates(start, post.event_end)}
          </p>
          {post.event_time && (
            <p className="flex items-center gap-2">
              <Clock className="size-4 text-primary" aria-hidden="true" /> {post.event_time}
            </p>
          )}
          {post.location && (
            <p className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" aria-hidden="true" /> {post.location}
            </p>
          )}
        </div>
        <p className="flex items-center gap-1 text-xs font-medium text-primary">
          Details <ChevronRight className="size-3.5" aria-hidden="true" />
        </p>
      </CardContent>
    </Card>
  )
}
