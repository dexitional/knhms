import { getPool } from "@knh/db";
import type { FreshmenFaqRow, FreshmenGuideRow, FreshmenSectionRow, FreshmenTopicRow } from "@knh/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { z } from "zod";
import type { FreshmenContent, FreshmenFaq, FreshmenGuide, FreshmenSection, FreshmenTopic } from "#/lib/freshmen";
import { insertSql, toColumns, updateSql } from "../../lib/columns.js";
import { toRichHtml } from "../../lib/rich-text.js";
import { AppError } from "../../middleware/error-handler.js";
import { topicProblem } from "./schema.js";
import type {
  createFaqSchema,
  createGuideSchema,
  createSectionSchema,
  createTopicSchema,
  updateFaqSchema,
  updateGuideSchema,
  updateSectionSchema,
  updateTopicSchema,
} from "./schema.js";

const GUIDE_FIELDS: Record<string, string> = {
  title: "title",
  summary: "summary",
  icon: "icon",
  imageUrl: "image_url",
  sortOrder: "sort_order",
  isPublished: "is_published",
};
const SECTION_FIELDS: Record<string, string> = {
  guideId: "guide_id",
  title: "title",
  intro: "intro",
  imageUrl: "image_url",
  isMandatory: "is_mandatory",
  sortOrder: "sort_order",
  isPublished: "is_published",
};
const TOPIC_FIELDS: Record<string, string> = {
  sectionId: "section_id",
  title: "title",
  body: "body",
  layout: "layout",
  items: "items",
  sortOrder: "sort_order",
};
const FAQ_FIELDS: Record<string, string> = {
  question: "question",
  answer: "answer",
  sortOrder: "sort_order",
  isPublished: "is_published",
};

const ORDER = "ORDER BY sort_order, id";

// Rich text is always returned as safe HTML (see lib/rich-text.ts).
function toTopic(row: FreshmenTopicRow): FreshmenTopic {
  const items = typeof row.items === "string" ? (JSON.parse(row.items) as FreshmenTopicRow["items"]) : row.items;
  return {
    id: row.id,
    section_id: row.section_id,
    title: row.title,
    body: toRichHtml(row.body),
    layout: row.layout,
    items: Array.isArray(items) ? items : null,
    sort_order: row.sort_order,
  };
}

function toSection(row: FreshmenSectionRow, topics: Array<FreshmenTopic>): FreshmenSection {
  return {
    id: row.id,
    guide_id: row.guide_id,
    title: row.title,
    intro: toRichHtml(row.intro),
    image_url: row.image_url,
    is_mandatory: row.is_mandatory,
    sort_order: row.sort_order,
    is_published: row.is_published,
    topics,
  };
}

function toFaq(row: FreshmenFaqRow): FreshmenFaq {
  return {
    id: row.id,
    question: row.question,
    answer: toRichHtml(row.answer) ?? "",
    sort_order: row.sort_order,
    is_published: row.is_published,
  };
}

// Everything, nested. The public page only gets published guides, sections
// and FAQs.
async function loadContent(publishedOnly: boolean): Promise<FreshmenContent> {
  const pool = getPool();
  const where = publishedOnly ? "WHERE is_published = 1" : "";
  const [[guides], [sections], [topics], [faqs]] = await Promise.all([
    pool.query<(FreshmenGuideRow & RowDataPacket)[]>(`SELECT * FROM freshmen_guides ${where} ${ORDER}`),
    pool.query<(FreshmenSectionRow & RowDataPacket)[]>(`SELECT * FROM freshmen_sections ${where} ${ORDER}`),
    pool.query<(FreshmenTopicRow & RowDataPacket)[]>(`SELECT * FROM freshmen_topics ${ORDER}`),
    pool.query<(FreshmenFaqRow & RowDataPacket)[]>(`SELECT * FROM freshmen_faqs ${where} ${ORDER}`),
  ]);

  const topicsBySection = new Map<number, Array<FreshmenTopic>>();
  for (const t of topics) {
    const list = topicsBySection.get(t.section_id) ?? [];
    list.push(toTopic(t));
    topicsBySection.set(t.section_id, list);
  }
  const sectionsByGuide = new Map<number, Array<FreshmenSection>>();
  for (const s of sections) {
    const list = sectionsByGuide.get(s.guide_id) ?? [];
    list.push(toSection(s, topicsBySection.get(s.id) ?? []));
    sectionsByGuide.set(s.guide_id, list);
  }

  return {
    guides: guides.map(
      (g): FreshmenGuide => ({
        id: g.id,
        title: g.title,
        summary: g.summary,
        icon: g.icon,
        image_url: g.image_url,
        sort_order: g.sort_order,
        is_published: g.is_published,
        sections: sectionsByGuide.get(g.id) ?? [],
      }),
    ),
    faqs: faqs.map(toFaq),
  };
}

