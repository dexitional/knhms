import { createFileRoute } from "@tanstack/react-router";

// Hono's routes (app.route("/rooms", ...) etc. in server/api/app.ts) are
// registered unprefixed, and Hono's own app.basePath() can't retroactively
// rewrite routes already registered on the instance — so the /api prefix is
// stripped here before handing off to it.
//
// `#/server/api/app` is imported dynamically, INSIDE the handler, rather
// than statically at the top of this file. routeTree.gen.ts statically
// imports every route file (this one included) so it can build the router
// used on both client and server — a static import here would drag every
// Hono module, and everything they import (mysql2, @aws-sdk/client-s3,
// xlsx, bcryptjs, ...), into the browser bundle. Node's mysql2 in
// particular then crashes on load in the browser (it extends the "events"
// module's EventEmitter, which Vite can only stub out client-side), which
// silently breaks React hydration for the whole page — not just this route.
// A dynamic import forces a real code-split boundary: this handler only
// ever actually runs inside Nitro's server-side request dispatch, so the
// chunk it pulls in is never fetched by the browser.
export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      ANY: async ({ request }) => {
        const { apiApp } = await import("#/server/api/app");
        const url = new URL(request.url);
        url.pathname = url.pathname.replace(/^\/api/, "") || "/";
        const rewritten = new Request(url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          // Node's fetch requires this when a Request is constructed with a
          // streaming body.
          duplex: "half",
        } as RequestInit & { duplex: "half" });
        return apiApp.fetch(rewritten);
      },
    },
  },
});
