import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

// Fetch the code for a portal's sidebar pages once the browser is idle, so the
// first click on each one doesn't wait for its chunk on a slow network.
export function usePreloadRoutes(paths: readonly string[]) {
  const router = useRouter();
  const key = paths.join("|");

  useEffect(() => {
    const preload = () => {
      for (const to of key.split("|")) {
        router.preloadRoute({ to }).catch(() => {});
      }
    };
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(preload, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(preload, 1500);
    return () => clearTimeout(id);
  }, [router, key]);
}
