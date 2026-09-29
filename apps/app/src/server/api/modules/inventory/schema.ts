import { z } from "zod";
import { IMPORT_MAX_ROWS } from "#/lib/inventory";
import { optionalField } from "../../lib/optional-field.js";

const quantity = z.number().int().min(0).max(1_000_000);

// null (or omitted on create) means uncategorised.
const categoryId = z.number().int().positive().nullable();

export const createItemSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: optionalField(z.string().trim().max(500)),
  categoryId: categoryId.optional(),
  // Opening stock; later changes go through /adjust so they're logged.
  quantity,
  minQuantity: quantity,
});

export const updateItemSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    description: optionalField(z.string().trim().max(500)),
    categoryId,
    minQuantity: quantity,
    isActive: z.boolean(),
  })
  .partial();

export const adjustStockSchema = z.object({
  reason: z.enum(["restock", "adjustment"]),
  // Restocks add; adjustments may add or remove (e.g. damaged, recount).
  change: z
    .number()
    .int()
    .min(-1_000_000)
    .max(1_000_000)
    .refine((v) => v !== 0, "Enter a quantity other than 0."),
  note: optionalField(z.string().trim().max(255)),
}).refine((v) => v.reason === "adjustment" || v.change > 0, {
  message: "A restock must add stock.",
  path: ["change"],
});

export const createRequestSchema = z.object({
  purpose: z.string().trim().min(3).max(500),
  items: z
    .array(z.object({ itemId: z.number().int().positive(), quantity: z.number().int().min(1).max(1_000_000) }))
    .min(1, "Add at least one item.")
    .max(50)
    .refine((items) => new Set(items.map((i) => i.itemId)).size === items.length, {
      message: "Each item can only appear once.",
    }),
});

export const decisionSchema = z.object({
  note: optionalField(z.string().trim().max(500)),
});

export const rejectSchema = z.object({
  note: z.string().trim().min(3, "Give a reason.").max(500),
});

export const reportQuerySchema = z.object({
  period: z.enum(["week", "month", "quarter", "year"]).default("month"),
  categoryId: z.coerce.number().int().positive().optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: optionalField(z.string().trim().max(255)),
});

// Rows arrive already parsed from the spreadsheet (in the browser). Cells
// may be numbers or text, so quantities are coerced and checked per row in
// the service, where errors can be reported against the row number.
const cell = z.union([z.string().max(1000), z.number()]).optional();

export const importSchema = z.object({
  mode: z.enum(["restock", "set"]),
  dryRun: z.boolean(),
  rows: z
    .array(
      z.object({
        row: z.number().int().min(1),
        name: z.string().max(1000),
        description: cell,
        category: cell,
        quantity: cell,
        minQuantity: cell,
      }),
    )
    .min(1, "The sheet has no rows.")
    .max(IMPORT_MAX_ROWS, `Upload at most ${IMPORT_MAX_ROWS} rows at a time.`),
});
