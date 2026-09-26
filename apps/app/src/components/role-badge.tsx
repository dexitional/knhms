import { useState } from "react"

interface RoleBadgeProps {
  role: "super_admin" | "admin" | "staff"
  className?: string
}

function getColors(r: string) {
  switch (r) {
    case "super_admin":
      return { bg: "bg-background", border: "border-foreground", text: "text-foreground" }
    case "admin":
      return { bg: "bg-background", border: "border-foreground", text: "text-foreground" }
    default:
      return { bg: "bg-background", border: "border-foreground", text: "text-foreground" }
  }
}

export function RoleBadge({ role, className = "" }: RoleBadgeProps) {
  const [isActive, setIsActive] = useState(false)

  const colors = getColors(role)
  const labels: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    staff: "Staff",
  }

  return (
    <span className={className}>
      <button
        type="button"
        className={`relative inline-block rounded-[0.6rem] ${colors.border}`}
        onMouseDown={() => setIsActive(true)}
        onMouseUp={() => setIsActive(false)}
        onMouseLeave={() => setIsActive(false)}
        style={{ transform: isActive ? "translateY(0)" : "translateY(-1.5px)" }}
        disabled
      >
        <span
          className={`inline-block rounded-[0.6rem] border-2 ${colors.bg} ${colors.border} px-2 py-0.5 text-[11px] font-bold ${colors.text}`}
          style={{ transform: isActive ? "translateY(0)" : "translateY(-1.5px)" }}
        >
          {labels[role] ?? role}
        </span>
      </button>
    </span>
  )
}