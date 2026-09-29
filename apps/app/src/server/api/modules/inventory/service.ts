import { getPool } from "@knh/db";
import type { InventoryCategoryRow, InventoryItemRow, InventoryRequestRow } from "@knh/db";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { z } from "zod";
import type { AdminSessionUser } from "#/server/session-core";
import { requestReference, stockLevel } from "#/lib/inventory";
import type {
  ImportPreviewRow,
  ImportResult,
  InventoryCategory,
  InventoryItem,
  InventoryMovement,
  InventoryRequest,
  RequestStatus,
} from "#/lib/inventory";
import { toColumns, updateSql } from "../../lib/columns.js";
import { ghanaPhoneToE164, sendSms } from "../../lib/sms.js";
import { AppError } from "../../middleware/error-handler.js";
import type {
  adjustStockSchema,
  categorySchema,
  createItemSchema,
  createRequestSchema,
  importSchema,
  updateItemSchema,
} from "./schema.js";

// Inventory: hall stock (managed by the super admin), requests for stock
// (raised by admins), approval (super admin) and release (stores). Every
// stock change is logged in inventory_movements, and anything that takes an
// item to or below its minimum sends a low-stock SMS.

type CreateItemInput = z.infer<typeof createItemSchema>;
type UpdateItemInput = z.infer<typeof updateItemSchema>;
type AdjustInput = z.infer<typeof adjustStockSchema>;
type CreateRequestInput = z.infer<typeof createRequestSchema>;
type CategoryInput = z.infer<typeof categorySchema>;
type ImportInput = z.infer<typeof importSchema>;

interface MysqlError extends Error {
  code?: string;
}

// Who sees every request; admins only see the ones they raised.
const SEES_ALL: Array<AdminSessionUser["role"]> = ["super_admin", "stores"];

type ItemWithCategory = InventoryItemRow & { category_name?: string | null };

function toItem(row: ItemWithCategory): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category_id: row.category_id,
    category_name: row.category_name ?? null,
    quantity: row.quantity,
    min_quantity: row.min_quantity,
    is_active: row.is_active,
    level: stockLevel(row.quantity, row.min_quantity),
    updated_at: row.updated_at,
  };
}

