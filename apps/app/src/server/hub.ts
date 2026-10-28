// Client-safe server function for the public KNH Hub loader. The DB service
// is imported dynamically so mysql2 stays out of the browser bundle (see the
// note in routes/api/$.ts).
import { createServerFn } from "@tanstack/react-start";
import { siteOrigin } from "#/lib/posts";

export const getHubContent = createServerFn({ method: "GET" }).handler(async () => {
  const { getPublicHub } = await import("./api/modules/hub/service.js");
  return { ...(await getPublicHub()), siteUrl: siteOrigin(process.env.APP_URL) };
});
