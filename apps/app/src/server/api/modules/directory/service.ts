import { getPool } from "@knh/db";
import type { DirectoryEntryRow } from "@knh/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { z } from "zod";
import { insertSql, toColumns, updateSql } from "../../lib/columns.js";
import { AppError } from "../../middleware/error-handler.js";
import type { createDirectoryEntrySchema, updateDirectoryEntrySchema } from "./schema.js";

type CreateInput = z.infer<typeof createDirectoryEntrySchema>;
type UpdateInput = z.infer<typeof updateDirectoryEntrySchema>;

const ORDER_BY =
  "ORDER BY FIELD(category, 'personnel', 'business', 'executive', 'alumni', 'page_personnel'), sort_order, name";

// Categories managed in the admin but never shown on the public page.
const ADMIN_ONLY_CATEGORIES = ["page_personnel"];

const FIELD_MAP: Record<string, string> = {
  category: "category",
  name: "name",
  title: "title",
  subtitle: "subtitle",
  phone: "phone",
  showPhone: "show_phone",
  email: "email",
  location: "location",
  hours: "hours",
  photoUrl: "photo_url",
  mapQuery: "map_query",
  websiteUrl: "website_url",
  tags: "tags",
  sortOrder: "sort_order",
  isActive: "is_active",
};

// Tags come back parsed from the JSON column; guard against anything else.
function withTags<T extends DirectoryEntryRow>(row: T): DirectoryEntryRow {
  const tags: unknown = typeof row.tags === "string" ? JSON.parse(row.tags) : row.tags;
  return { ...row, tags: Array.isArray(tags) ? tags.filter((t): t is string => typeof t === "string") : null };
}

export async function listEntries() {
  const pool = getPool();
  const [rows] = await pool.query<(DirectoryEntryRow & RowDataPacket)[]>(
    `SELECT * FROM directory_entries ${ORDER_BY}`,
  );
  return rows.map(withTags);
}

// Public Yellow Pages — hidden entries, admin-only categories and phone
// numbers marked hidden never leave the server.
export async function listActiveEntries(): Promise<DirectoryEntryRow[]> {
  const pool = getPool();
  const [rows] = await pool.query<(DirectoryEntryRow & RowDataPacket)[]>(
    `SELECT * FROM directory_entries WHERE is_active = 1 AND category NOT IN (?) ${ORDER_BY}`,
    [ADMIN_ONLY_CATEGORIES],
  );
  return rows.map(withTags).map((row) => (row.show_phone ? row : { ...row, phone: null }));
}

export async function getEntry(id: number) {
  const pool = getPool();
  const [rows] = await pool.execute<(DirectoryEntryRow & RowDataPacket)[]>(
    "SELECT * FROM directory_entries WHERE id = ?",
    [id],
  );
  const entry = rows[0];
  if (!entry) throw new AppError("Directory entry not found.", 404);
  return withTags(entry);
}

export async function createEntry(input: CreateInput) {
  const { columns, params } = toColumns(
    { ...input, showPhone: input.showPhone ?? input.category !== "alumni" },
    FIELD_MAP,
  );
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    insertSql("directory_entries", columns),
    params,
  );
  return getEntry(result.insertId);
}

export async function updateEntry(id: number, input: UpdateInput) {
  const { columns, params } = toColumns(input, FIELD_MAP);
  if (columns.length === 0) return getEntry(id);

  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(
    updateSql("directory_entries", columns),
    [...params, id],
  );
  if (result.affectedRows === 0) throw new AppError("Directory entry not found.", 404);
  return getEntry(id);
}

// Hard delete — nothing references directory entries. Use isActive to hide
// an entry temporarily instead.
export async function deleteEntry(id: number) {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>("DELETE FROM directory_entries WHERE id = ?", [id]);
  if (result.affectedRows === 0) throw new AppError("Directory entry not found.", 404);
}