async function withTransaction<T>(work: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ---- Low-stock alerts ----------------------------------------------------------

interface LowStockHit {
  name: string;
  quantity: number;
  min_quantity: number;
}

// True when a change takes an item from above its minimum to at/below it,
// so each drop alerts once rather than on every later release.
function crossedIntoLow(before: { quantity: number; min_quantity: number }, after: { quantity: number; min_quantity: number }) {
  return before.quantity > before.min_quantity && after.quantity <= after.min_quantity;
}

// One SMS per recipient (super admins, admins and stores with a phone
// number), listing every item that just went low. Fire-and-forget: a failed
// SMS never undoes the stock change.
export function notifyLowStock(hits: Array<LowStockHit>) {
  if (hits.length === 0) return;
  const lines = hits.map((h) => `${h.name}: ${h.quantity} left (min ${h.min_quantity})`).join("; ");
  const message = `KNH Stores alert: low stock. ${lines}. Please restock.`;
  void (async () => {
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT phone_number FROM admins
       WHERE is_active = 1 AND role IN ('super_admin', 'admin', 'stores')
         AND phone_number IS NOT NULL AND phone_number <> ''`,
    );
    const phones = [...new Set(rows.map((r) => ghanaPhoneToE164(String(r.phone_number))))];
    await Promise.all(
      phones.map((phone) =>
        sendSms(phone, message).catch((err: unknown) => console.error("Failed to send low-stock SMS:", err)),
      ),
    );
  })().catch((err: unknown) => console.error("Low-stock alert failed:", err));
}

// ---- Items ----------------------------------------------------------------------

const ITEM_SELECT = `SELECT i.*, c.name AS category_name FROM inventory_items i
  LEFT JOIN inventory_categories c ON c.id = i.category_id`;

export async function listItems() {
  const [rows] = await getPool().query<(ItemWithCategory & RowDataPacket)[]>(
    `${ITEM_SELECT} ORDER BY i.is_active DESC, i.name`,
  );
  return rows.map((r) => toItem({ ...r }));
}

async function getItemWithCategory(id: number) {
  const [rows] = await getPool().execute<(ItemWithCategory & RowDataPacket)[]>(`${ITEM_SELECT} WHERE i.id = ?`, [id]);
  if (!rows[0]) throw new AppError("Item not found.", 404);
  return toItem({ ...rows[0] });
}

async function assertCategory(id: number | null | undefined) {
  if (id == null) return;
  const [rows] = await getPool().execute<RowDataPacket[]>("SELECT id FROM inventory_categories WHERE id = ?", [id]);
  if (!rows[0]) throw new AppError("That category no longer exists.", 422);
}

export async function getItem(id: number, conn?: PoolConnection, lock = false) {
  const runner = conn ?? getPool();
  const [rows] = await runner.execute<(InventoryItemRow & RowDataPacket)[]>(
    `SELECT * FROM inventory_items WHERE id = ?${lock ? " FOR UPDATE" : ""}`,
    [id],
  );
  if (!rows[0]) throw new AppError("Item not found.", 404);
  return { ...rows[0] };
}

const duplicateName = (err: unknown) => {
  if ((err as MysqlError).code === "ER_DUP_ENTRY") throw new AppError("An item with that name already exists.", 409);
  throw err;
};

export async function createItem(adminId: number, input: CreateItemInput) {
  await assertCategory(input.categoryId);
  const id = await withTransaction(async (conn) => {
    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO inventory_items (name, description, category_id, quantity, min_quantity, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [input.name, input.description ?? null, input.categoryId ?? null, input.quantity, input.minQuantity, adminId],
    );
    if (input.quantity > 0) {
      await conn.execute(
        `INSERT INTO inventory_movements (item_id, quantity_change, quantity_after, reason, admin_id)
         VALUES (?, ?, ?, 'opening', ?)`,
        [result.insertId, input.quantity, input.quantity, adminId],
      );
    }
    return result.insertId;
  }).catch(duplicateName);
  return getItemWithCategory(id);
}

const ITEM_FIELDS: Record<string, string> = {
  name: "name",
  description: "description",
  categoryId: "category_id",
  minQuantity: "min_quantity",
  isActive: "is_active",
};

// Quantity isn't editable here — it only changes through adjustments and
// releases, so every change is logged. Raising the minimum can make an item
// low, which alerts like any other drop.
export async function updateItem(id: number, input: UpdateItemInput) {
  const before = await getItem(id);
  await assertCategory(input.categoryId);
  const { columns, params } = toColumns(input, ITEM_FIELDS);
  if (columns.length > 0) {
    await getPool().execute(updateSql("inventory_items", columns), [...params, id]).catch(duplicateName);
  }
  const after = await getItem(id);
  if (after.is_active && crossedIntoLow(before, after)) notifyLowStock([after]);
  return getItemWithCategory(id);
}

export async function adjustStock(adminId: number, id: number, input: AdjustInput) {
  const { before, after } = await withTransaction(async (conn) => {
    const item = await getItem(id, conn, true);
    const quantity = item.quantity + input.change;
    if (quantity < 0) {
      throw new AppError(`Only ${item.quantity} in stock; you can remove at most ${item.quantity}.`, 409);
    }
    await conn.execute("UPDATE inventory_items SET quantity = ? WHERE id = ?", [quantity, id]);
    await conn.execute(
      `INSERT INTO inventory_movements (item_id, quantity_change, quantity_after, reason, note, admin_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.change, quantity, input.reason, input.note ?? null, adminId],
    );
    return { before: item, after: { ...item, quantity } };
  });
  if (after.is_active && crossedIntoLow(before, after)) notifyLowStock([after]);
  return getItemWithCategory(id);
}

