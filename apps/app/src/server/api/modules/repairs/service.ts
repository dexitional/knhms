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
import { sendSms, toE164 } from "../../lib/sms.js";

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
  const pool = getPool();

  // Get current request to check if technician is being assigned
  const [currentRows] = await pool.execute<RowDataPacket[]>(
    `SELECT assigned_admin_id, status FROM repair_requests WHERE id = ?`,
    [id],
  );
  const current = currentRows[0];
  if (!current) throw new AppError("Repair request not found.", 404);

  const wasAssigned = !!current.assigned_admin_id;
  const isBeingAssigned = input.assignedAdminId !== undefined && input.assignedAdminId !== null;

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

  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE repair_requests SET ${updates.join(", ")} WHERE id = ?`,
    [...params, id],
  );
  if (result.affectedRows === 0) throw new AppError("Repair request not found.", 404);

  const updated = await getRepairRequest(id);

  // Send SMS notifications if technician was newly assigned
  if (!wasAssigned && isBeingAssigned && input.assignedAdminId) {
    try {
      // Get technician details
      const [adminRows] = await pool.execute<RowDataPacket[]>(
        `SELECT full_name, phone_number FROM admins WHERE id = ? AND is_active = 1`,
        [input.assignedAdminId],
      );
      const technician = adminRows[0];

      // Get student details
      const [studentRows] = await pool.execute<RowDataPacket[]>(
        `SELECT full_name, phone_country_code, phone_number FROM students WHERE id = ?`,
        [updated.student_id],
      );
      const student = studentRows[0];

      // Send SMS to technician
      if (technician?.phone_number) {
        const techPhone = toE164("+233", technician.phone_number);
        const message = `KNH Repair: You have been assigned to fix a repair request in Room ${updated.room_number}. Category: ${updated.category ?? "General"}. Description: ${updated.description.slice(0, 100)}. Please attend to this promptly.`;
        await sendSms(techPhone, message);
      }

      // Send SMS to student
      if (student?.phone_number && student?.phone_country_code) {
        const studentPhone = toE164(student.phone_country_code, student.phone_number);
        const message = `KNH Repair: Your repair request for Room ${updated.room_number} has been assigned to technician ${technician?.full_name ?? "a technician"}. Please be available in your room for assistance.`;
        await sendSms(studentPhone, message);
      }
    } catch (smsError) {
      console.error("Failed to send repair assignment SMS:", smsError);
      // Don't throw - SMS failure shouldn't block the assignment
    }
  }

  return updated;
}
