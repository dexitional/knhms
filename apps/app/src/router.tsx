import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { getContext } from "./integrations/tanstack-query/root-provider";
import { RoutePending } from "./components/skeletons";
import { bindSessionCache } from "./lib/session-cache";

export function getRouter() {
  const context = getContext();
  bindSessionCache(context.queryClient);

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    // Show the next page's skeleton the moment a link is clicked, rather than
    // leaving the old page on screen while its data loads (slow networks made
    // clicks look ignored). The minimum stops a one-frame flash.
    defaultPendingComponent: RoutePending,
    defaultPendingMs: 0,
    defaultPendingMinMs: 150,
  });

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