// Items that appear on requests are kept for the record; deactivate instead.
export async function deleteItem(id: number) {
  const [used] = await getPool().execute<RowDataPacket[]>(
    "SELECT 1 FROM inventory_request_items WHERE item_id = ? LIMIT 1",
    [id],
  );
  if (used[0]) {
    throw new AppError("This item appears on requests, so it can't be deleted. Mark it inactive instead.", 409);
  }
  const [result] = await getPool().execute<ResultSetHeader>("DELETE FROM inventory_items WHERE id = ?", [id]);
  if (result.affectedRows === 0) throw new AppError("Item not found.", 404);
}

// ---- Categories -------------------------------------------------------------------

export async function listCategories(): Promise<Array<InventoryCategory>> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT c.id, c.name, c.description, COUNT(i.id) AS item_count
     FROM inventory_categories c LEFT JOIN inventory_items i ON i.category_id = c.id
     GROUP BY c.id ORDER BY c.name`,
  );
  return rows.map((r) => ({ id: r.id, name: r.name, description: r.description, item_count: Number(r.item_count) }));
}

const duplicateCategory = (err: unknown) => {
  if ((err as MysqlError).code === "ER_DUP_ENTRY") throw new AppError("A category with that name already exists.", 409);
  throw err;
};

export async function createCategory(input: CategoryInput) {
  const [result] = await getPool()
    .execute<ResultSetHeader>("INSERT INTO inventory_categories (name, description) VALUES (?, ?)", [
      input.name,
      input.description ?? null,
    ])
    .catch(duplicateCategory);
  return { id: result.insertId };
}

export async function updateCategory(id: number, input: CategoryInput) {
  const [result] = await getPool()
    .execute<ResultSetHeader>("UPDATE inventory_categories SET name = ?, description = ? WHERE id = ?", [
      input.name,
      input.description ?? null,
      id,
    ])
    .catch(duplicateCategory);
  if (result.affectedRows === 0) throw new AppError("Category not found.", 404);
}

// Its items stay, uncategorised (the foreign key sets category_id to NULL).
export async function deleteCategory(id: number) {
  const [result] = await getPool().execute<ResultSetHeader>("DELETE FROM inventory_categories WHERE id = ?", [id]);
  if (result.affectedRows === 0) throw new AppError("Category not found.", 404);
}

// ---- Bulk upload --------------------------------------------------------------------

interface ParsedRow {
  row: number;
  name: string;
  description: string | null | undefined; // undefined = column blank, keep existing
  category: string | undefined;
  quantity: number | undefined;
  minQuantity: number | undefined;
}

const text = (v: string | number | undefined) => (v === undefined ? "" : String(v).trim());

// Blank cells mean "leave as is"; anything else must be a whole number ≥ 0.
function wholeNumber(v: string | number | undefined, label: string): number | undefined {
  const raw = text(v).replace(/,/g, "");
  if (raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 1_000_000) throw new Error(`${label} must be a whole number from 0 to 1,000,000.`);
  return n;
}

function parseRow(r: ImportInput["rows"][number]): ParsedRow {
  const name = text(r.name);
  if (name.length < 2) throw new Error("Item name is required (at least 2 characters).");
  if (name.length > 150) throw new Error("Item name is too long (150 characters max).");
  const description = text(r.description);
  if (description.length > 500) throw new Error("Description is too long (500 characters max).");
  const category = text(r.category);
  if (category.length > 100) throw new Error("Category is too long (100 characters max).");
  if (category.length === 1) throw new Error("Category name must be at least 2 characters.");
  return {
    row: r.row,
    name,
    description: description || undefined,
    category: category || undefined,
    quantity: wholeNumber(r.quantity, "Quantity"),
    minQuantity: wholeNumber(r.minQuantity, "Minimum quantity"),
  };
}

// Previews (dryRun) or applies a spreadsheet of stock. Rows match existing
// items by name, ignoring case. New items use Quantity as opening stock;
// existing items add it as a restock or, in "set" mode, have their count
// replaced (a stock-take, logged as an adjustment). Blank cells leave the
// current value. Unknown categories are created. Nothing is applied if any
// row has an error.
export async function importItems(adminId: number, input: ImportInput): Promise<ImportResult> {
  const pool = getPool();
  const [[items], [categories]] = await Promise.all([
    pool.query<(InventoryItemRow & RowDataPacket)[]>("SELECT * FROM inventory_items"),
    pool.query<(InventoryCategoryRow & RowDataPacket)[]>("SELECT * FROM inventory_categories"),
  ]);
  const itemsByName = new Map(items.map((i) => [i.name.toLowerCase(), { ...i }]));
  const categoryByName = new Map<string, { id: number; name: string }>(
    categories.map((c) => [c.name.toLowerCase(), { id: c.id, name: c.name }]),
  );
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const newCategories = new Map<string, string>(); // lower-case → as written

  const seen = new Set<string>();
  const plans: Array<{ parsed: ParsedRow; existing?: InventoryItemRow }> = [];
  const preview: Array<ImportPreviewRow> = [];

  for (const raw of input.rows) {
    let parsed: ParsedRow;
    try {
      parsed = parseRow(raw);
    } catch (err) {
      preview.push({ row: raw.row, name: text(raw.name), action: "error", changes: [], error: (err as Error).message });
      continue;
    }
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) {
      preview.push({ row: parsed.row, name: parsed.name, action: "error", changes: [], error: "This item appears more than once in the sheet." });
      continue;
    }
    seen.add(key);
    if (parsed.category && !categoryByName.has(parsed.category.toLowerCase())) {
      newCategories.set(parsed.category.toLowerCase(), parsed.category);
    }

    const existing = itemsByName.get(key);
    const changes: string[] = [];
    if (!existing) {
      changes.push(`New item, opening stock ${parsed.quantity ?? 0}, minimum ${parsed.minQuantity ?? 0}`);
      if (parsed.category) changes.push(`Category: ${parsed.category}`);
      preview.push({ row: parsed.row, name: parsed.name, action: "create", changes });
    } else {
      if (parsed.quantity !== undefined) {
        if (input.mode === "restock" && parsed.quantity > 0) {
          changes.push(`Stock ${existing.quantity} → ${existing.quantity + parsed.quantity} (+${parsed.quantity})`);
        }
        if (input.mode === "set" && parsed.quantity !== existing.quantity) {
          const diff = parsed.quantity - existing.quantity;
          changes.push(`Stock ${existing.quantity} → ${parsed.quantity} (${diff > 0 ? "+" : ""}${diff})`);
        }
      }
      if (parsed.minQuantity !== undefined && parsed.minQuantity !== existing.min_quantity) {
        changes.push(`Minimum ${existing.min_quantity} → ${parsed.minQuantity}`);
      }
      if (parsed.description !== undefined && parsed.description !== (existing.description ?? undefined)) {
        changes.push("Description updated");
      }
      if (parsed.category) {
        const current = existing.category_id ? categoryNameById.get(existing.category_id) : undefined;
        if (current?.toLowerCase() !== parsed.category.toLowerCase()) {
          changes.push(`Category: ${current ?? "none"} → ${parsed.category}`);
        }
      }
      preview.push({ row: parsed.row, name: existing.name, action: changes.length ? "update" : "unchanged", changes });
    }
    plans.push({ parsed, existing });
  }

  preview.sort((a, b) => a.row - b.row);
  const summary = {
    create: preview.filter((p) => p.action === "create").length,
    update: preview.filter((p) => p.action === "update").length,
    unchanged: preview.filter((p) => p.action === "unchanged").length,
    error: preview.filter((p) => p.action === "error").length,
  };
  const result = { rows: preview, summary, newCategories: [...newCategories.values()] };
  if (input.dryRun || summary.error > 0) return { applied: false, ...result };

  const lowHits = await withTransaction(async (conn) => {
    // Create any new categories first.
    for (const [key, name] of newCategories) {
      const [r] = await conn.execute<ResultSetHeader>("INSERT INTO inventory_categories (name) VALUES (?)", [name]);
      categoryByName.set(key, { id: r.insertId, name });
    }
    const categoryIdFor = (name?: string) => (name ? categoryByName.get(name.toLowerCase())?.id ?? null : undefined);
    const hits: Array<LowStockHit> = [];
    const note = input.mode === "set" ? "Bulk upload (stock-take)" : "Bulk upload";

    for (const { parsed, existing } of plans) {
      if (!existing) {
        const quantity = parsed.quantity ?? 0;
        const [r] = await conn.execute<ResultSetHeader>(
          `INSERT INTO inventory_items (name, description, category_id, quantity, min_quantity, created_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [parsed.name, parsed.description ?? null, categoryIdFor(parsed.category) ?? null, quantity, parsed.minQuantity ?? 0, adminId],
        );
        if (quantity > 0) {
          await conn.execute(
            `INSERT INTO inventory_movements (item_id, quantity_change, quantity_after, reason, note, admin_id)
             VALUES (?, ?, ?, 'opening', ?, ?)`,
            [r.insertId, quantity, quantity, note, adminId],
          );
        }
        continue;
      }

      // Re-read under lock: stock may have moved since the preview.
      const item = await getItem(existing.id, conn, true);
      let quantity = item.quantity;
      if (parsed.quantity !== undefined) {
        quantity = input.mode === "restock" ? item.quantity + parsed.quantity : parsed.quantity;
      }
      const minQuantity = parsed.minQuantity ?? item.min_quantity;
      const categoryId = categoryIdFor(parsed.category);
      await conn.execute(
        "UPDATE inventory_items SET quantity = ?, min_quantity = ?, description = ?, category_id = ? WHERE id = ?",
        [
          quantity,
          minQuantity,
          parsed.description ?? item.description,
          categoryId === undefined ? item.category_id : categoryId,
          item.id,
        ],
      );
      if (quantity !== item.quantity) {
        await conn.execute(
          `INSERT INTO inventory_movements (item_id, quantity_change, quantity_after, reason, note, admin_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [item.id, quantity - item.quantity, quantity, input.mode === "set" ? "adjustment" : "restock", note, adminId],
        );
      }
      const after = { quantity, min_quantity: minQuantity };
      if (item.is_active && crossedIntoLow(item, after)) hits.push({ name: item.name, ...after });
    }
    return hits;
  });
  notifyLowStock(lowHits);
  return { applied: true, ...result };
}

export async function listMovements(limit = 100) {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT m.id, i.name AS item_name, m.quantity_change, m.quantity_after, m.reason, m.note,
            m.request_id, a.full_name AS admin_name, m.created_at
     FROM inventory_movements m
     JOIN inventory_items i ON i.id = m.item_id
     LEFT JOIN admins a ON a.id = m.admin_id
     ORDER BY m.created_at DESC, m.id DESC LIMIT ?`,
    [limit],
  );
  return rows.map(
    (r): InventoryMovement => ({
      id: r.id,
      item_name: r.item_name,
      quantity_change: r.quantity_change,
      quantity_after: r.quantity_after,
      reason: r.reason,
      note: r.note,
      request_reference: r.request_id ? requestReference(r.request_id) : null,
      admin_name: r.admin_name,
      created_at: r.created_at,
    }),
  );
}

