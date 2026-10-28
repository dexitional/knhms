// Client-safe server function for the public Freshers guide loader. The DB
// services are imported dynamically so mysql2 stays out of the browser
// bundle (see the note in routes/api/$.ts).
import { createServerFn } from "@tanstack/react-start";
import { siteOrigin } from "#/lib/posts";

export const getFreshmenPage = createServerFn({ method: "GET" }).handler(async () => {
  const [{ getPublicContent }, { listActiveEntries }] = await Promise.all([
    import("./api/modules/freshmen/service.js"),
    import("./api/modules/directory/service.js"),
  ]);
  const [content, entries] = await Promise.all([getPublicContent(), listActiveEntries()]);
  // The people freshers will meet: the first six Key Personnel and the first
  // three KNH Executives, in their Yellow Pages order (entries arrive sorted
  // by category, then display order).
  const pick = (category: string, count: number) => entries.filter((e) => e.category === category).slice(0, count);
  const people = [...pick("personnel", 6), ...pick("executive", 3)].map(({ id, name, title, photo_url }) => ({
    id,
    name,
    title,
    photo_url,
  }));
  return { ...content, people, siteUrl: siteOrigin(process.env.APP_URL) };
});
