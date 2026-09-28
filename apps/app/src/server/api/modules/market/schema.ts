import { z } from "zod";
import { optionalField } from "../../lib/optional-field.js";

// Icon keys the public page knows how to draw (see MARKET_ICONS in
// lib/market.ts) — kept as a closed list so an admin can't save one that
// renders blank.
export const marketIconSchema = z.enum([
  "book-open",
  "laptop",
  "smartphone",
  "bed",
  "shirt",
  "utensils",
  "briefcase",
  "sparkles",
  "dumbbell",
  "shopping-bag",
]);

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  icon: marketIconSchema,
  description: optionalField(z.string().trim().max(255)),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

const money = z.number().positive().max(99_999_999);

export const productFields = z.object({
    categoryId: z.number().int().positive(),
    name: z.string().trim().min(2).max(200),
    description: optionalField(z.string().trim().max(5000)),
    price: money,
    oldPrice: money.nullable().optional(),
    imageUrl: optionalField(z.string().url().max(500)),
    condition: z.enum(["new", "used"]).optional(),
    audience: z.enum(["all", "students", "staff"]).optional(),
    rating: z.number().min(0).max(5).nullable().optional(),
    sellerName: z.string().trim().min(2).max(150),
    sellerPhone: optionalField(z.string().trim().max(30)),
    sellerLocation: optionalField(z.string().trim().max(255)),
    isFeatured: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
    isActive: z.boolean().optional(),
});

export const OLD_PRICE_MESSAGE = "Old price must be higher than the current price.";

export const createProductSchema = productFields.refine(
  (p) => p.oldPrice == null || p.oldPrice > p.price,
  { message: OLD_PRICE_MESSAGE, path: ["oldPrice"] },
);

// PATCH can't re-check oldPrice > price without the stored row, so the
// service does that comparison after merging.
export const updateProductSchema = productFields.partial();
