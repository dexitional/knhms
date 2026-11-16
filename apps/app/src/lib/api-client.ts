import { clearSessionCache, markSessionStale } from "./session-cache";

const API_URL = "/api";

const SIGN_IN_PAGES = [
  ["/admin", "/admin/login"],
  ["/student", "/student/login"],
  ["/seller", "/seller/login"],
] as const;

// A 401 means the session ran out while the page was open. Send the user to
// their portal's sign-in page instead of leaving the page half-broken. Calls
// to the auth endpoints themselves (a wrong password) are left to the form.
function redirectToSignIn(path: string) {
  if (typeof window === "undefined" || /^\/[a-z]+-auth\//.test(path)) return;
  const here = window.location.pathname;
  const match = SIGN_IN_PAGES.find(([base, login]) => (here === base || here.startsWith(`${base}/`)) && here !== login);
  if (match) window.location.assign(match[1]);
}

function afterChange(path: string, method: string) {
  if (method === "GET") return;
  if (/^\/[a-z]+-auth\/(login|logout|register)/.test(path)) clearSessionCache();
  else markSessionStale();
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function toQueryString(query?: object) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    if (res.status === 401) redirectToSignIn(path);
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? "Request failed", res.status);
  }

  afterChange(path, init?.method ?? "GET");
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, query?: object) => request<T>(`${path}${toQueryString(query)}`),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
