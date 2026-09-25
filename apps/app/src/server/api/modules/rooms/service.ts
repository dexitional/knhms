import { getPool } from "@knh/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import * as XLSX from "xlsx";
import type { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import type { createRoomSchema, listRoomsQuerySchema, updateRoomSchema } from "./schema.js";

type CreateRoomInput = z.infer<typeof createRoomSchema>;
type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
type ListQuery = z.infer<typeof listRoomsQuerySchema>;

interface MysqlError extends Error {
  code?: string;
}

interface RoomMember {
  id: number;
  full_name: string;
  photo_url: string;
}

// GROUP_CONCAT packs each occupant's id/name/photo into one string per room
// (":: " within a member, "||" between members) rather than a second
// query per room — "::" and "||" are safe separators since neither can
// appear in a name or an uploaded photo URL. GROUP_CONCAT itself skips the
// CASE's NULL result for an empty room (LEFT JOIN with no match), so an
// unoccupied room's raw value is simply NULL.
function parseMembers(raw: unknown): RoomMember[] {
  if (typeof raw !== "string" || raw.length === 0) return [];
  return raw.split("||").map((entry) => {
    const [id, fullName, photoUrl] = entry.split("::");
    return { id: Number(id), full_name: fullName ?? "", photo_url: photoUrl ?? "" };
  });
}

export async function listRooms(query: ListQuery) {
  const pool = getPool();
  const conditions: string[] = [];
  const params: any[] = [];

  if (query.search) {
    conditions.push("r.room_number LIKE ?");
    params.push(`%${query.search}%`);
  }
  if (query.genderType) {
    conditions.push("r.gender_type = ?");
    params.push(query.genderType);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (query.page - 1) * query.pageSize;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT r.*, COUNT(s.id) AS occupied,
       GROUP_CONCAT(
         CASE WHEN s.id IS NOT NULL THEN CONCAT_WS('::', s.id, s.full_name, s.passport_photo_url) END
         ORDER BY s.id SEPARATOR '||'
       ) AS members
     FROM rooms r
     LEFT JOIN students s ON s.room_id = r.id
     ${where}
     GROUP BY r.id
     ORDER BY r.room_number ASC
     LIMIT ? OFFSET ?`,
    [...params, query.pageSize, offset],
  );

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM rooms r ${where}`,
    params,
  );

  const items = rows.map((row) => ({ ...row, members: parseMembers(row.members) }));

  return { items, total: Number(countRows[0]?.total ?? 0), page: query.page, pageSize: query.pageSize };
}

export async function getRoom(id: number) {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT r.*, COUNT(s.id) AS occupied
     FROM rooms r
     LEFT JOIN students s ON s.room_id = r.id
     WHERE r.id = ?
     GROUP BY r.id`,
    [id],
  );
  const room = rows[0];
  if (!room) throw new AppError("Room not found.", 404);
  return room;
}

export async function createRoom(input: CreateRoomInput) {
  const pool = getPool();
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO rooms (room_number, block, floor, capacity, gender_type)
       VALUES (?, ?, ?, ?, ?)`,
      [input.roomNumber, input.block ?? null, input.floor ?? null, input.capacity, input.genderType],
    );
    return getRoom(result.insertId);
  } catch (err) {
    if ((err as MysqlError).code === "ER_DUP_ENTRY") {
      throw new AppError(`Room ${input.roomNumber} already exists.`, 409);
    }
    throw err;
  }
}

export async function updateRoom(id: number, input: UpdateRoomInput) {
  const pool = getPool();
  const existing = await getRoom(id);

  if (input.capacity !== undefined && input.capacity < Number(existing.occupied)) {
    throw new AppError(
      `Capacity cannot be set below the current occupancy (${existing.occupied} students).`,
      409,
    );
  }

  const updates: string[] = [];
  const params: any[] = [];
  const fieldMap: Record<string, string> = {
    roomNumber: "room_number",
    block: "block",
    floor: "floor",
    capacity: "capacity",
    genderType: "gender_type",
    isActive: "is_active",
  };
  for (const [key, column] of Object.entries(fieldMap)) {
    const value = (input as Record<string, unknown>)[key];
    if (value !== undefined) {
      updates.push(`${column} = ?`);
      params.push(typeof value === "boolean" ? (value ? 1 : 0) : value);
    }
  }
  if (updates.length === 0) return existing;

  try {
    await pool.execute(`UPDATE rooms SET ${updates.join(", ")} WHERE id = ?`, [...params, id]);
  } catch (err) {
    if ((err as MysqlError).code === "ER_DUP_ENTRY") {
      throw new AppError("Another room already uses that room number.", 409);
    }
    throw err;
  }
  return getRoom(id);
}

