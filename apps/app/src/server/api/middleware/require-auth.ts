import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import type { AdminRole } from "@knh/db";
import { rolesWith } from "#/lib/permissions";
import type { Access, AdminModule } from "#/lib/permissions";
import { ADMIN_SESSION_COOKIE, SELLER_SESSION_COOKIE, STUDENT_SESSION_COOKIE } from "#/server/session";
import {
  getAdminSessionUser,
  getSellerSessionUser,
  getStudentSessionUser,
  readAdminIdFromToken,
  readSellerIdFromToken,
  readStudentIdFromToken,
} from "#/server/session-core";
import type { AdminSessionUser, SellerSessionUser, StudentSessionUser } from "#/server/session-core";
import { AppError } from "./error-handler.js";

declare module "hono" {
  interface ContextVariableMap {
    student: StudentSessionUser;
    admin: AdminSessionUser;
    seller: SellerSessionUser;
  }
}

export async function requireStudent(c: Context, next: Next) {
  const token = getCookie(c, STUDENT_SESSION_COOKIE);
  const id = await readStudentIdFromToken(token);
  if (!id) throw new AppError("Not authenticated.", 401);
  const student = await getStudentSessionUser(id);
  if (!student) throw new AppError("Not authenticated.", 401);
  c.set("student", student);
  await next();
}

export async function requireSeller(c: Context, next: Next) {
  const token = getCookie(c, SELLER_SESSION_COOKIE);
  const id = await readSellerIdFromToken(token);
  if (!id) throw new AppError("Not authenticated.", 401);
  const seller = await getSellerSessionUser(id);
  if (!seller) throw new AppError("Not authenticated.", 401);
  c.set("seller", seller);
  await next();
}

export function requireAdminRole(allowed: AdminRole[]) {
  return async (c: Context, next: Next) => {
    const token = getCookie(c, ADMIN_SESSION_COOKIE);
    const id = await readAdminIdFromToken(token);
    if (!id) throw new AppError("Not authenticated.", 401);
    const admin = await getAdminSessionUser(id);
    if (!admin) throw new AppError("Not authenticated.", 401);
    if (!allowed.includes(admin.role)) throw new AppError("Forbidden.", 403);
    c.set("admin", admin);
    await next();
  };
}

export const ANY_ADMIN: AdminRole[] = ["super_admin", "admin", "staff", "tutor", "technician", "stores", "supervisor", "editor", "manager"];
export const ADMIN_ONLY: AdminRole[] = ["super_admin", "admin"];
export const SUPER_ADMIN_ONLY: AdminRole[] = ["super_admin"];

// Guards a route by the role matrix in lib/permissions.ts: "view" for reads,
// "manage" for anything that changes data.
export function requirePermission(module: AdminModule, level: Access) {
  return requireAdminRole(rolesWith(module, level));
}
