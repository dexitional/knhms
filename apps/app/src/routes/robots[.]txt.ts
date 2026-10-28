import { createFileRoute } from "@tanstack/react-router";
import { siteOrigin } from "#/lib/posts";

// /robots.txt: keep crawlers out of the signed-in areas and point them at
// the sitemap (absolute URL from APP_URL).
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        const site = siteOrigin(process.env.APP_URL);
        const body = [
          "User-agent: *",
          "Disallow: /admin",
          "Disallow: /student",
          "Disallow: /seller",
          "Disallow: /api",
          "Disallow: /print",
          "",
          `Sitemap: ${site}/sitemap.xml`,
          "",
        ].join("\n");
        return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
      },
    },
  },
});
