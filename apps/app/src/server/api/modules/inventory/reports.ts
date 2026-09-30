import { getPool } from "@knh/db";
import type { InventoryItemRow } from "@knh/db";
import type { RowDataPacket } from "mysql2";
import * as XLSX from "xlsx";
import { AppError } from "../../middleware/error-handler.js";
import { LEVEL_LABELS, MOVEMENT_LABELS, STATUS_LABELS, requestReference, stockLevel } from "#/lib/inventory";
import type { InventoryReport, ReportBucket, ReportPeriod, RequestStatus } from "#/lib/inventory";

// Inventory reports: request activity for the current week/month/quarter/
// year with a trend over recent periods (see lib/periods.ts), and an Excel
// export of stock.

import { TREND_LENGTH, periodRange, shift, bucketLabel, within, ymd } from "../../lib/periods.js";

export { periodRange };

// With a category, requests count when they include at least one of its
// items, and stock/units figures cover only its items.
function categoryFilters(categoryId?: number) {
  if (!categoryId) return { request: "", item: "", params: [] as number[] };
  return {
    request: `AND EXISTS (SELECT 1 FROM inventory_request_items ri JOIN inventory_items ci ON ci.id = ri.item_id
                         WHERE ri.request_id = r.id AND ci.category_id = ?)`,
    item: "AND i.category_id = ?",
    params: [categoryId],
  };
}

async function findCategory(categoryId?: number) {
  if (!categoryId) return null;
  const [rows] = await getPool().execute<RowDataPacket[]>("SELECT id, name FROM inventory_categories WHERE id = ?", [
    categoryId,
  ]);
  return rows[0] ? { id: rows[0].id as number, name: rows[0].name as string } : null;
}

export async function getReport(period: ReportPeriod, categoryId?: number): Promise<InventoryReport> {
  const pool = getPool();
  const current = periodRange(period);
  const trendStart = shift(period, current.start, -(TREND_LENGTH[period] - 1));
  const trendFrom = `${ymd(trendStart)} 00:00:00`;
  const category = await findCategory(categoryId);
  if (categoryId && !category) throw new AppError("Category not found.", 404);
  const f = categoryFilters(categoryId);

  const [[requests], [top], [items]] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `SELECT r.id, r.status, r.created_at, r.approved_at, r.rejected_at, r.released_at FROM inventory_requests r
       WHERE (r.created_at >= ? OR r.approved_at >= ? OR r.released_at >= ? OR r.rejected_at >= ?) ${f.request}`,
      [trendFrom, trendFrom, trendFrom, trendFrom, ...f.params],
    ),
    pool.query<RowDataPacket[]>(
      `SELECT i.name, SUM(-m.quantity_change) AS units FROM inventory_movements m
       JOIN inventory_items i ON i.id = m.item_id
       WHERE m.reason = 'release' AND m.created_at >= ? AND m.created_at < ? ${f.item}
       GROUP BY i.id, i.name ORDER BY units DESC LIMIT 8`,
      [current.from, current.to, ...f.params],
    ),
    pool.query<(InventoryItemRow & RowDataPacket)[]>(
      `SELECT i.quantity, i.min_quantity FROM inventory_items i WHERE i.is_active = 1 ${f.item}`,
      f.params,
    ),
  ]);

  const trend: Array<ReportBucket> = [];
  for (let i = 0; i < TREND_LENGTH[period]; i++) {
    const start = shift(period, trendStart, i);
    const from = `${ymd(start)} 00:00:00`;
    const to = `${ymd(shift(period, start, 1))} 00:00:00`;
    trend.push({
      label: bucketLabel(period, start),
      requested: requests.filter((r) => within(r.created_at, from, to)).length,
      approved: requests.filter((r) => within(r.approved_at, from, to)).length,
      released: requests.filter((r) => within(r.released_at, from, to)).length,
    });
  }

  const raised = requests.filter((r) => within(r.created_at, current.from, current.to));
  const statusMix = (["pending", "approved", "released", "rejected", "cancelled"] as const)
    .map((status: RequestStatus) => ({ status, count: raised.filter((r) => r.status === status).length }))
    .filter((s) => s.count > 0);
  const levels = items.map((i) => stockLevel(i.quantity, i.min_quantity));

  return {
    period,
    category,
    range: { from: current.from.slice(0, 10), to: current.to.slice(0, 10), label: current.label },
    totals: {
      requested: raised.length,
      pending: raised.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => within(r.approved_at, current.from, current.to)).length,
      rejected: requests.filter((r) => within(r.rejected_at, current.from, current.to)).length,
      released: requests.filter((r) => within(r.released_at, current.from, current.to)).length,
      unitsReleased: top.reduce((sum, t) => sum + Number(t.units), 0),
    },
    statusMix,
    trend,
    topItems: top.map((t) => ({ name: t.name as string, units: Number(t.units) })),
    stock: {
      total: items.length,
      ok: levels.filter((l) => l === "ok").length,
      low: levels.filter((l) => l === "low").length,
      out: levels.filter((l) => l === "out").length,
    },
  };
}

// ---- Excel export -------------------------------------------------------------