// ---- Requests -------------------------------------------------------------------

const REQUEST_SELECT = `
  SELECT r.*, rq.full_name AS requested_by_name, ap.full_name AS approved_by_name,
         rj.full_name AS rejected_by_name, rl.full_name AS released_by_name
  FROM inventory_requests r
  LEFT JOIN admins rq ON rq.id = r.requested_by
  LEFT JOIN admins ap ON ap.id = r.approved_by
  LEFT JOIN admins rj ON rj.id = r.rejected_by
  LEFT JOIN admins rl ON rl.id = r.released_by`;

async function hydrate(rows: RowDataPacket[]): Promise<Array<InventoryRequest>> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id as number);
  const [lines] = await getPool().query<RowDataPacket[]>(
    `SELECT ri.request_id, ri.item_id, i.name AS item_name, ri.quantity, i.quantity AS in_stock
     FROM inventory_request_items ri JOIN inventory_items i ON i.id = ri.item_id
     WHERE ri.request_id IN (?) ORDER BY ri.id`,
    [ids],
  );
  return rows.map((r) => ({
    id: r.id,
    reference: requestReference(r.id),
    purpose: r.purpose,
    status: r.status,
    decision_note: r.decision_note,
    requested_by: r.requested_by,
    requested_by_name: r.requested_by_name,
    approved_by_name: r.approved_by_name,
    approved_at: r.approved_at,
    rejected_by_name: r.rejected_by_name,
    rejected_at: r.rejected_at,
    released_by_name: r.released_by_name,
    released_at: r.released_at,
    cancelled_at: r.cancelled_at,
    created_at: r.created_at,
    items: lines
      .filter((l) => l.request_id === r.id)
      .map((l) => ({ item_id: l.item_id, item_name: l.item_name, quantity: l.quantity, in_stock: l.in_stock })),
  }));
}

