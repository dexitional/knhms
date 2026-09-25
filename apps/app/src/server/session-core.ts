// The actual DB/JWT-touching session implementation — sign/verify tokens,
// look up session users. Deliberately kept OUT of session.ts (which route
// `beforeLoad` guards import) because routeTree.gen.ts statically imports
// every route file for both the client and server bundles; a top-level
// `import { getPool } from "@knh/db"` reachable from a route file drags
// mysql2 into the browser bundle, where it crashes on load (it extends
// "events"'s EventEmitter, which Vite can only stub client-side) and
// silently breaks React hydration for the whole page.
//
// This file is safe to import directly (statically) from server-only
// consumers: Hono middleware/routes (never part of the client route tree)
// and, dynamically, from session.ts's createServerFn handlers.
import { sign, verify } from "hono/jwt";
import { getPool  } from "@knh/db";
import type {AdminRole} from "@knh/db";
import type { RowDataPacket } from "mysql2";
import {
  ADMIN_SESSION_TTL_SECONDS,
  STUDENT_SESSION_TTL_SECONDS,
} from "./session.js";

function studentSessionSecret(): string {
  const secret = process.env.STUDENT_SESSION_SECRET;
  if (!secret) throw new Error("STUDENT_SESSION_SECRET is not set.");
  return secret;
}

function adminSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set.");
  return secret;
}

export async function signStudentToken(studentId: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { sub: studentId, iat: now, exp: now + STUDENT_SESSION_TTL_SECONDS },
    studentSessionSecret(),
    "HS256",
  );
}

export async function signAdminToken(adminId: number, role: AdminRole): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { sub: adminId, role, iat: now, exp: now + ADMIN_SESSION_TTL_SECONDS },
    adminSessionSecret(),
    "HS256",
  );
}

export async function readStudentIdFromToken(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  try {
    const payload = await verify(token, studentSessionSecret(), "HS256");
    const id = Number(payload.sub);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export async function readAdminIdFromToken(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  try {
    const payload = await verify(token, adminSessionSecret(), "HS256");
    const id = Number(payload.sub);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export interface StudentSessionUser {
  id: number;
  registrationNumber: string;
  fullName: string;
  roomId: number;
  roomNumber: string;
}

export interface AdminSessionUser {
  id: number;
  fullName: string;
  role: AdminRole;
  institutionalEmail: string;
}

export async function getStudentSessionUser(id: number): Promise<StudentSessionUser | null> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT s.id, s.registration_number, s.full_name, s.room_id, r.room_number
     FROM students s
     JOIN rooms r ON r.id = s.room_id
     WHERE s.id = ?`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    registrationNumber: row.registration_number,
    fullName: row.full_name,
    roomId: row.room_id,
    roomNumber: row.room_number,
  };
}

export async function getAdminSessionUser(id: number): Promise<AdminSessionUser | null> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, full_name, role, institutional_email
     FROM admins WHERE id = ? AND is_active = 1`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    institutionalEmail: row.institutional_email,
  };
}
