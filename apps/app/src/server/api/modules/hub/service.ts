import { getPool } from "@knh/db";
import type { HubPostRow, HubPostType } from "@knh/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { z } from "zod";
import { insertSql, toColumns, updateSql } from "../../lib/columns.js";
import { toRichHtml } from "../../lib/rich-text.js";
import { AppError } from "../../middleware/error-handler.js";
import { hubPostProblems } from "./schema.js";
import type { createHubPostSchema, updateHubPostSchema } from "./schema.js";

type CreateInput = z.infer<typeof createHubPostSchema>;
type UpdateInput = z.infer<typeof updateHubPostSchema>;

const FIELDS: Record<string, string> = {
  type: "type",
  title: "title",
  excerpt: "excerpt",
  body: "body",
  category: "category",
  categoryUrl: "category_url",
  linkUrl: "link_url",
  imageUrl: "image_url",
  publishedOn: "published_on",
  eventStart: "event_start",
  eventEnd: "event_end",
  eventTime: "event_time",
  location: "location",
  isFeatured: "is_featured",
  isPublished: "is_published",
  sortOrder: "sort_order",
};

// Content is always returned as safe HTML (see lib/rich-text.ts).
function withRichBody(row: HubPostRow): HubPostRow {
  return { ...row, body: toRichHtml(row.body) };
}

// How many of each type the public page shows.
const PUBLIC_LIMITS = { spotlight: 5, announcement: 6, news: 12 } as const;

// ---- Public ---------------------------------------------------------------

// Posts in the "Alumni" category appear on the Alumni page, not the KNH Hub.
const NOT_ALUMNI = "(category IS NULL OR LOWER(TRIM(category)) <> 'alumni')";
const IS_ALUMNI = "LOWER(TRIM(category)) = 'alumni'";

export async function getPublicHub() {
  const pool = getPool();
  const byType = (type: HubPostType, limit: number) =>
    pool
      .query<(HubPostRow & RowDataPacket)[]>(
        `SELECT * FROM hub_posts WHERE type = ? AND is_published = 1 AND ${NOT_ALUMNI}
         ORDER BY sort_order, published_on DESC, id DESC LIMIT ?`,
        [type, limit],
      )
      .then(([rows]) => rows.map((r) => withRichBody({ ...r })));

  // Upcoming (or still running) events, soonest first.
  const eventsQuery = pool
    .query<(HubPostRow & RowDataPacket)[]>(
      `SELECT * FROM hub_posts
       WHERE type = 'event' AND is_published = 1 AND COALESCE(event_end, event_start) >= CURDATE() AND ${NOT_ALUMNI}
       ORDER BY event_start, sort_order, id`,
    )
    .then(([rows]) => rows.map((r) => withRichBody({ ...r })));

  const [spotlights, announcements, news, events] = await Promise.all([
    byType("spotlight", PUBLIC_LIMITS.spotlight),
    byType("announcement", PUBLIC_LIMITS.announcement),
    byType("news", PUBLIC_LIMITS.news),
    eventsQuery,
  ]);
  return { spotlights, announcements, news, events };
}

// The Alumni page's feed: published "Alumni" announcements (latest first)
// and upcoming "Alumni" events (soonest first), managed in Admin → KNH Hub.
export async function getAlumniHubPosts() {
  const pool = getPool();
  const [[announcements], [events]] = await Promise.all([
    pool.query<(HubPostRow & RowDataPacket)[]>(
      `SELECT * FROM hub_posts WHERE type = 'announcement' AND is_published = 1 AND ${IS_ALUMNI}
       ORDER BY sort_order, published_on DESC, id DESC LIMIT ?`,
      [PUBLIC_LIMITS.announcement],
    ),
    pool.query<(HubPostRow & RowDataPacket)[]>(
      `SELECT * FROM hub_posts
       WHERE type = 'event' AND is_published = 1 AND COALESCE(event_end, event_start) >= CURDATE() AND ${IS_ALUMNI}
       ORDER BY event_start, sort_order, id`,
    ),
  ]);
  return {
    announcements: announcements.map((r) => withRichBody({ ...r })),
    events: events.map((r) => withRichBody({ ...r })),
  };
}

// ---- Admin -----------------------------------------------------------------

export async function listPosts(type?: HubPostType) {
  const [rows] = await getPool().query<(HubPostRow & RowDataPacket)[]>(
    `SELECT * FROM hub_posts ${type ? "WHERE type = ?" : ""}
     ORDER BY type, is_published DESC, sort_order, published_on DESC, id DESC`,
    type ? [type] : [],
  );
  return rows.map((r) => withRichBody({ ...r }));
}

async function getPost(id: number) {
  const [rows] = await getPool().execute<(HubPostRow & RowDataPacket)[]>("SELECT * FROM hub_posts WHERE id = ?", [
    id,
  ]);
  if (!rows[0]) throw new AppError("Post not found.", 404);
  return withRichBody({ ...rows[0] });
}

export async function createPost(adminId: number, input: CreateInput) {
  const { columns, params } = toColumns(input, FIELDS);
  const [result] = await getPool().execute<ResultSetHeader>(insertSql("hub_posts", [...columns, "created_by"]), [
    ...params,
    adminId,
  ]);
  return getPost(result.insertId);
}

// Re-checks the type's required fields against the merged post, so a PATCH
// can't blank out something the page needs.
export async function updatePost(id: number, input: UpdateInput) {
  const current = await getPost(id);
  const merged = {
    type: current.type,
    excerpt: input.excerpt === undefined ? current.excerpt : input.excerpt,
    body: input.body === undefined ? current.body : input.body,
    category: input.category === undefined ? current.category : input.category,
    eventStart: input.eventStart === undefined ? current.event_start : input.eventStart,
    eventEnd: input.eventEnd === undefined ? current.event_end : input.eventEnd,
  };
  const problem = hubPostProblems(merged)[0];
  if (problem) throw new AppError(problem.message, 422);

  const { columns, params } = toColumns(input, FIELDS);
  if (columns.length > 0) {
    await getPool().execute(updateSql("hub_posts", columns), [...params, id]);
  }
  return getPost(id);
}

export async function deletePost(id: number) {
  const [result] = await getPool().execute<ResultSetHeader>("DELETE FROM hub_posts WHERE id = ?", [id]);
  if (result.affectedRows === 0) throw new AppError("Post not found.", 404);
}
