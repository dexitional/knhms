import { useState } from "react"

interface BlockBadgeProps {
  block: string | null
  className?: string
}

export function BlockBadge({ block, className = "" }: BlockBadgeProps) {
  if (!block) return <span className={className}>—</span>

  const [isActive, setIsActive] = useState(false)

  return (
    <span className={className}>
      <div className="inline-flex">
        <div className="bg-gradient-to-b from-foreground/20 via-foreground/10 to-transparent p-[2px] rounded-[8px]">
          <button
            type="button"
            className="relative p-[2px] rounded-[6px] bg-gradient-to-b from-background to-secondary/60 shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-all duration-100"
            style={{
              transform: isActive ? "scale(0.995)" : "scale(1)",
              boxShadow: isActive
                ? "0 0 1px rgba(0,0,0,0.5)"
                : "0 1px 3px rgba(0,0,0,0.4)",
            }}
            onMouseDown={() => setIsActive(true)}
            onMouseUp={() => setIsActive(false)}
            onMouseLeave={() => setIsActive(false)}
          >
            <div className="bg-gradient-to-b from-secondary/60 to-background/80 rounded-[4px] px-1.5 py-0 text-[11px] font-semibold text-foreground">
              {block}
            </div>
          </button>
        </div>
      </div>
    </span>
  )
}