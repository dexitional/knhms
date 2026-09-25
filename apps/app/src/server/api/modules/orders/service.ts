import { getPool } from "@knh/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import type { createOrderSchema, listOrdersQuerySchema, updateOrderAdminSchema } from "./schema.js";

type CreateInput = z.infer<typeof createOrderSchema>;
type ListQuery = z.infer<typeof listOrdersQuerySchema>;
type UpdateAdminInput = z.infer<typeof updateOrderAdminSchema>;

export async function createOrder(studentId: number, input: CreateInput) {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO orders (student_id, service_type, details, quantity)
     VALUES (?, ?, ?, ?)`,
    [studentId, input.serviceType, input.details ?? null, input.quantity],
  );
  return getOrder(result.insertId);
}

export async function listMyOrders(studentId: number) {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM orders WHERE student_id = ? ORDER BY created_at DESC",
    [studentId],
  );
  return rows;
}

export async function listOrders(query: ListQuery) {
  const pool = getPool();
  const conditions: string[] = [];
  const params: any[] = [];
  if (query.status) {
    conditions.push("o.status = ?");
    params.push(query.status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (query.page - 1) * query.pageSize;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT o.*, s.full_name AS student_name, s.registration_number
     FROM orders o JOIN students s ON s.id = o.student_id
     ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [...params, query.pageSize, offset],
  );
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM orders o ${where}`,
    params,
  );
  return { items: rows, total: Number(countRows[0]?.total ?? 0), page: query.page, pageSize: query.pageSize };
}

export async function getOrder(id: number) {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT o.*, s.full_name AS student_name, s.registration_number
     FROM orders o JOIN students s ON s.id = o.student_id WHERE o.id = ?`,
    [id],
  );
  const row = rows[0];
  if (!row) throw new AppError("Order not found.", 404);
  return row;
}

export async function updateOrder(id: number, input: UpdateAdminInput) {
  const updates: string[] = [];
  const params: any[] = [];
  if (input.status !== undefined) {
    updates.push("status = ?");
    params.push(input.status);
  }
  if (input.adminRemarks !== undefined) {
    updates.push("admin_remarks = ?");
    params.push(input.adminRemarks);
  }
  if (updates.length === 0) return getOrder(id);

  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(`UPDATE orders SET ${updates.join(", ")} WHERE id = ?`, [
    ...params,
    id,
  ]);
  if (result.affectedRows === 0) throw new AppError("Order not found.", 404);
  return getOrder(id);
}
