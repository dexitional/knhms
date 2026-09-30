// Client-safe server function for the public Yellow Pages loader. The DB
// service is imported dynamically so mysql2 stays out of the browser bundle
// (see the note in routes/api/$.ts).
import { createServerFn } from "@tanstack/react-start";

export const getDirectoryEntries = createServerFn({ method: "GET" }).handler(async () => {
  const { listActiveEntries } = await import("./api/modules/directory/service.js");
  return { entries: await listActiveEntries() };
});

// Public Alumni page: active alumni profiles (Yellow Pages "Alumni" entries)
// plus the network content (projects, executives, donations, gallery,
// donation channels).
export const getAlumni = createServerFn({ method: "GET" }).handler(async () => {
  const [{ listActiveEntries }, { getPublicContent }, { getAlumniHubPosts }] = await Promise.all([
    import("./api/modules/directory/service.js"),
    import("./api/modules/alumni/service.js"),
    import("./api/modules/hub/service.js"),
  ]);
  const [entries, network, hub] = await Promise.all([listActiveEntries(), getPublicContent(), getAlumniHubPosts()]);
  return {
    alumni: entries.filter((e) => e.category === "alumni").map((e) => ({ ...e, tags: e.tags ?? [] })),
    ...network,
    // "Alumni" announcements and events from Admin → KNH Hub.
    hubAnnouncements: hub.announcements,
    hubEvents: hub.events,
  };
});
