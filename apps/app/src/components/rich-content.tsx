import { cn } from "#/lib/utils"

// Renders rich-text content from the API. The HTML is always sanitised on
// the server (server/api/lib/rich-text.ts) before it reaches the browser —
// never pass unsanitised HTML here.
export function RichContent({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none text-foreground/85 prose-headings:font-bold prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground prose-img:rounded-lg",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
