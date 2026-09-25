import bcrypt from "bcryptjs";
import { getPool } from "@knh/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import type { createAdminSchema, updateAdminSchema } from "./schema.js";

// Never selects password_hash.
const SELECT_COLUMNS = `
  id, full_name, staff_number, role, position, phone_number, photo_url,
  institutional_email, is_active, created_at, updated_at
`;

type CreateInput = z.infer<typeof createAdminSchema>;
type UpdateInput = z.infer<typeof updateAdminSchema>;

interface MysqlError extends Error {
  code?: string;
}

export async function listAdmins() {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${SELECT_COLUMNS} FROM admins ORDER BY created_at DESC`,
  );
  return rows;
}

export async function getAdmin(id: number) {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(`SELECT ${SELECT_COLUMNS} FROM admins WHERE id = ?`, [
    id,
  ]);
  const admin = rows[0];
  if (!admin) throw new AppError("Admin not found.", 404);
  return admin;
}

export async function createAdmin(input: CreateInput) {
  const pool = getPool();
  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO admins (full_name, staff_number, role, position, phone_number, photo_url, institutional_email, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.fullName,
        input.staffNumber,
        input.role,
        input.position ?? null,
        input.phoneNumber ?? null,
        input.photoUrl ?? null,
        input.institutionalEmail,
        passwordHash,
      ],
    );
    return getAdmin(result.insertId);
  } catch (err) {
    if ((err as MysqlError).code === "ER_DUP_ENTRY") {
      throw new AppError("Staff number or institutional email is already in use.", 409);
    }
    throw err;
  }
}

const FIELD_MAP: Record<string, string> = {
  fullName: "full_name",
  role: "role",
  position: "position",
  phoneNumber: "phone_number",
  photoUrl: "photo_url",
  isActive: "is_active",
};

export async function updateAdmin(id: number, input: UpdateInput) {
  const updates: string[] = [];
  const params: any[] = [];
  for (const [key, column] of Object.entries(FIELD_MAP)) {
    const value = (input as Record<string, unknown>)[key];
    if (value !== undefined) {
      updates.push(`${column} = ?`);
      params.push(typeof value === "boolean" ? (value ? 1 : 0) : value);
    }
  }
  if (updates.length === 0) return getAdmin(id);

  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(`UPDATE admins SET ${updates.join(", ")} WHERE id = ?`, [
    ...params,
    id,
  ]);
  if (result.affectedRows === 0) throw new AppError("Admin not found.", 404);
  return getAdmin(id);
}

// Never a hard delete — repair_requests.assigned_admin_id history must
// survive a staff member leaving.
export async function deactivateAdmin(id: number) {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    "UPDATE admins SET is_active = 0 WHERE id = ?",
    [id],
  );
  if (result.affectedRows === 0) throw new AppError("Admin not found.", 404);
}
