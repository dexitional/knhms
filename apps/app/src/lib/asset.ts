// Deploys at the domain root (Vite `base: '/'`) — kept as a helper rather
// than hardcoded strings so a path-prefixed deploy stays a one-line change.
export function asset(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}
