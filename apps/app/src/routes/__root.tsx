import { useEffect } from "react";
import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { Toaster } from "sonner";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";
import { asset } from "#/lib/asset";

import type { QueryClient } from "@tanstack/react-query";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Kwame Nkrumah Hall" },
      {
        name: "description",
        content: "Kwame Nkrumah Hall Management System — University of Cape Coast. Leadership by Example.",
      },
    ],
    links: [
      { rel: "icon", type: "image/png", href: asset("logo.png") },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  // A tab left open across a deploy still references the previous build's
  // hashed chunk filenames — once a new build replaces .output/public/assets
  // with fresh hashes, that exact file 404s and Vite's dynamic import throws
  // "Failed to fetch dynamically imported module". Vite dispatches a
  // cancelable `vite:preloadError` event for this case; reload once to pick
  // up the current build instead of surfacing the error. Guarded with a
  // sessionStorage flag so a genuinely broken deploy can't reload-loop.
  useEffect(() => {
    const key = "knh-preload-error-reload";
    const clearFlag = setTimeout(() => sessionStorage.removeItem(key), 5000);

    function handlePreloadError(event: Event) {
      event.preventDefault();
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      window.location.reload();
    }

    window.addEventListener("vite:preloadError", handlePreloadError);
    return () => {
      clearTimeout(clearFlag);
      window.removeEventListener("vite:preloadError", handlePreloadError);
    };
  }, []);

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster richColors position="top-right" />
        <TanStackDevtools
          config={{ position: "bottom-right" }}
          plugins={[
            { name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
