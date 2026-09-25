import { getPool } from "@knh/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import type { listStudentsQuerySchema, updateOwnProfileSchema, updateStudentSchema } from "./schema.js";

// Never selects pin_hash — it has no reason to leave the DB once written.
const SELECT_COLUMNS = `
  s.id, s.room_id, r.room_number, s.gender, s.full_name, s.registration_number,
  s.programme, s.level, s.phone_country_code, s.phone_number, s.passport_photo_url,
  s.emergency_contact_name, s.email, s.emergency_contact_number, s.id_type,
  s.id_number, s.receipt_url, s.locked_until, s.created_at, s.updated_at
`;

type ListQuery = z.infer<typeof listStudentsQuerySchema>;
type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>;

interface MysqlError extends Error {
  code?: string;
}

export async function listStudents(query: ListQuery) {
  const pool = getPool();
  const conditions: string[] = [];
  const params: any[] = [];

  if (query.search) {
    conditions.push("(s.full_name LIKE ? OR s.registration_number LIKE ? OR s.email LIKE ?)");
    params.push(`%${query.search}%`, `%${query.search}%`, `%${query.search}%`);
  }
  if (query.roomId) {
    conditions.push("s.room_id = ?");
    params.push(query.roomId);
  }
  if (query.level) {
    conditions.push("s.level = ?");
    params.push(query.level);
  }
  if (query.gender) {
    conditions.push("s.gender = ?");
    params.push(query.gender);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (query.page - 1) * query.pageSize;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${SELECT_COLUMNS} FROM students s JOIN rooms r ON r.id = s.room_id
     ${where} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
    [...params, query.pageSize, offset],
  );
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM students s ${where}`,
    params,
  );

  return { items: rows, total: Number(countRows[0]?.total ?? 0), page: query.page, pageSize: query.pageSize };
}

export async function getStudent(id: number) {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ${SELECT_COLUMNS} FROM students s JOIN rooms r ON r.id = s.room_id WHERE s.id = ?`,
    [id],
  );
  const student = rows[0];
  if (!student) throw new AppError("Student not found.", 404);
  return student;
}

const FIELD_MAP: Record<string, string> = {
  roomId: "room_id",
  gender: "gender",
  fullName: "full_name",
  programme: "programme",
  level: "level",
  phoneCountryCode: "phone_country_code",
  phoneNumber: "phone_number",
  emergencyContactName: "emergency_contact_name",
  emergencyContactNumber: "emergency_contact_number",
  passportPhotoUrl: "passport_photo_url",
};

async function applyUpdate(id: number, input: Record<string, unknown>) {
  const updates: string[] = [];
  const params: any[] = [];
  for (const [key, column] of Object.entries(FIELD_MAP)) {
    const value = input[key];
    if (value !== undefined) {
      updates.push(`${column} = ?`);
      params.push(value);
    }
  }
  if (updates.length === 0) return getStudent(id);

  try {
    await getPool().execute(`UPDATE students SET ${updates.join(", ")} WHERE id = ?`, [...params, id]);
  } catch (err) {
    if ((err as MysqlError).code === "ER_DUP_ENTRY") {
      throw new AppError("Another student already uses that email.", 409);
    }
    throw err;
  }
  return getStudent(id);
}

export async function updateStudent(id: number, input: UpdateStudentInput) {
  return applyUpdate(id, input);
}

export async function updateOwnProfile(id: number, input: UpdateOwnProfileInput) {
  return applyUpdate(id, input);
}

export async function deleteStudent(id: number) {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>("DELETE FROM students WHERE id = ?", [id]);
  if (result.affectedRows === 0) throw new AppError("Student not found.", 404);
}
