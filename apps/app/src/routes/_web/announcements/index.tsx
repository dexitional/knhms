import { createFileRoute } from '@tanstack/react-router'
import { getArticleList } from '#/server/posts'
import { listHead } from '#/lib/seo'
import { ARTICLE_SECTIONS } from '#/lib/posts'
import { AnnouncementCard } from '#/components/hub-posts'
import { EmptyList, Pager, SectionHeader } from '#/components/article-pages'

// Announcements, newest first (Admin → KNH Hub).
export const Route = createFileRoute('/_web/announcements/')({
  validateSearch: (search: Record<string, unknown>): { page?: number } => {
    const page = Number(search.page)
    return Number.isSafeInteger(page) && page > 1 ? { page } : {}
  },
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: ({ deps }) => getArticleList({ data: { type: 'announcement', page: deps.page } }),
  head: ({ loaderData }) => (loaderData ? listHead('announcement', loaderData.siteUrl, loaderData.page) : {}),
  component: ListPage,
})

function ListPage() {
  const { posts, page, total, perPage } = Route.useLoaderData()
  return (
    <div className="relative">
      <SectionHeader type="announcement" />
      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        {posts.length ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <AnnouncementCard key={post.id} post={post} headingLevel="h2" />
            ))}
          </div>
        ) : (
          <EmptyList text={ARTICLE_SECTIONS.announcement.empty} />
        )}
        <Pager path="/announcements" page={page} total={total} perPage={perPage} />
      </div>
    </div>
  )
}