export async function listRequests(admin: AdminSessionUser, status?: RequestStatus) {
  const where: string[] = [];
  const params: Array<string | number> = [];
  if (!SEES_ALL.includes(admin.role)) {
    where.push("r.requested_by = ?");
    params.push(admin.id);
  }
  if (status) {
    where.push("r.status = ?");
    params.push(status);
  }
  const [rows] = await getPool().query<RowDataPacket[]>(
    `${REQUEST_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY FIELD(r.status, 'pending', 'approved', 'released', 'rejected', 'cancelled'), r.created_at DESC`,
    params,
  );
  return hydrate(rows);
}

export async function getRequest(admin: AdminSessionUser, id: number) {
  const [rows] = await getPool().query<RowDataPacket[]>(`${REQUEST_SELECT} WHERE r.id = ?`, [id]);
  const row = rows[0];
  if (!row || (!SEES_ALL.includes(admin.role) && row.requested_by !== admin.id)) {
    throw new AppError("Request not found.", 404);
  }
  return (await hydrate([row]))[0]!;
}

export async function createRequest(admin: AdminSessionUser, input: CreateRequestInput) {
  const ids = input.items.map((i) => i.itemId);
  const [items] = await getPool().query<(InventoryItemRow & RowDataPacket)[]>(
    "SELECT id, name, is_active FROM inventory_items WHERE id IN (?)",
    [ids],
  );
  for (const line of input.items) {
    const item = items.find((i) => i.id === line.itemId);
    if (!item) throw new AppError("One of the items no longer exists.", 422);
    if (!item.is_active) throw new AppError(`${item.name} is no longer stocked.`, 422);
  }
  const id = await withTransaction(async (conn) => {
    const [result] = await conn.execute<ResultSetHeader>(
      "INSERT INTO inventory_requests (requested_by, purpose) VALUES (?, ?)",
      [admin.id, input.purpose],
    );
    for (const line of input.items) {
      await conn.execute("INSERT INTO inventory_request_items (request_id, item_id, quantity) VALUES (?, ?, ?)", [
        result.insertId,
        line.itemId,
        line.quantity,
      ]);
    }
    return result.insertId;
  });
  return getRequest(admin, id);
}

