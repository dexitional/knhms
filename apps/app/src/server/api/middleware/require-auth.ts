import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import type { AdminRole } from "@knh/db";
import { ADMIN_SESSION_COOKIE, STUDENT_SESSION_COOKIE } from "#/server/session";
import {
  getAdminSessionUser,
  getStudentSessionUser,
  readAdminIdFromToken,
  readStudentIdFromToken
  
  
} from "#/server/session-core";
import type {AdminSessionUser, StudentSessionUser} from "#/server/session-core";
import { AppError } from "./error-handler.js";

declare module "hono" {
  interface ContextVariableMap {
    student: StudentSessionUser;
    admin: AdminSessionUser;
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

export const ANY_ADMIN: AdminRole[] = ["super_admin", "admin", "staff"];
export const ADMIN_ONLY: AdminRole[] = ["super_admin", "admin"];
export const SUPER_ADMIN_ONLY: AdminRole[] = ["super_admin"];
