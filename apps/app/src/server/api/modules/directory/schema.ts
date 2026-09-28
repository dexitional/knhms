import { z } from "zod";
import { optionalField as optional } from "../../lib/optional-field.js";

export const directoryCategorySchema = z.enum(["personnel", "business", "executive", "page_personnel"]);

export const createDirectoryEntrySchema = z.object({
  category: directoryCategorySchema,
  name: z.string().trim().min(2).max(150),
  title: z.string().trim().min(1).max(150),
  subtitle: optional(z.string().trim().max(255)),
  phone: optional(z.string().trim().max(30)),
  email: optional(z.string().trim().email().max(150)),
  location: optional(z.string().trim().max(255)),
  hours: optional(z.string().trim().max(150)),
  photoUrl: optional(z.string().url().max(500)),
  mapQuery: optional(z.string().trim().max(255)),
  websiteUrl: optional(z.string().url().max(500)),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export const updateDirectoryEntrySchema = createDirectoryEntrySchema.partial();
