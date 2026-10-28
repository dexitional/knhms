// <head> tags for the public article pages: title, description, canonical
// URL, Open Graph / Twitter cards and schema.org JSON-LD (NewsArticle or
// Event). Client-safe -- route head() runs on both server and client.
import type { HubPostRow } from "@knh/db";
import { asset } from "#/lib/asset";
import { ARTICLE_SECTIONS, SITE_NAME, SITE_TAGLINE, postPath, summaryOf } from "#/lib/posts";
import type { ArticleType } from "#/lib/posts";

type Meta = Record<string, string>;

const absolute = (siteUrl: string, src: string) => (/^https?:\/\//.test(src) ? src : `${siteUrl}${asset(src)}`);
const logoUrl = (siteUrl: string) => absolute(siteUrl, "logo.png");

// JSON-LD inside <script>: escape "<" so text can never close the tag.
const jsonLd = (data: unknown) => ({ type: "application/ld+json", children: JSON.stringify(data).replace(/</g, "\\u003c") });

function shared({ title, description, url, image, siteUrl, type }: { title: string; description: string; url: string; image?: string | null; siteUrl: string; type: string }): Array<Meta> {
  const img = image ? absolute(siteUrl, image) : logoUrl(siteUrl);
  return [
    { title: `${title} | ${SITE_NAME}` },
    { name: "description", content: description },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:type", content: type },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: img },
    { property: "og:image:alt", content: title },
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: img },
  ];
}

const publisher = (siteUrl: string) => ({
  "@type": "Organization",
  name: SITE_NAME,
  slogan: SITE_TAGLINE,
  url: siteUrl,
  logo: { "@type": "ImageObject", url: logoUrl(siteUrl) },
});

// Home: site name + organisation, so search engines show the hall's name and
// crest for the site.
export function homeHead(siteUrl: string) {
  const description = `${SITE_NAME}, University of Cape Coast: hall news, announcements, events, the Freshers guide, hall leadership and alumni. ${SITE_TAGLINE}.`;
  return {
    meta: [
      ...shared({ title: SITE_NAME, description, url: `${siteUrl}/`, siteUrl, type: "website" }).slice(1),
      { title: `${SITE_NAME} | ${SITE_TAGLINE}` },
    ],
    links: [{ rel: "canonical", href: `${siteUrl}/` }],
    scripts: [
      jsonLd({ "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: `${siteUrl}/` }),
      jsonLd({
        "@context": "https://schema.org",
        ...publisher(siteUrl),
        "@type": "CollegeOrUniversity",
        parentOrganization: { "@type": "CollegeOrUniversity", name: "University of Cape Coast", url: "https://ucc.edu.gh" },
      }),
    ],
  };
}

// Any other public page: hall pages, Alumni, Yellow Pages, Freshers guide.
// `structured` adds a page-specific JSON-LD block (e.g. an ItemList).
export function pageHead({
  title,
  description,
  path,
  siteUrl,
  image,
  structured,
}: {
  title: string;
  description: string;
  path: string;
  siteUrl: string;
  image?: string | null;
  structured?: Record<string, unknown>;
}) {
  const url = `${siteUrl}${path}`;
  return {
    meta: shared({ title, description, url, image, siteUrl, type: "website" }),
    links: [{ rel: "canonical", href: url }],
    scripts: [
      jsonLd({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        description,
        url,
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: siteUrl },
        breadcrumb: breadcrumbs(siteUrl, [{ name: title, url }]),
      }),
      ...(structured ? [jsonLd({ "@context": "https://schema.org", ...structured })] : []),
    ],
  };
}

// A list page: /news, /announcements, /events (page 2+ is its own URL).
export function listHead(type: ArticleType, siteUrl: string, page = 1) {
  const section = ARTICLE_SECTIONS[type];
  const path = page > 1 ? `${section.path}?page=${page}` : section.path;
  const url = `${siteUrl}${path}`;
  const title = page > 1 ? `${section.title} (page ${page})` : section.title;
  return {
    meta: shared({ title, description: section.intro, url, siteUrl, type: "website" }),
    links: [{ rel: "canonical", href: url }],
    scripts: [
      jsonLd({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        description: section.intro,
        url,
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: siteUrl },
        breadcrumb: breadcrumbs(siteUrl, [{ name: section.label, url: `${siteUrl}${section.path}` }]),
      }),
    ],
  };
}

function breadcrumbs(siteUrl: string, trail: Array<{ name: string; url: string }>) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", url: siteUrl }, ...trail].map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

// One article page.
export function articleHead(post: HubPostRow, siteUrl: string) {
  const type = post.type as ArticleType;
  const section = ARTICLE_SECTIONS[type];
  const url = `${siteUrl}${postPath({ id: post.id, title: post.title, type })}`;
  const description = summaryOf(post) || `${section.label} from ${SITE_NAME}.`;
  const image = post.image_url ? absolute(siteUrl, post.image_url) : logoUrl(siteUrl);
  const modified = post.updated_at.replace(" ", "T");
  const crumbs = breadcrumbs(siteUrl, [
    { name: section.label, url: `${siteUrl}${section.path}` },
    { name: post.title, url },
  ]);

  const meta = shared({ title: post.title, description, url, image: post.image_url, siteUrl, type: type === "event" ? "website" : "article" });
  if (type !== "event") {
    meta.push({ property: "article:published_time", content: post.published_on.slice(0, 10) });
    meta.push({ property: "article:modified_time", content: modified });
    if (post.category) meta.push({ property: "article:section", content: post.category });
  }

  const structured =
    type === "event"
      ? {
          "@context": "https://schema.org",
          "@type": "Event",
          name: post.title,
          description,
          url,
          image: [image],
          startDate: post.event_start ?? post.published_on,
          ...(post.event_end && { endDate: post.event_end }),
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          location: { "@type": "Place", name: post.location || SITE_NAME, address: post.location || SITE_NAME },
          organizer: publisher(siteUrl),
        }
      : {
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: post.title.slice(0, 110),
          description,
          url,
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          image: [image],
          datePublished: post.published_on.slice(0, 10),
          dateModified: modified,
          ...(post.category && { articleSection: post.category }),
          author: publisher(siteUrl),
          publisher: publisher(siteUrl),
        };

  return {
    meta,
    links: [{ rel: "canonical", href: url }],
    scripts: [jsonLd(structured), jsonLd({ "@context": "https://schema.org", ...crumbs })],
  };
}
