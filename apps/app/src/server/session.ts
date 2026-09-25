// Client-safe session surface, imported by route `beforeLoad` guards
// (student/_student/route.tsx, admin/_admin/route.tsx) — which routeTree.gen.ts
// statically imports for BOTH the client and server bundles. This file must
// stay free of any DB/JWT-library imports; the real implementation lives in
// session-core.ts and is loaded dynamically below, purely so Vite/Rollup is
// forced to code-split it into a chunk the browser never actually fetches
// (these handlers only run inside Nitro's server-side request dispatch).
// See session-core.ts's top comment for the full story.
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

export const STUDENT_SESSION_COOKIE = "knh_student_session";
export const ADMIN_SESSION_COOKIE = "knh_admin_session";

export const STUDENT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export type { StudentSessionUser, AdminSessionUser } from "./session-core.js";

export const getStudentSession = createServerFn({ method: "GET" }).handler(async () => {
  const { readStudentIdFromToken, getStudentSessionUser } = await import("./session-core.js");
  const token = getCookie(STUDENT_SESSION_COOKIE);
  const id = await readStudentIdFromToken(token);
  if (!id) return null;
  return getStudentSessionUser(id);
});

export const getAdminSession = createServerFn({ method: "GET" }).handler(async () => {
  const { readAdminIdFromToken, getAdminSessionUser } = await import("./session-core.js");
  const token = getCookie(ADMIN_SESSION_COOKIE);
  const id = await readAdminIdFromToken(token);
  if (!id) return null;
  return getAdminSessionUser(id);
});
