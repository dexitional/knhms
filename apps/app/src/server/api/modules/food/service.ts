import { getPool } from "@knh/db";
import type { FoodMenuItemRow, FoodVendorRow } from "@knh/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { z } from "zod";
import { insertSql, toColumns, updateSql } from "../../lib/columns.js";
import { AppError } from "../../middleware/error-handler.js";
import type {
  createMenuItemSchema,
  createVendorSchema,
  updateMenuItemSchema,
  updateVendorSchema,
} from "./schema.js";

type VendorInput = z.infer<typeof createVendorSchema> | z.infer<typeof updateVendorSchema>;
type MenuItemInput = z.infer<typeof createMenuItemSchema> | z.infer<typeof updateMenuItemSchema>;

const VENDOR_FIELDS: Record<string, string> = {
  name: "name",
  cuisine: "cuisine",
  description: "description",
  logoUrl: "logo_url",
  phone: "phone",
  location: "location",
  openingHours: "opening_hours",
  delivers: "delivers",
  isOpen: "is_open",
  sortOrder: "sort_order",
  isActive: "is_active",
};

const MENU_ITEM_FIELDS: Record<string, string> = {
  section: "section",
  name: "name",
  description: "description",
  price: "price",
  imageUrl: "image_url",
  isAvailable: "is_available",
  sortOrder: "sort_order",
};

export type VendorWithMenu = FoodVendorRow & { menu: FoodMenuItemRow[] };

// mysql2 returns DECIMAL columns as strings.
function toMenuItem(row: RowDataPacket): FoodMenuItemRow {
  return { ...(row as FoodMenuItemRow), price: Number(row.price) };
}

async function withMenus(vendors: FoodVendorRow[]): Promise<VendorWithMenu[]> {
  if (vendors.length === 0) return [];
  const [items] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM food_menu_items WHERE vendor_id IN (?) ORDER BY sort_order, id",
    [vendors.map((v) => v.id)],
  );
  const menus = new Map<number, FoodMenuItemRow[]>();
  for (const item of items.map(toMenuItem)) {
    menus.set(item.vendor_id, [...(menus.get(item.vendor_id) ?? []), item]);
  }
  return vendors.map((v) => ({ ...v, menu: menus.get(v.id) ?? [] }));
}

const VENDOR_ORDER = "ORDER BY sort_order, name";

// Public: active vendors with their full menus. Sold-out items are included
// (and flagged) so students can see what a vendor normally sells. Seller-run
// vendors only show while the seller is approved.
export async function listPublicVendors() {
  const [rows] = await getPool().query<(FoodVendorRow & RowDataPacket)[]>(
    `SELECT * FROM food_vendors
     WHERE is_active = 1
       AND (seller_id IS NULL OR seller_id IN (SELECT id FROM sellers WHERE status = 'approved'))
     ${VENDOR_ORDER}`,
  );
  return withMenus(rows.map((r): FoodVendorRow => ({ ...r })));
}

export async function listVendors() {
  const [rows] = await getPool().query<(FoodVendorRow & RowDataPacket)[]>(
    `SELECT * FROM food_vendors ${VENDOR_ORDER}`,
  );
  return withMenus(rows.map((r): FoodVendorRow => ({ ...r })));
}

export async function getVendor(id: number) {
  const [rows] = await getPool().execute<(FoodVendorRow & RowDataPacket)[]>(
    "SELECT * FROM food_vendors WHERE id = ?",
    [id],
  );
  if (!rows[0]) throw new AppError("Vendor not found.", 404);
  return rows[0];
}

export async function createVendor(input: VendorInput) {
  const { columns, params } = toColumns(input, VENDOR_FIELDS);
  const [result] = await getPool().execute<ResultSetHeader>(insertSql("food_vendors", columns), params);
  return getVendor(result.insertId);
}

export async function updateVendor(id: number, input: VendorInput) {
  const { columns, params } = toColumns(input, VENDOR_FIELDS);
  if (columns.length === 0) return getVendor(id);
  const [result] = await getPool().execute<ResultSetHeader>(updateSql("food_vendors", columns), [...params, id]);
  if (result.affectedRows === 0) throw new AppError("Vendor not found.", 404);
  return getVendor(id);
}

// Also deletes the vendor's menu (ON DELETE CASCADE). Seller-run vendors
// can't be deleted here — that would orphan the seller's account; suspend
// the seller instead.
export async function deleteVendor(id: number) {
  const vendor = await getVendor(id);
  if (vendor.seller_id != null) {
    throw new AppError("This vendor is run by a registered seller. Suspend the seller instead.", 409);
  }
  const [result] = await getPool().execute<ResultSetHeader>("DELETE FROM food_vendors WHERE id = ?", [id]);
  if (result.affectedRows === 0) throw new AppError("Vendor not found.", 404);
}

async function getMenuItem(vendorId: number, itemId: number) {
  const [rows] = await getPool().execute<RowDataPacket[]>(
    "SELECT * FROM food_menu_items WHERE id = ? AND vendor_id = ?",
    [itemId, vendorId],
  );
  if (!rows[0]) throw new AppError("Menu item not found.", 404);
  return toMenuItem(rows[0]);
}

export async function createMenuItem(vendorId: number, input: MenuItemInput) {
  await getVendor(vendorId);
  const { columns, params } = toColumns(input, MENU_ITEM_FIELDS);
  const [result] = await getPool().execute<ResultSetHeader>(
    insertSql("food_menu_items", ["vendor_id", ...columns]),
    [vendorId, ...params],
  );
  return getMenuItem(vendorId, result.insertId);
}

export async function updateMenuItem(vendorId: number, itemId: number, input: MenuItemInput) {
  const { columns, params } = toColumns(input, MENU_ITEM_FIELDS);
  if (columns.length === 0) return getMenuItem(vendorId, itemId);
  const [result] = await getPool().execute<ResultSetHeader>(
    `${updateSql("food_menu_items", columns)} AND vendor_id = ?`,
    [...params, itemId, vendorId],
  );
  if (result.affectedRows === 0) throw new AppError("Menu item not found.", 404);
  return getMenuItem(vendorId, itemId);
}

export async function deleteMenuItem(vendorId: number, itemId: number) {
  const [result] = await getPool().execute<ResultSetHeader>(
    "DELETE FROM food_menu_items WHERE id = ? AND vendor_id = ?",
    [itemId, vendorId],
  );
  if (result.affectedRows === 0) throw new AppError("Menu item not found.", 404);
}
