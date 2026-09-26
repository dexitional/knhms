import { cn } from "#/lib/utils.ts"

interface GenderBadgeProps {
  gender: "male" | "female" | "mixed"
  className?: string
}

export function GenderBadge({ gender, className = "" }: GenderBadgeProps) {
  const variants: Record<"male" | "female" | "mixed", string> = {
    male: "bg-primary/10 text-primary border-primary/20",
    female: "bg-primary/10 text-primary border-primary/20",
    mixed: "bg-secondary text-foreground border-border",
  }

  const labels: Record<"male" | "female" | "mixed", string> = {
    male: "Male",
    female: "Female",
    mixed: "Mixed",
  }

  const icons: Record<"male" | "female" | "mixed", string> = {
    male: "♂",
    female: "♀",
    mixed: "⚥",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[gender],
        className,
      )}
    >
      <span className="text-[11px]">{icons[gender]}</span>
      {labels[gender]}
    </span>
  )
}