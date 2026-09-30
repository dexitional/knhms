import { z } from "zod";
import { optionalField as optional } from "../../lib/optional-field.js";

export const directoryCategorySchema = z.enum(["personnel", "business", "executive", "page_personnel", "alumni"]);

export const MAX_TAGS = 8;

// Short labels shown as badges on the card, e.g. "Class of 2015", "Mentor".
// Trimmed, de-duplicated (ignoring case) and stored as JSON; an empty list
// is stored as NULL.
const tagsField = z
  .array(z.string().trim().min(1).max(30))
  .max(MAX_TAGS, `Use at most ${MAX_TAGS} tags.`)
  .optional()
  .transform((tags) => {
    if (tags === undefined) return undefined;
    const seen = new Set<string>();
    const unique = tags.filter((t) => {
      const key = t.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return unique.length > 0 ? JSON.stringify(unique) : null;
  });

export const createDirectoryEntrySchema = z.object({
  category: directoryCategorySchema,
  name: z.string().trim().min(2).max(150),
  title: z.string().trim().min(1).max(150),
  subtitle: optional(z.string().trim().max(255)),
  phone: optional(z.string().trim().max(30)),
  // Hide the phone number on the public site (alumni default to hidden).
  showPhone: z.boolean().optional(),
  email: optional(z.string().trim().email().max(150)),
  location: optional(z.string().trim().max(255)),
  hours: optional(z.string().trim().max(150)),
  photoUrl: optional(z.string().url().max(500)),
  mapQuery: optional(z.string().trim().max(255)),
  websiteUrl: optional(z.string().url().max(500)),
  tags: tagsField,
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export const updateDirectoryEntrySchema = createDirectoryEntrySchema.partial();
