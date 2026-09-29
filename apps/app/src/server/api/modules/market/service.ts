import { getPool } from "@knh/db";
import type { MarketCategoryRow, MarketProductRow } from "@knh/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { z } from "zod";
import { insertSql, toColumns, updateSql } from "../../lib/columns.js";
import { AppError } from "../../middleware/error-handler.js";
import { OLD_PRICE_MESSAGE } from "./schema.js";
import type {
  createCategorySchema,
  createProductSchema,
  updateCategorySchema,
  updateProductSchema,
} from "./schema.js";

type CategoryInput = z.infer<typeof createCategorySchema> | z.infer<typeof updateCategorySchema>;
// sellerId is set only by the seller portal, never from admin input.
type ProductInput = (z.infer<typeof createProductSchema> | z.infer<typeof updateProductSchema>) & {
  sellerId?: number;
};

interface MysqlError extends Error {
  code?: string;
}

const CATEGORY_FIELDS: Record<string, string> = {
  name: "name",
  icon: "icon",
  description: "description",
  sortOrder: "sort_order",
  isActive: "is_active",
};

const PRODUCT_FIELDS: Record<string, string> = {
  categoryId: "category_id",
  sellerId: "seller_id",
  name: "name",
  description: "description",
  price: "price",
  oldPrice: "old_price",
  imageUrl: "image_url",
  condition: "item_condition",
  audience: "audience",
  rating: "rating",
  sellerName: "seller_name",
  sellerPhone: "seller_phone",
  sellerLocation: "seller_location",
  isFeatured: "is_featured",
  sortOrder: "sort_order",
  isActive: "is_active",
};


// mysql2 returns DECIMAL columns as strings.
function toProduct(row: RowDataPacket): MarketProductRow {
  return {
    ...(row as MarketProductRow),
    price: Number(row.price),
    old_price: row.old_price == null ? null : Number(row.old_price),
    rating: row.rating == null ? null : Number(row.rating),
  };
}

function translateDbError(err: unknown): never {
  const code = (err as MysqlError).code;
  if (code === "ER_DUP_ENTRY") throw new AppError("A category with that name already exists.", 409);
  if (code === "ER_NO_REFERENCED_ROW_2") throw new AppError("That category doesn't exist.", 422);
  if (code === "ER_ROW_IS_REFERENCED_2") {
    throw new AppError("This category still has products. Move or delete them first.", 409);
  }
  throw err;
}

const CATEGORY_ORDER = "ORDER BY sort_order, name";
const PRODUCT_ORDER = "ORDER BY is_featured DESC, sort_order, created_at DESC";

// ---- Public -------------------------------------------------------------

// Hidden categories hide their products too, and seller listings only show
// while the seller is approved (not pending, rejected, or suspended).
export async function getPublicCatalog() {
  const pool = getPool();
  const [categories] = await pool.query<(MarketCategoryRow & RowDataPacket)[]>(
    `SELECT * FROM market_categories WHERE is_active = 1 ${CATEGORY_ORDER}`,
  );
  const [products] = await pool.query<RowDataPacket[]>(
    `SELECT p.*, s.logo_url AS seller_logo_url FROM market_products p
     JOIN market_categories c ON c.id = p.category_id
     LEFT JOIN sellers s ON s.id = p.seller_id
     WHERE p.is_active = 1 AND c.is_active = 1
       AND (p.seller_id IS NULL OR s.status = 'approved')
     ORDER BY p.is_featured DESC, p.sort_order, p.created_at DESC`,
  );
  return {
    categories: categories.map((c): MarketCategoryRow => ({ ...c })),
    products: products.map((row) => ({
      ...toProduct(row),
      seller_logo_url: (row.seller_logo_url as string | null) ?? null,
    })),
  };
}

// ---- Categories ---------------------------------------------------------

export async function listCategories() {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT c.*, (SELECT COUNT(*) FROM market_products p WHERE p.category_id = c.id) AS product_count
     FROM market_categories c ${CATEGORY_ORDER}`,
  );
  return rows.map((r) => ({ ...r, product_count: Number(r.product_count) }));
}

async function getCategory(id: number) {
  const pool = getPool();
  const [rows] = await pool.execute<(MarketCategoryRow & RowDataPacket)[]>(
    "SELECT * FROM market_categories WHERE id = ?",
    [id],
  );
  if (!rows[0]) throw new AppError("Category not found.", 404);
  return rows[0];
}

export async function createCategory(input: CategoryInput) {
  const { columns, params } = toColumns(input, CATEGORY_FIELDS);
  try {
    const [result] = await getPool().execute<ResultSetHeader>(
      insertSql("market_categories", columns),
      params,
    );
    return getCategory(result.insertId);
  } catch (err) {
    translateDbError(err);
  }
}

export async function updateCategory(id: number, input: CategoryInput) {
  const { columns, params } = toColumns(input, CATEGORY_FIELDS);
  if (columns.length === 0) return getCategory(id);
  try {
    const [result] = await getPool().execute<ResultSetHeader>(
      updateSql("market_categories", columns),
      [...params, id],
    );
    if (result.affectedRows === 0) throw new AppError("Category not found.", 404);
  } catch (err) {
    translateDbError(err);
  }
  return getCategory(id);
}

export async function deleteCategory(id: number) {
  try {
    const [result] = await getPool().execute<ResultSetHeader>(
      "DELETE FROM market_categories WHERE id = ?",
      [id],
    );
    if (result.affectedRows === 0) throw new AppError("Category not found.", 404);
  } catch (err) {
    translateDbError(err);
  }
}

// ---- Products -----------------------------------------------------------

export async function listProducts() {
  const [rows] = await getPool().query<RowDataPacket[]>(`SELECT * FROM market_products ${PRODUCT_ORDER}`);
  return rows.map(toProduct);
}

export async function getProduct(id: number) {
  const [rows] = await getPool().execute<RowDataPacket[]>("SELECT * FROM market_products WHERE id = ?", [id]);
  if (!rows[0]) throw new AppError("Product not found.", 404);
  return toProduct(rows[0]);
}

export async function createProduct(input: ProductInput) {
  const { columns, params } = toColumns(input, PRODUCT_FIELDS);
  try {
    const [result] = await getPool().execute<ResultSetHeader>(
      insertSql("market_products", columns),
      params,
    );
    return getProduct(result.insertId);
  } catch (err) {
    translateDbError(err);
  }
}

export async function updateProduct(id: number, input: ProductInput) {
  const { columns, params } = toColumns(input, PRODUCT_FIELDS);
  if (columns.length === 0) return getProduct(id);

  // Validate the merged prices — a PATCH may change only one of them.
  if (input.price !== undefined || input.oldPrice !== undefined) {
    const current = await getProduct(id);
    const price = input.price ?? current.price;
    const oldPrice = input.oldPrice === undefined ? current.old_price : input.oldPrice;
    if (oldPrice != null && oldPrice <= price) throw new AppError(OLD_PRICE_MESSAGE, 422);
  }

  try {
    const [result] = await getPool().execute<ResultSetHeader>(
      updateSql("market_products", columns),
      [...params, id],
    );
    if (result.affectedRows === 0) throw new AppError("Product not found.", 404);
  } catch (err) {
    translateDbError(err);
  }
  return getProduct(id);
}

export async function deleteProduct(id: number) {
  const [result] = await getPool().execute<ResultSetHeader>("DELETE FROM market_products WHERE id = ?", [id]);
  if (result.affectedRows === 0) throw new AppError("Product not found.", 404);
}
