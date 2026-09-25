import { getPool } from "@knh/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import type {
  createRepairRequestSchema,
  listRepairsQuerySchema,
  updateRepairAdminSchema,
  updateStudentRemarksSchema,
} from "./schema.js";

type CreateInput = z.infer<typeof createRepairRequestSchema>;
type ListQuery = z.infer<typeof listRepairsQuerySchema>;
type UpdateAdminInput = z.infer<typeof updateRepairAdminSchema>;
type UpdateRemarksInput = z.infer<typeof updateStudentRemarksSchema>;

export async function createRepairRequest(studentId: number, roomId: number, input: CreateInput) {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO repair_requests (student_id, room_id, category, description)
     VALUES (?, ?, ?, ?)`,
    [studentId, roomId, input.category ?? null, input.description],
  );
  return getRepairRequest(result.insertId);
}

export async function listMyRepairRequests(studentId: number) {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT rr.*, r.room_number FROM repair_requests rr
     JOIN rooms r ON r.id = rr.room_id
     WHERE rr.student_id = ? ORDER BY rr.created_at DESC`,
    [studentId],
  );
  return rows;
}

export async function updateStudentRemarks(id: number, studentId: number, input: UpdateRemarksInput) {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE repair_requests SET student_remarks = ?
     WHERE id = ? AND student_id = ? AND status = 'pending'`,
    [input.studentRemarks, id, studentId],
  );
  if (result.affectedRows === 0) {
    throw new AppError("Request not found, not yours, or no longer pending.", 404);
  }
  return getRepairRequest(id);
}

export async function listRepairRequests(query: ListQuery) {
  const pool = getPool();
  const conditions: string[] = [];
  const params: any[] = [];
  if (query.status) {
    conditions.push("rr.status = ?");
    params.push(query.status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (query.page - 1) * query.pageSize;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT rr.*, r.room_number, s.full_name AS student_name, s.registration_number,
            a.full_name AS assigned_admin_name
     FROM repair_requests rr
     JOIN rooms r ON r.id = rr.room_id
     JOIN students s ON s.id = rr.student_id
     LEFT JOIN admins a ON a.id = rr.assigned_admin_id
     ${where} ORDER BY rr.created_at DESC LIMIT ? OFFSET ?`,
    [...params, query.pageSize, offset],
  );
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM repair_requests rr ${where}`,
    params,
  );
  return { items: rows, total: Number(countRows[0]?.total ?? 0), page: query.page, pageSize: query.pageSize };
}

export async function getRepairRequest(id: number) {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT rr.*, r.room_number, s.full_name AS student_name, s.registration_number,
            a.full_name AS assigned_admin_name
     FROM repair_requests rr
     JOIN rooms r ON r.id = rr.room_id
     JOIN students s ON s.id = rr.student_id
     LEFT JOIN admins a ON a.id = rr.assigned_admin_id
     WHERE rr.id = ?`,
    [id],
  );
  const row = rows[0];
  if (!row) throw new AppError("Repair request not found.", 404);
  return row;
}

export async function updateRepairRequest(id: number, input: UpdateAdminInput) {
  const updates: string[] = [];
  const params: any[] = [];
  if (input.status !== undefined) {
    updates.push("status = ?");
    params.push(input.status);
  }
  if (input.assignedAdminId !== undefined) {
    updates.push("assigned_admin_id = ?");
    params.push(input.assignedAdminId);
  }
  if (input.adminRemarks !== undefined) {
    updates.push("admin_remarks = ?");
    params.push(input.adminRemarks);
  }
  if (updates.length === 0) return getRepairRequest(id);

  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE repair_requests SET ${updates.join(", ")} WHERE id = ?`,
    [...params, id],
  );
  if (result.affectedRows === 0) throw new AppError("Repair request not found.", 404);
  return getRepairRequest(id);
}