export async function deleteRoom(id: number) {
  const pool = getPool();
  try {
    const [result] = await pool.execute<ResultSetHeader>("DELETE FROM rooms WHERE id = ?", [id]);
    if (result.affectedRows === 0) throw new AppError("Room not found.", 404);
  } catch (err) {
    if ((err as MysqlError).code === "ER_ROW_IS_REFERENCED_2") {
      throw new AppError("This room has students assigned to it and cannot be deleted.", 409);
    }
    throw err;
  }
}

interface BulkUploadRow {
  "Room Number"?: unknown;
  Block?: unknown;
  Floor?: unknown;
  Capacity?: unknown;
  "Gender Type"?: unknown;
}

interface SkippedRow {
  row: number;
  roomNumber: string | null;
  reason: string;
}

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_UPLOAD_ROWS = 2000;

export async function bulkUploadRooms(buffer: Buffer) {
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new AppError("File is too large (max 2MB).", 400);
  }

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new AppError("The spreadsheet has no worksheets.", 400);
  const sheet = workbook.Sheets[sheetName]!;
  const rows = XLSX.utils.sheet_to_json<BulkUploadRow>(sheet, { defval: null, raw: false });

  if (rows.length > MAX_UPLOAD_ROWS) {
    throw new AppError(`Too many rows (max ${MAX_UPLOAD_ROWS}).`, 400);
  }

  const pool = getPool();
  const skipped: SkippedRow[] = [];
  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // header is row 1
    const row = rows[i]!;
    const roomNumber = String(row["Room Number"] ?? "").trim();
    const genderTypeRaw = String(row["Gender Type"] ?? "mixed")
      .trim()
      .toLowerCase();
    const capacityRaw = row.Capacity != null ? Number(row.Capacity) : NaN;

    if (!roomNumber) {
      skipped.push({ row: rowNumber, roomNumber: null, reason: "Room Number is required." });
      continue;
    }
    if (!Number.isInteger(capacityRaw) || capacityRaw < 1 || capacityRaw > 10) {
      skipped.push({ row: rowNumber, roomNumber, reason: "Capacity must be a whole number between 1 and 10." });
      continue;
    }
    if (!["male", "female", "mixed"].includes(genderTypeRaw)) {
      skipped.push({
        row: rowNumber,
        roomNumber,
        reason: `Gender Type "${genderTypeRaw}" must be male, female, or mixed.`,
      });
      continue;
    }

    const block = row.Block != null ? String(row.Block).trim() || null : null;
    const floor = row.Floor != null ? String(row.Floor).trim() || null : null;

    const [existingRows] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM rooms WHERE room_number = ?",
      [roomNumber],
    );
    const existing = existingRows[0];

    if (existing) {
      const [countRows] = await pool.execute<RowDataPacket[]>(
        "SELECT COUNT(*) AS count FROM students WHERE room_id = ?",
        [existing.id],
      );
      const occupied = Number(countRows[0]?.count ?? 0);
      if (capacityRaw < occupied) {
        skipped.push({
          row: rowNumber,
          roomNumber,
          reason: `New capacity ${capacityRaw} is below current occupancy ${occupied} — skipped.`,
        });
        continue;
      }
    }

    await pool.execute(
      `INSERT INTO rooms (room_number, block, floor, capacity, gender_type)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         block = VALUES(block), floor = VALUES(floor),
         capacity = VALUES(capacity), gender_type = VALUES(gender_type)`,
      [roomNumber, block, floor, capacityRaw, genderTypeRaw],
    );

    if (existing) updated++;
    else inserted++;
  }

  return { inserted, updated, skipped };
}