async function requireStatus(id: number, expected: RequestStatus, conn?: PoolConnection) {
  const runner = conn ?? getPool();
  const [rows] = await runner.execute<(InventoryRequestRow & RowDataPacket)[]>(
    `SELECT * FROM inventory_requests WHERE id = ?${conn ? " FOR UPDATE" : ""}`,
    [id],
  );
  const request = rows[0];
  if (!request) throw new AppError("Request not found.", 404);
  if (request.status !== expected) {
    throw new AppError(`This request is ${request.status}, not ${expected}.`, 409);
  }
  return request;
}

export async function approveRequest(admin: AdminSessionUser, id: number, note: string | null | undefined) {
  await requireStatus(id, "pending");
  await getPool().execute(
    "UPDATE inventory_requests SET status = 'approved', approved_by = ?, approved_at = NOW(), decision_note = ? WHERE id = ? AND status = 'pending'",
    [admin.id, note ?? null, id],
  );
  return getRequest(admin, id);
}

export async function rejectRequest(admin: AdminSessionUser, id: number, note: string) {
  await requireStatus(id, "pending");
  await getPool().execute(
    "UPDATE inventory_requests SET status = 'rejected', rejected_by = ?, rejected_at = NOW(), decision_note = ? WHERE id = ? AND status = 'pending'",
    [admin.id, note, id],
  );
  return getRequest(admin, id);
}

