import { getPool } from "@knh/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import type { createSuggestionSchema, listSuggestionsQuerySchema } from "./schema.js";

type CreateInput = z.infer<typeof createSuggestionSchema>;
type ListQuery = z.infer<typeof listSuggestionsQuerySchema>;

export async function createSuggestion(studentId: number, input: CreateInput) {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO suggestions (student_id, subject, message, is_anonymous)
     VALUES (?, ?, ?, ?)`,
    [studentId, input.subject ?? null, input.message, input.isAnonymous ? 1 : 0],
  );
  return getMySuggestion(studentId, result.insertId);
}

export async function listMySuggestions(studentId: number) {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM suggestions WHERE student_id = ? ORDER BY created_at DESC",
    [studentId],
  );
  return rows;
}

async function getMySuggestion(studentId: number, id: number) {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM suggestions WHERE id = ? AND student_id = ?",
    [id, studentId],
  );
  return rows[0];
}

// Admin view: identity fields are stripped out of the response object
// entirely (not just hidden client-side) whenever is_anonymous is set, so a
// network inspector on the admin dashboard can't recover the submitter.
export async function listSuggestions(query: ListQuery) {
  const pool = getPool();
  const conditions: string[] = [];
  const params: any[] = [];
  if (query.status) {
    conditions.push("sg.status = ?");
    params.push(query.status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (query.page - 1) * query.pageSize;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT sg.id, sg.subject, sg.message, sg.is_anonymous, sg.status, sg.created_at,
            sg.student_id, s.full_name AS student_name, s.registration_number
     FROM suggestions sg JOIN students s ON s.id = sg.student_id
     ${where} ORDER BY sg.created_at DESC LIMIT ? OFFSET ?`,
    [...params, query.pageSize, offset],
  );
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM suggestions sg ${where}`,
    params,
  );

  const items = rows.map((row) => {
    if (!row.is_anonymous) return row;
    const { student_id: _studentId, student_name: _studentName, registration_number: _regNo, ...rest } = row;
    return rest;
  });

  return { items, total: Number(countRows[0]?.total ?? 0), page: query.page, pageSize: query.pageSize };
}

export async function markReviewed(id: number) {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    "UPDATE suggestions SET status = 'reviewed' WHERE id = ?",
    [id],
  );
  if (result.affectedRows === 0) throw new AppError("Suggestion not found.", 404);
}
