import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { getArticle } from '#/server/posts'
import { articleHead } from '#/lib/seo'
import { ArticleNotFound, ArticleView } from '#/components/article-pages'

// One news story, read on its own page. The slug is "<id>-<title>": an
// outdated or partial slug redirects to the current one.
export const Route = createFileRoute('/_web/news/$slug')({
  loader: async ({ params }) => {
    const article = await getArticle({ data: { type: 'news', slug: params.slug } })
    if (!article) throw notFound()
    if (article.canonicalSlug !== params.slug) {
      throw redirect({ to: '/news/$slug', params: { slug: article.canonicalSlug }, statusCode: 301 })
    }
    return article
  },
  head: ({ loaderData }) => (loaderData ? articleHead(loaderData.post, loaderData.siteUrl) : {}),
  notFoundComponent: () => <ArticleNotFound type="news" />,
  component: ArticlePage,
})

function ArticlePage() {
  const { post, related, siteUrl } = Route.useLoaderData()
  return <ArticleView post={post} related={related} siteUrl={siteUrl} />
}
