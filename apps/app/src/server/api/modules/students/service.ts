import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { getPool } from "@knh/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import { maskPhone, sendSms, toE164 } from "../../lib/sms.js";
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
  registrationNumber: "registration_number",
  email: "email",
  idType: "id_type",
  idNumber: "id_number",
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
      const field = (err as MysqlError).message.includes("registration_number") ? "registration number" : "email";
      throw new AppError(`Another student already uses that ${field}.`, 409);
    }
    throw err;
  }
  return getStudent(id);
}

// Moving a student (or changing their gender) must leave them in an active
// room with space that accepts their gender. The room row is locked so two
// moves can't both take the last bed.
export async function updateStudent(id: number, input: UpdateStudentInput) {
  const current = await getStudent(id);
  const roomId = input.roomId ?? (current.room_id as number);
  const gender = input.gender ?? (current.gender as string);
  const movingRoom = input.roomId !== undefined && input.roomId !== current.room_id;

  if (!movingRoom && input.gender === undefined) return applyUpdate(id, input);

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [rooms] = await connection.execute<RowDataPacket[]>(
      "SELECT id, room_number, capacity, gender_type, is_active FROM rooms WHERE id = ? FOR UPDATE",
      [roomId],
    );
    const room = rooms[0];
    if (!room) throw new AppError("That room doesn't exist.", 422);
    if (movingRoom && !room.is_active) throw new AppError(`Room ${room.room_number} is not active.`, 422);
    if (room.gender_type !== "mixed" && room.gender_type !== gender) {
      throw new AppError(`Room ${room.room_number} is for ${room.gender_type} students only.`, 422);
    }
    if (movingRoom) {
      const [counts] = await connection.execute<RowDataPacket[]>(
        "SELECT COUNT(*) AS n FROM students WHERE room_id = ? AND id <> ?",
        [roomId, id],
      );
      if (Number(counts[0]?.n ?? 0) >= room.capacity) {
        throw new AppError(`Room ${room.room_number} is full.`, 409);
      }
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
  return applyUpdate(id, input);
}

// Rooms an admin can move a student into, with current occupancy.
export async function listRoomOptions() {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT r.id, r.room_number, r.capacity, r.gender_type, COUNT(s.id) AS occupied
     FROM rooms r LEFT JOIN students s ON s.room_id = r.id
     WHERE r.is_active = 1 GROUP BY r.id ORDER BY r.room_number`,
  );
  return rows.map((r) => ({
    id: r.id as number,
    room_number: r.room_number as string,
    capacity: r.capacity as number,
    gender_type: r.gender_type as string,
    occupied: Number(r.occupied),
  }));
}

// Sets a new random 4-digit PIN, unlocks the account, and texts the PIN to
// the student. If the SMS fails, nothing changes — the student would have
// no way to learn the new PIN.
export async function resetStudentPin(id: number) {
  const student = await getStudent(id);
  const phone = toE164(student.phone_country_code as string, student.phone_number as string);
  const pin = String(randomInt(0, 10_000)).padStart(4, "0");
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      "UPDATE students SET pin_hash = ?, failed_pin_attempts = 0, locked_until = NULL WHERE id = ?",
      [await bcrypt.hash(pin, 12), id],
    );
    await sendSms(
      phone,
      `KNH: Your hall portal PIN has been reset by the hall office. New PIN: ${pin}. Log in with your registration number and change it.`,
    );
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    if (err instanceof AppError) throw err;
    console.error("Student PIN reset failed:", err);
    throw new AppError("Couldn't send the new PIN by SMS, so the PIN was not changed. Check the phone number.", 422);
  } finally {
    connection.release();
  }
  return { phone: maskPhone(phone) };
}

export async function updateOwnProfile(id: number, input: UpdateOwnProfileInput) {
  return applyUpdate(id, input);
}

export async function deleteStudent(id: number) {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>("DELETE FROM students WHERE id = ?", [id]);
  if (result.affectedRows === 0) throw new AppError("Student not found.", 404);
}
