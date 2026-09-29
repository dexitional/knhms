import { z } from "zod";
import { FRESHMEN_ICON_NAMES } from "#/lib/freshmen";
import { optionalField } from "../../lib/optional-field.js";
import { isRichTextEmpty, sanitizeRichText } from "../../lib/rich-text.js";

const icon = z.enum(FRESHMEN_ICON_NAMES);
const sortOrder = z.number().int().min(0).max(9999);
const imageUrl = optionalField(z.url({ protocol: /^https?$/ }).max(500));
const id = z.number().int().positive();

// Rich-text HTML from the admin editor, cleaned against an allowlist.
const richText = optionalField(z.string().max(500_000)).transform((v) => {
  if (!v) return v;
  const html = sanitizeRichText(v);
  return isRichTextEmpty(html) ? null : html;
});

const guideFields = z.object({
  title: z.string().trim().min(2).max(150),
  summary: optionalField(z.string().trim().max(500)),
  icon: icon.optional(),
  imageUrl,
  sortOrder: sortOrder.optional(),
  isPublished: z.boolean().optional(),
});
export const createGuideSchema = guideFields;
export const updateGuideSchema = guideFields.partial();

const sectionFields = z.object({
  guideId: id,
  title: z.string().trim().min(2).max(150),
  intro: richText,
  imageUrl,
  isMandatory: z.boolean().optional(),
  sortOrder: sortOrder.optional(),
  isPublished: z.boolean().optional(),
});
export const createSectionSchema = sectionFields;
export const updateSectionSchema = sectionFields.partial();

const topicItem = z.object({
  title: z.string().trim().min(1).max(150),
  note: optionalField(z.string().trim().max(300)),
  icon: icon.nullable().optional(),
});

const topicFields = z.object({
  sectionId: id,
  title: z.string().trim().min(2).max(150),
  body: richText,
  layout: z.enum(["text", "steps", "cards"]).optional(),
  // Stored as JSON; empty lists are stored as NULL.
  items: z
    .array(topicItem)
    .max(24)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v && v.length > 0 ? JSON.stringify(v) : null)),
  sortOrder: sortOrder.optional(),
});

// A topic needs something to show: content, or items for a steps/cards layout.
function topicProblem(t: { body?: string | null; layout?: string; items?: string | null }) {
  const hasItems = t.layout !== undefined && t.layout !== "text" && !!t.items;
  return !t.body && !hasItems ? "Add some content, or items for the steps/cards layout." : null;
}

export const createTopicSchema = topicFields.superRefine((t, ctx) => {
  const problem = topicProblem(t);
  if (problem) ctx.addIssue({ code: "custom", path: ["body"], message: problem });
});
export const updateTopicSchema = topicFields.partial();
export { topicProblem };

const faqFields = z.object({
  question: z.string().trim().min(5).max(255),
  answer: richText,
  sortOrder: sortOrder.optional(),
  isPublished: z.boolean().optional(),
});
export const createFaqSchema = faqFields.refine((f) => !!f.answer, { message: "Add the answer.", path: ["answer"] });
export const updateFaqSchema = faqFields.partial();
