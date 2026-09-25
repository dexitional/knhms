import { getPool } from "@knh/db";
import type { RowDataPacket } from "mysql2";

export async function getStudentsReport() {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.id, s.full_name, s.registration_number, s.level, s.gender,
            r.room_number, s.created_at AS registered_at
     FROM students s JOIN rooms r ON r.id = s.room_id
     ORDER BY s.created_at DESC`,
  );
  return rows;
}

export async function getRepairsReport() {
  const pool = getPool();
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
     ORDER BY rr.created_at DESC`,
  );
  return { statusCounts, items: rows };
}

export async function getOverview() {
  const pool = getPool();

  const [[studentTotals]] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM students",
  );
  const [[roomTotals]] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total, COALESCE(SUM(capacity), 0) AS capacity FROM rooms WHERE is_active = 1",
  );
  const [[occupancy]] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS occupied FROM students",
  );
  const [repairStatusCounts] = await pool.query<RowDataPacket[]>(
    "SELECT status, COUNT(*) AS count FROM repair_requests GROUP BY status",
  );
  const [[pendingOrders]] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS count FROM orders WHERE status = 'pending'",
  );
  const [[newSuggestions]] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS count FROM suggestions WHERE status = 'new'",
  );

  const totalCapacity = Number(roomTotals?.capacity ?? 0);
  const occupied = Number(occupancy?.occupied ?? 0);

  return {
    totalStudents: Number(studentTotals?.total ?? 0),
    totalRooms: Number(roomTotals?.total ?? 0),
    totalCapacity,
    occupied,
    occupancyRate: totalCapacity > 0 ? Math.round((occupied / totalCapacity) * 1000) / 10 : 0,
    repairStatusCounts,
    pendingOrders: Number(pendingOrders?.count ?? 0),
    newSuggestions: Number(newSuggestions?.count ?? 0),
  };
}
