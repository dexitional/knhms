// Client-safe server function for the hall pages under the Home menu (see
// lib/hall.ts). The DB services are imported dynamically so mysql2 stays out
// of the browser bundle (see the note in routes/api/$.ts).
import { createServerFn } from "@tanstack/react-start";
import { hallPage } from "#/lib/hall";
import { siteOrigin } from "#/lib/posts";

export const getHallPage = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const page = hallPage(slug);
    const siteUrl = siteOrigin(process.env.APP_URL);
    if (!page) return { people: [], projects: [], siteUrl };
    if (page.source.kind === "projects") {
      const { getHallProjectPosts } = await import("./api/modules/hub/service.js");
      return { people: [], projects: await getHallProjectPosts(), siteUrl };
    }
    const { category } = page.source;
    const { listActiveEntries } = await import("./api/modules/directory/service.js");
    // Entries arrive in the admin's display order; phone numbers the admin
    // chose to hide are already removed.
    const people = (await listActiveEntries())
      .filter((e) => e.category === category)
      .map(({ id, name, title, subtitle, phone, email, photo_url }) => ({ id, name, title, subtitle, phone, email, photo_url }));
    return { people, projects: [], siteUrl };
  });
