// Public article pages for KNH Hub posts (managed in Admin → KNH Hub):
// /news, /announcements and /events list them, and each post is read at
// /<section>/<id>-<title-slug>. The id finds the post, so a renamed post
// keeps working -- its old slug redirects to the current one. Spotlights
// only feed the Home hero and have no page. Client-safe.

export type ArticleType = "news" | "announcement" | "event";

export const SITE_NAME = "Kwame Nkrumah Hall";
export const SITE_TAGLINE = "Leadership by Example";

export interface ArticleSection {
  type: ArticleType;
  path: "/news" | "/announcements" | "/events";
  label: string; // nav + breadcrumb
  title: string; // list page heading
  intro: string;
  empty: string;
}

export const ARTICLE_SECTIONS: Record<ArticleType, ArticleSection> = {
  news: {
    type: "news",
    path: "/news",
    label: "News",
    title: "Hall News",
    intro: "Stories, achievements and life in Kwame Nkrumah Hall.",
    empty: "No news has been published yet.",
  },
  announcement: {
    type: "announcement",
    path: "/announcements",
    label: "Announcements",
    title: "Announcements",
    intro: "Official notices and updates from the hall.",
    empty: "There are no announcements right now.",
  },
  event: {
    type: "event",
    path: "/events",
    label: "Events",
    title: "Hall Events",
    intro: "What's happening in and around the hall, and what has happened.",
    empty: "No events have been posted yet.",
  },
};

export const isArticleType = (type: string): type is ArticleType => type in ARTICLE_SECTIONS;

export function slugify(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

export const postSlug = (post: { id: number; title: string }) => {
  const slug = slugify(post.title);
  return slug ? `${post.id}-${slug}` : String(post.id);
};

// "16-freshers-orientation-week" → 16
export function postIdFromSlug(slug: string): number | null {
  const match = /^(\d+)(?:-|$)/.exec(slug);
  const id = match ? Number(match[1]) : NaN;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export const postPath = (post: { id: number; title: string; type: ArticleType }) =>
  `${ARTICLE_SECTIONS[post.type].path}/${postSlug(post)}`;

// Absolute site URL (APP_URL), without a trailing slash.
export const siteOrigin = (url: string | undefined) => (url || "http://localhost:3000").replace(/\/+$/, "");

// Plain text from the sanitised HTML body, for descriptions.
export function plainText(html: string | null | undefined) {
  return (html ?? "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function summaryOf(post: { excerpt: string | null; body: string | null }, max = 160) {
  const text = post.excerpt?.trim() || plainText(post.body);
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20))}…`;
}

// "2026-08-06" → "Aug 06, 2026"
export function formatPostDate(date: string) {
  return new Date(`${date.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

// "Oct 1, 2026", "Oct 1 – 7, 2026", "Oct 28 – Nov 2, 2026", or
// "Dec 30, 2026 – Jan 2, 2027"
export function formatEventDates(start: string, end: string | null) {
  const parts = (v: string) => {
    const d = new Date(`${v.slice(0, 10)}T00:00:00Z`);
    return {
      month: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
      day: d.getUTCDate(),
      year: d.getUTCFullYear(),
    };
  };
  const a = parts(start);
  if (!end || end === start) return `${a.month} ${a.day}, ${a.year}`;
  const b = parts(end);
  if (a.year !== b.year) return `${a.month} ${a.day}, ${a.year} – ${b.month} ${b.day}, ${b.year}`;
  if (a.month !== b.month) return `${a.month} ${a.day} – ${b.month} ${b.day}, ${b.year}`;
  return `${a.month} ${a.day} – ${b.day}, ${b.year}`;
}
