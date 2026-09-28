// Client-safe server function for the public E-Market loader. The DB
// services are imported dynamically so mysql2 stays out of the browser
// bundle (see the note in routes/api/$.ts).
import { createServerFn } from "@tanstack/react-start";

export const getMarketCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const [{ getPublicCatalog }, { listPublicVendors }] = await Promise.all([
    import("./api/modules/market/service.js"),
    import("./api/modules/food/service.js"),
  ]);
  const [catalog, vendors] = await Promise.all([getPublicCatalog(), listPublicVendors()]);
  return { ...catalog, vendors };
});
