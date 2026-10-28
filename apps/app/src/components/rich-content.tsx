import { cn } from "#/lib/utils"

// Renders rich-text content from the API. The HTML is always sanitised on
// the server (server/api/lib/rich-text.ts) before it reaches the browser —
// never pass unsanitised HTML here.
// `size="article"` is the larger reading size used on article pages;
// everything else stays compact.
export function RichContent({ html, className, size = "sm" }: { html: string; className?: string; size?: "sm" | "article" }) {
  return (
    <div
      className={cn(
        size === "article" ? "prose prose-base md:prose-lg" : "prose prose-sm",
        "max-w-none text-foreground/85 prose-headings:font-bold prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground prose-img:rounded-lg",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
