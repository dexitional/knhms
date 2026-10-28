import { createFileRoute } from "@tanstack/react-router";
import { HALL_PAGES } from "#/lib/hall";
import { ARTICLE_SECTIONS, isArticleType, postPath, siteOrigin } from "#/lib/posts";

// /sitemap.xml: the public pages plus every published article. The DB
// service is imported inside the handler (see routes/api/$.ts).
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { listSitemapPosts } = await import("#/server/api/modules/hub/service");
        const site = siteOrigin(process.env.APP_URL);
        const pages = [
          "/",
          ...Object.values(ARTICLE_SECTIONS).map((s) => s.path),
          ...HALL_PAGES.map((p) => `/hall/${p.slug}`),
          "/freshers",
          "/e-market",
          "/yellow-pages",
          "/alumni",
        ].map((path) => ({ loc: `${site}${path}`, lastmod: null as string | null }));
        const posts = (await listSitemapPosts())
          .filter((p) => isArticleType(p.type))
          .map((p) => ({
            loc: `${site}${postPath({ id: p.id, title: p.title, type: p.type as "news" | "announcement" | "event" })}`,
            lastmod: String(p.updated_at).slice(0, 10),
          }));
        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...[...pages, ...posts].map(
            (u) => `  <url><loc>${escape(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`,
          ),
          "</urlset>",
        ].join("\n");
        return new Response(xml, {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
