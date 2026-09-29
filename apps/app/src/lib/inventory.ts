// Client-safe shapes and labels for the Inventory feature, shared by the
// admin pages, the print form, and the API (server/api/modules/inventory).

export type RequestStatus = "pending" | "approved" | "rejected" | "released" | "cancelled";
export type StockLevel = "ok" | "low" | "out";
export type ReportPeriod = "week" | "month" | "quarter" | "year";

export interface InventoryCategory {
  id: number;
  name: string;
  description: string | null;
  item_count: number;
}

export interface InventoryItem {
  id: number;
  name: string;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  quantity: number;
  min_quantity: number;
  is_active: 0 | 1;
  level: StockLevel;
  updated_at: string;
}

export interface InventoryRequestLine {
  item_id: number;
  item_name: string;
  quantity: number;
  in_stock: number;
}

export interface InventoryRequest {
  id: number;
  reference: string;
  purpose: string;
  status: RequestStatus;
  decision_note: string | null;
  requested_by: number | null;
  requested_by_name: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejected_by_name: string | null;
  rejected_at: string | null;
  released_by_name: string | null;
  released_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  items: Array<InventoryRequestLine>;
}

export interface InventoryMovement {
  id: number;
  item_name: string;
  quantity_change: number;
  quantity_after: number;
  reason: "opening" | "restock" | "adjustment" | "release";
  note: string | null;
  request_reference: string | null;
  admin_name: string | null;
  created_at: string;
}

export interface ReportBucket {
  label: string;
  requested: number;
  approved: number;
  released: number;
}

export interface InventoryReport {
  period: ReportPeriod;
  category: { id: number; name: string } | null;
  range: { from: string; to: string; label: string };
  totals: { requested: number; pending: number; approved: number; rejected: number; released: number; unitsReleased: number };
  statusMix: Array<{ status: RequestStatus; count: number }>;
  trend: Array<ReportBucket>;
  topItems: Array<{ name: string; units: number }>;
  stock: { total: number; ok: number; low: number; out: number };
}

export const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  released: "Released",
  cancelled: "Cancelled",
};

export const STATUS_BADGE = {
  pending: "warning",
  approved: "info",
  rejected: "danger",
  released: "success",
  cancelled: "secondary",
} as const;

export const LEVEL_LABELS: Record<StockLevel, string> = { ok: "In stock", low: "Low stock", out: "Out of stock" };
export const LEVEL_BADGE = { ok: "success", low: "warning", out: "danger" } as const;

export const PERIOD_LABELS: Record<ReportPeriod, string> = {
  week: "This week",
  month: "This month",
  quarter: "This quarter",
  year: "This year",
};

export const MOVEMENT_LABELS: Record<InventoryMovement["reason"], string> = {
  opening: "Opening stock",
  restock: "Restock",
  adjustment: "Adjustment",
  release: "Released",
};

export const requestReference = (id: number) => `REQ-${String(id).padStart(5, "0")}`;

// Low means at or below the minimum (but not empty).
export function stockLevel(quantity: number, minQuantity: number): StockLevel {
  if (quantity <= 0) return "out";
  return quantity <= minQuantity ? "low" : "ok";
}

// "2026-09-29 14:05:00" → "29 Sep 2026, 14:05"
export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

// ---- Bulk upload ----------------------------------------------------------------

// "restock" adds each row's quantity to existing items; "set" replaces the
// count (a stock-take). New items always use it as opening stock.
export type ImportMode = "restock" | "set";

export interface ImportRow {
  row: number; // Spreadsheet row number, for error messages
  name: string;
  description?: string;
  category?: string;
  quantity?: number | string;
  minQuantity?: number | string;
}

export interface ImportPreviewRow {
  row: number;
  name: string;
  action: "create" | "update" | "unchanged" | "error";
  changes: Array<string>;
  error?: string;
}

export interface ImportResult {
  applied: boolean;
  rows: Array<ImportPreviewRow>;
  summary: { create: number; update: number; unchanged: number; error: number };
  newCategories: Array<string>;
}

// Column headings accepted in uploaded sheets (case-insensitive), mapped to
// ImportRow fields. The template uses the first spelling of each.
export const IMPORT_COLUMNS: Record<Exclude<keyof ImportRow, "row">, Array<string>> = {
  name: ["item name", "name", "item"],
  description: ["description", "details"],
  category: ["category"],
  quantity: ["quantity", "qty", "stock"],
  minQuantity: ["minimum quantity", "minimum", "min quantity", "min"],
};

export const IMPORT_MAX_ROWS = 1000;
