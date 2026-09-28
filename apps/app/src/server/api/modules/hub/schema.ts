import { z } from "zod";
import { optionalField } from "../../lib/optional-field.js";
import { isRichTextEmpty, sanitizeRichText } from "../../lib/rich-text.js";

export const hubPostTypeSchema = z.enum(["spotlight", "announcement", "news", "event"]);

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

const hubPostFields = z.object({
  type: hubPostTypeSchema,
  title: z.string().trim().min(3).max(255),
  excerpt: optionalField(z.string().trim().max(1000)),
  // Rich-text HTML from the admin editor, cleaned against an allowlist.
  body: optionalField(z.string().max(500_000)).transform((v) => {
    if (!v) return v;
    const html = sanitizeRichText(v);
    return isRichTextEmpty(html) ? null : html;
  }),
  category: optionalField(z.string().trim().max(60)),
  categoryUrl: optionalField(z.string().url().max(500)),
  linkUrl: optionalField(z.string().url().max(500)),
  imageUrl: optionalField(z.string().url().max(500)),
  publishedOn: date,
  eventStart: optionalField(date),
  eventEnd: optionalField(date),
  eventTime: optionalField(z.string().trim().max(60)),
  location: optionalField(z.string().trim().max(255)),
  isFeatured: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

type HubPostInput = z.infer<typeof hubPostFields>;

// What each type needs to render on the KNH Hub page. Applied to the full
// post (on PATCH, after merging with the stored row — see service.ts).
export function hubPostProblems(p: Partial<HubPostInput>): Array<{ path: string; message: string }> {
  const problems: Array<{ path: string; message: string }> = [];
  const need = (field: keyof HubPostInput, message: string) => {
    if (!p[field]) problems.push({ path: field, message });
  };
  if (p.type === "spotlight") need("excerpt", "Spotlights need a short summary.");
  if (p.type === "announcement" || p.type === "news") {
    need("excerpt", "Add a short summary for the card.");
    need("body", "Add the content.");
    need("category", "Choose a category.");
  }
  if (p.type === "event") {
    need("eventStart", "Events need a start date.");
    if (p.eventStart && p.eventEnd && p.eventEnd < p.eventStart) {
      problems.push({ path: "eventEnd", message: "The end date can't be before the start date." });
    }
  }
  return problems;
}

export const createHubPostSchema = hubPostFields.superRefine((p, ctx) => {
  for (const { path, message } of hubPostProblems(p)) ctx.addIssue({ code: "custom", path: [path], message });
});

// The post's type is fixed once created.
export const updateHubPostSchema = hubPostFields.omit({ type: true }).partial();
