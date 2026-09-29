import sanitizeHtml from "sanitize-html";

// Rich-text content (KNH Hub posts) is stored as HTML produced by the admin
// editor. Everything is passed through this allowlist on save AND on read,
// so the public page can render it directly: no scripts, styles, event
// handlers, iframes, or non-http(s) URLs ever get through.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s",
    "blockquote", "ul", "ol", "li", "a", "img", "hr", "code", "pre",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  // Images must be absolute http(s) URLs (uploaded to storage); anything
  // else would render broken, so drop the tag entirely.
  exclusiveFilter: (frame) => frame.tag === "img" && !/^https?:\/\//i.test(frame.attribs.src ?? ""),
  transformTags: {
    // External links open safely in a new tab; site links ("/register",
    // "#section") stay in the same tab.
    a: (tagName, attribs): sanitizeHtml.Tag => {
      const href = attribs.href ?? "";
      const internal = href.startsWith("/") && !href.startsWith("//");
      if (internal || href.startsWith("#")) return { tagName, attribs: { href } };
      return { tagName, attribs: { href, target: "_blank", rel: "noopener noreferrer nofollow" } };
    },
  },
};

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, OPTIONS).trim();
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Posts written before the rich-text editor are plain text: blank lines
// become paragraphs, single newlines become line breaks.
export function plainTextToHtml(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

// Normalises stored content (legacy plain text or editor HTML) to safe HTML.
export function toRichHtml(content: string | null): string | null {
  if (!content) return null;
  const html = /^\s*</.test(content) ? sanitizeRichText(content) : plainTextToHtml(content);
  return isRichTextEmpty(html) ? null : html;
}

// "<p></p>" from an emptied editor counts as no content; an image alone
// counts as content.
export function isRichTextEmpty(html: string): boolean {
  if (/<img\s/i.test(html)) return false;
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() === "";
}