function sheet(rows: Array<Record<string, string | number>>, widths: number[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = widths.map((wch) => ({ wch }));
  return ws;
}

// Workbook for the chosen period: a summary, stock levels with the period's
// movement totals, the requests raised, and every stock movement.
export async function exportWorkbook(
  period: ReportPeriod,
  categoryId?: number,
): Promise<{ buffer: Buffer; filename: string }> {
  const pool = getPool();
  const range = periodRange(period);
  const report = await getReport(period, categoryId);
  const f = categoryFilters(report.category?.id);

  const [[items], [movements], [requests], [lines]] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `SELECT i.*, c.name AS category_name,
         COALESCE(SUM(CASE WHEN m.reason = 'release' THEN -m.quantity_change END), 0) AS released,
         COALESCE(SUM(CASE WHEN m.reason IN ('restock', 'opening') THEN m.quantity_change END), 0) AS restocked,
         COALESCE(SUM(CASE WHEN m.reason = 'adjustment' THEN m.quantity_change END), 0) AS adjusted
       FROM inventory_items i
       LEFT JOIN inventory_categories c ON c.id = i.category_id
       LEFT JOIN inventory_movements m ON m.item_id = i.id AND m.created_at >= ? AND m.created_at < ?
       WHERE 1 = 1 ${f.item}
       GROUP BY i.id ORDER BY c.name IS NULL, c.name, i.name`,
      [range.from, range.to, ...f.params],
    ),
    pool.query<RowDataPacket[]>(
      `SELECT m.*, i.name AS item_name, a.full_name AS admin_name FROM inventory_movements m
       JOIN inventory_items i ON i.id = m.item_id LEFT JOIN admins a ON a.id = m.admin_id
       WHERE m.created_at >= ? AND m.created_at < ? ${f.item} ORDER BY m.created_at, m.id`,
      [range.from, range.to, ...f.params],
    ),
    pool.query<RowDataPacket[]>(
      `SELECT r.*, rq.full_name AS requested_by_name, ap.full_name AS approved_by_name,
              rj.full_name AS rejected_by_name, rl.full_name AS released_by_name
       FROM inventory_requests r
       LEFT JOIN admins rq ON rq.id = r.requested_by LEFT JOIN admins ap ON ap.id = r.approved_by
       LEFT JOIN admins rj ON rj.id = r.rejected_by LEFT JOIN admins rl ON rl.id = r.released_by
       WHERE r.created_at >= ? AND r.created_at < ? ${f.request} ORDER BY r.created_at`,
      [range.from, range.to, ...f.params],
    ),
    pool.query<RowDataPacket[]>(
      `SELECT ri.request_id, i.name, ri.quantity FROM inventory_request_items ri
       JOIN inventory_items i ON i.id = ri.item_id ORDER BY ri.id`,
    ),
  ]);

  const wb = XLSX.utils.book_new();
  const t = report.totals;
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      [
        { Measure: "Report period", Value: `${range.label} (${report.range.from} to ${report.range.to}, exclusive)` },
        { Measure: "Category", Value: report.category?.name ?? "All categories" },
        { Measure: "Generated", Value: new Date().toISOString().replace("T", " ").slice(0, 16) },
        { Measure: "Requests raised", Value: t.requested },
        { Measure: "Still pending", Value: t.pending },
        { Measure: "Approved in period", Value: t.approved },
        { Measure: "Released in period", Value: t.released },
        { Measure: "Rejected in period", Value: t.rejected },
        { Measure: "Units released", Value: t.unitsReleased },
        { Measure: "Active items", Value: report.stock.total },
        { Measure: "Items low on stock", Value: report.stock.low },
        { Measure: "Items out of stock", Value: report.stock.out },
      ],
      [24, 60],
    ),
    "Summary",
  );
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      items.map((i) => ({
        Item: i.name,
        Category: i.category_name ?? "",
        Description: i.description ?? "",
        "In stock": i.quantity,
        "Minimum level": i.min_quantity,
        Status: i.is_active ? LEVEL_LABELS[stockLevel(i.quantity, i.min_quantity)] : "Inactive",
        "Restocked in period": Number(i.restocked),
        "Released in period": Number(i.released),
        "Adjusted in period": Number(i.adjusted),
        "Last updated": i.updated_at,
      })),
      [28, 20, 36, 10, 14, 14, 18, 18, 18, 20],
    ),
    "Stock",
  );
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      requests.map((r) => ({
        Reference: requestReference(r.id),
        "Raised on": r.created_at,
        "Requested by": r.requested_by_name ?? "",
        Purpose: r.purpose,
        Items: lines
          .filter((l) => l.request_id === r.id)
          .map((l) => `${l.name} x ${l.quantity}`)
          .join("; "),
        Status: STATUS_LABELS[r.status as RequestStatus],
        "Approved by": r.approved_by_name ?? "",
        "Approved at": r.approved_at ?? "",
        "Released by": r.released_by_name ?? "",
        "Released at": r.released_at ?? "",
        "Rejected by": r.rejected_by_name ?? "",
        "Rejected at": r.rejected_at ?? "",
        Note: r.decision_note ?? "",
      })),
      [12, 20, 22, 36, 40, 12, 22, 20, 22, 20, 22, 20, 30],
    ),
    "Requests",
  );
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      movements.map((m) => ({
        Date: m.created_at,
        Item: m.item_name,
        Change: m.quantity_change,
        Balance: m.quantity_after,
        Type: MOVEMENT_LABELS[m.reason as keyof typeof MOVEMENT_LABELS],
        Request: m.request_id ? requestReference(m.request_id) : "",
        By: m.admin_name ?? "",
        Note: m.note ?? "",
      })),
      [20, 28, 10, 10, 16, 12, 22, 30],
    ),
    "Movements",
  );

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const slug = report.category ? `-${report.category.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}` : "";
  return { buffer, filename: `knh-inventory-${period}${slug}-${report.range.from}.xlsx` };
}
