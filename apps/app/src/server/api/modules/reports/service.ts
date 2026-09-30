import { getPool } from "@knh/db";
import type { AdminOverview, OverviewPeriod } from "#/lib/overview";
import { trendBuckets, within } from "../../lib/periods.js";
import type { RowDataPacket } from "mysql2";
import type { z } from "zod";
import type { listStudentsReportQuerySchema, listRepairsReportQuerySchema } from "./schema.js";

type ListStudentsReportQuery = z.infer<typeof listStudentsReportQuerySchema>;
type ListRepairsReportQuery = z.infer<typeof listRepairsReportQuerySchema>;

export async function getStudentsReport(query: ListStudentsReportQuery) {
  const pool = getPool();
  const offset = (query.page - 1) * query.pageSize;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.id, s.full_name, s.registration_number, s.level, s.gender,
            r.room_number, s.created_at AS registered_at
     FROM students s JOIN rooms r ON r.id = s.room_id
     ORDER BY s.created_at DESC
     LIMIT ? OFFSET ?`,
    [query.pageSize, offset],
  );

  const [countRows] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM students",
  );

  return { students: rows, total: Number(countRows[0]?.total ?? 0), page: query.page, pageSize: query.pageSize };
}

export async function getRepairsReport(query: ListRepairsReportQuery) {
  const pool = getPool();
  const offset = (query.page - 1) * query.pageSize;

  const conditions: string[] = [];
  const params: any[] = [];

  if (query.status) {
    conditions.push("rr.status = ?");
    params.push(query.status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [statusCounts] = await pool.query<RowDataPacket[]>(
    `SELECT status, COUNT(*) AS count FROM repair_requests GROUP BY status`,
  );

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

  return {
    statusCounts,
    items: rows,
    total: Number(countRows[0]?.total ?? 0),
    page: query.page,
    pageSize: query.pageSize,
  };
}

// The admin Overview: occupancy and queues right now, activity in the
// chosen period, and a trend over recent periods (lib/periods.ts).
export async function getOverview(period: OverviewPeriod = "month"): Promise<AdminOverview> {
  const pool = getPool();
  const { current, trendFrom, buckets } = trendBuckets(period);

  const [
    [[studentTotals]],
    [[roomTotals]],
    [repairStatusCounts],
    [[pendingOrders]],
    [[newSuggestions]],
    [blocks],
    [[fullRooms]],
    [events],
  ] = await Promise.all([
    pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM students"),
    pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS total, COALESCE(SUM(capacity), 0) AS capacity FROM rooms WHERE is_active = 1",
    ),
    pool.query<RowDataPacket[]>("SELECT status, COUNT(*) AS count FROM repair_requests GROUP BY status"),
    pool.query<RowDataPacket[]>("SELECT COUNT(*) AS count FROM orders WHERE status = 'pending'"),
    pool.query<RowDataPacket[]>("SELECT COUNT(*) AS count FROM suggestions WHERE status = 'new'"),
    pool.query<RowDataPacket[]>(
      `SELECT COALESCE(NULLIF(TRIM(r.block), ''), 'No block') AS block, SUM(r.capacity) AS capacity,
              SUM((SELECT COUNT(*) FROM students s WHERE s.room_id = r.id)) AS occupied
       FROM rooms r WHERE r.is_active = 1 GROUP BY block ORDER BY block`,
    ),
    pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM rooms r
       WHERE r.is_active = 1 AND (SELECT COUNT(*) FROM students s WHERE s.room_id = r.id) >= r.capacity`,
    ),
    // Every dated event in the trend window, bucketed below.
    pool.query<RowDataPacket[]>(
      `SELECT 'registrations' AS kind, created_at FROM students WHERE created_at >= ?
       UNION ALL SELECT 'repairs', created_at FROM repair_requests WHERE created_at >= ?
       UNION ALL SELECT 'orders', created_at FROM orders WHERE created_at >= ?
       UNION ALL SELECT 'suggestions', created_at FROM suggestions WHERE created_at >= ?`,
      [trendFrom, trendFrom, trendFrom, trendFrom],
    ),
  ]);

  type Kind = "registrations" | "repairs" | "orders" | "suggestions";
  const count = (kind: Kind, from: string, to: string) =>
    events.filter((e) => e.kind === kind && within(e.created_at as string, from, to)).length;

  const totalCapacity = Number(roomTotals?.capacity ?? 0);
  const occupied = Number(studentTotals?.total ?? 0);
  const repairs = repairStatusCounts.map((r) => ({ status: r.status as string, count: Number(r.count) }));

  return {
    period,
    range: { from: current.from.slice(0, 10), to: current.to.slice(0, 10), label: current.label },
    totalStudents: occupied,
    totalRooms: Number(roomTotals?.total ?? 0),
    totalCapacity,
    occupied,
    occupancyRate: totalCapacity > 0 ? Math.round((occupied / totalCapacity) * 1000) / 10 : 0,
    bedsFree: Math.max(0, totalCapacity - occupied),
    fullRooms: Number(fullRooms?.count ?? 0),
    pendingRepairs: repairs.find((r) => r.status === "pending")?.count ?? 0,
    pendingOrders: Number(pendingOrders?.count ?? 0),
    newSuggestions: Number(newSuggestions?.count ?? 0),
    repairStatusCounts: repairs,
    blocks: blocks.map((b) => ({ block: b.block as string, capacity: Number(b.capacity), occupied: Number(b.occupied) })),
    inPeriod: {
      registrations: count("registrations", current.from, current.to),
      repairs: count("repairs", current.from, current.to),
      orders: count("orders", current.from, current.to),
      suggestions: count("suggestions", current.from, current.to),
    },
    trend: buckets.map((b) => ({
      label: b.label,
      registrations: count("registrations", b.from, b.to),
      repairs: count("repairs", b.from, b.to),
      orders: count("orders", b.from, b.to),
      suggestions: count("suggestions", b.from, b.to),
    })),
  };
}
