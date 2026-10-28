// Client-safe server functions for the article pages (lib/posts.ts). The DB
// service is imported dynamically so mysql2 stays out of the browser bundle
// (see the note in routes/api/$.ts). Each returns the site's public origin
// (APP_URL) so pages can build canonical and Open Graph URLs.
import { createServerFn } from "@tanstack/react-start";
import { postIdFromSlug, postSlug, siteOrigin } from "#/lib/posts";
import type { ArticleType } from "#/lib/posts";

const origin = () => siteOrigin(process.env.APP_URL);

export const getArticleList = createServerFn({ method: "GET" })
  .inputValidator((input: { type: "news" | "announcement"; page: number }) => input)
  .handler(async ({ data }) => {
    const { listPublicPosts } = await import("./api/modules/hub/service.js");
    const page = Number.isSafeInteger(data.page) && data.page > 0 ? data.page : 1;
    return { ...(await listPublicPosts(data.type, page)), page, siteUrl: origin() };
  });

export const getEventList = createServerFn({ method: "GET" }).handler(async () => {
  const { listPublicEvents } = await import("./api/modules/hub/service.js");
  return { ...(await listPublicEvents()), siteUrl: origin() };
});

// `canonicalSlug` lets the route redirect an outdated or partial slug
// (e.g. after a title change) to the current address.
export const getArticle = createServerFn({ method: "GET" })
  .inputValidator((input: { type: ArticleType; slug: string }) => input)
  .handler(async ({ data }) => {
    const id = postIdFromSlug(data.slug);
    if (!id) return null;
    const { getPublicPost } = await import("./api/modules/hub/service.js");
    const found = await getPublicPost(data.type, id);
    if (!found) return null;
    return { ...found, canonicalSlug: postSlug(found.post), siteUrl: origin() };
  });
