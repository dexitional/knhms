import { cn } from "#/lib/utils"

// A seller's uploaded logo, or their initials when they haven't added one.
export function SellerLogo({
  logoUrl,
  name,
  className,
}: {
  logoUrl: string | null
  name: string
  className?: string
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={cn("size-10 shrink-0 rounded-md border border-border bg-white object-contain", className)}
      />
    )
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("")
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary",
        className,
      )}
    >
      {initials}
    </span>
  )
}
