// Client-safe server function for the public Yellow Pages loader. The DB
// service is imported dynamically so mysql2 stays out of the browser bundle
// (see the note in routes/api/$.ts).
import { createServerFn } from "@tanstack/react-start";

export const getDirectoryEntries = createServerFn({ method: "GET" }).handler(async () => {
  const { listActiveEntries } = await import("./api/modules/directory/service.js");
  return { entries: await listActiveEntries() };
});
