import type { QueryClient } from "@tanstack/react-query";

// Portal layouts used to ask the server for the session on every click,
// and the router can't show the next page until that answer arrives — on a
// slow network every click felt stuck. The session is now kept in the query
// cache: clicks reuse it straight away, and once it is older than
// SESSION_STALE_MS it is refreshed in the background.

export const SESSION_STALE_MS = 5 * 60_000;

export const sessionKeys = {
  all: ["session"] as const,
  admin: ["session", "admin"] as const,
  student: ["session", "student"] as const,
  seller: ["session", "seller"] as const,
};

export async function cachedSession<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  fetchSession: () => Promise<T | null>,
): Promise<T | null> {
  const user = await queryClient.ensureQueryData({
    queryKey,
    queryFn: fetchSession,
    staleTime: SESSION_STALE_MS,
    revalidateIfStale: true,
  });
  // Don't keep "signed out" around, or signing in would still look signed out.
  if (!user) queryClient.removeQueries({ queryKey });
  return user;
}

// The browser's query client, so the API client can drop cached sessions
// when someone signs in or out. Only bound in the browser: on the server
// each request has its own client and a module-level one would be shared.
let browserClient: QueryClient | null = null;

export function bindSessionCache(queryClient: QueryClient) {
  if (typeof window !== "undefined") browserClient = queryClient;
}

// Signing in, signing out or registering: forget every cached session.
export function clearSessionCache() {
  browserClient?.removeQueries({ queryKey: sessionKeys.all });
}

// Any other change (a renamed profile, a room move): keep showing the cached
// session but refresh it on the next page change.
export function markSessionStale() {
  void browserClient?.invalidateQueries({ queryKey: sessionKeys.all, refetchType: "none" });
}