export const getPublicContent = () => loadContent(true);
export const getAllContent = () => loadContent(false);

async function assertExists(table: string, id: number, label: string) {
  const [rows] = await getPool().execute<RowDataPacket[]>(`SELECT id FROM ${table} WHERE id = ?`, [id]);
  if (!rows[0]) throw new AppError(`${label} not found.`, 404);
}

async function insert(table: string, input: object, fields: Record<string, string>) {
  const { columns, params } = toColumns(input, fields);
  const [result] = await getPool().execute<ResultSetHeader>(insertSql(table, columns), params);
  return result.insertId;
}

async function update(table: string, id: number, input: object, fields: Record<string, string>, label: string) {
  await assertExists(table, id, label);
  const { columns, params } = toColumns(input, fields);
  if (columns.length > 0) await getPool().execute(updateSql(table, columns), [...params, id]);
}

async function remove(table: string, id: number, label: string) {
  const [result] = await getPool().execute<ResultSetHeader>(`DELETE FROM ${table} WHERE id = ?`, [id]);
  if (result.affectedRows === 0) throw new AppError(`${label} not found.`, 404);
}

// ---- Guides (deleting one removes its sections and topics) -------------------

export async function createGuide(input: z.infer<typeof createGuideSchema>) {
  return { id: await insert("freshmen_guides", input, GUIDE_FIELDS) };
}
export async function updateGuide(id: number, input: z.infer<typeof updateGuideSchema>) {
  await update("freshmen_guides", id, input, GUIDE_FIELDS, "Guide");
}
export const deleteGuide = (id: number) => remove("freshmen_guides", id, "Guide");

// ---- Sections ------------------------------------------------------------------

export async function createSection(input: z.infer<typeof createSectionSchema>) {
  await assertExists("freshmen_guides", input.guideId, "Guide");
  return { id: await insert("freshmen_sections", input, SECTION_FIELDS) };
}
export async function updateSection(id: number, input: z.infer<typeof updateSectionSchema>) {
  if (input.guideId !== undefined) await assertExists("freshmen_guides", input.guideId, "Guide");
  await update("freshmen_sections", id, input, SECTION_FIELDS, "Section");
}
export const deleteSection = (id: number) => remove("freshmen_sections", id, "Section");

// ---- Topics ----------------------------------------------------------------------

export async function createTopic(input: z.infer<typeof createTopicSchema>) {
  await assertExists("freshmen_sections", input.sectionId, "Section");
  return { id: await insert("freshmen_topics", input, TOPIC_FIELDS) };
}

// Re-checks against the merged topic so a PATCH can't leave it empty.
export async function updateTopic(id: number, input: z.infer<typeof updateTopicSchema>) {
  const [rows] = await getPool().execute<(FreshmenTopicRow & RowDataPacket)[]>(
    "SELECT * FROM freshmen_topics WHERE id = ?",
    [id],
  );
  const current = rows[0];
  if (!current) throw new AppError("Topic not found.", 404);
  if (input.sectionId !== undefined) await assertExists("freshmen_sections", input.sectionId, "Section");
  const currentItems = toTopic(current).items;
  const problem = topicProblem({
    body: input.body === undefined ? current.body : input.body,
    layout: input.layout ?? current.layout,
    items: input.items === undefined ? (currentItems ? JSON.stringify(currentItems) : null) : input.items,
  });
  if (problem) throw new AppError(problem, 422);
  await update("freshmen_topics", id, input, TOPIC_FIELDS, "Topic");
}
export const deleteTopic = (id: number) => remove("freshmen_topics", id, "Topic");

// ---- FAQs ------------------------------------------------------------------------

export async function createFaq(input: z.infer<typeof createFaqSchema>) {
  return { id: await insert("freshmen_faqs", input, FAQ_FIELDS) };
}
export async function updateFaq(id: number, input: z.infer<typeof updateFaqSchema>) {
  if (input.answer === null) throw new AppError("Add the answer.", 422);
  await update("freshmen_faqs", id, input, FAQ_FIELDS, "FAQ");
}
export const deleteFaq = (id: number) => remove("freshmen_faqs", id, "FAQ");