// Requesters can withdraw a request until it's decided.
export async function cancelRequest(admin: AdminSessionUser, id: number) {
  const request = await requireStatus(id, "pending");
  if (request.requested_by !== admin.id) throw new AppError("Only the person who raised it can cancel it.", 403);
  await getPool().execute(
    "UPDATE inventory_requests SET status = 'cancelled', cancelled_at = NOW() WHERE id = ? AND status = 'pending'",
    [id],
  );
  return getRequest(admin, id);
}

// Hands the stock over: checks there's enough of every item, deducts it and
// logs the movements in one transaction, then alerts on anything now low.
export async function releaseRequest(admin: AdminSessionUser, id: number) {
  const hits = await withTransaction(async (conn) => {
    await requireStatus(id, "approved", conn);
    const [lines] = await conn.execute<RowDataPacket[]>(
      "SELECT item_id, quantity FROM inventory_request_items WHERE request_id = ? ORDER BY item_id",
      [id],
    );
    const lowHits: Array<LowStockHit> = [];
    const shortages: string[] = [];
    const updates: Array<{ item: InventoryItemRow; quantity: number; take: number }> = [];
    for (const line of lines) {
      const item = await getItem(line.item_id as number, conn, true);
      const take = line.quantity as number;
      if (item.quantity < take) shortages.push(`${item.name} (need ${take}, have ${item.quantity})`);
      else updates.push({ item, quantity: item.quantity - take, take });
    }
    if (shortages.length > 0) throw new AppError(`Not enough stock: ${shortages.join(", ")}. Restock first.`, 409);

    for (const { item, quantity, take } of updates) {
      await conn.execute("UPDATE inventory_items SET quantity = ? WHERE id = ?", [quantity, item.id]);
      await conn.execute(
        `INSERT INTO inventory_movements (item_id, quantity_change, quantity_after, reason, request_id, admin_id)
         VALUES (?, ?, ?, 'release', ?, ?)`,
        [item.id, -take, quantity, id, admin.id],
      );
      const after = { quantity, min_quantity: item.min_quantity };
      if (item.is_active && crossedIntoLow(item, after)) lowHits.push({ name: item.name, ...after });
    }
    await conn.execute(
      "UPDATE inventory_requests SET status = 'released', released_by = ?, released_at = NOW() WHERE id = ?",
      [admin.id, id],
    );
    return lowHits;
  });
  notifyLowStock(hits);
  return getRequest(admin, id);
}
