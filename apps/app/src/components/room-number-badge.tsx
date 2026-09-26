import { useState } from "react"

interface RoomNumberBadgeProps {
  roomNumber: string
  occupied?: number
  capacity?: number
  className?: string
}

export function RoomNumberBadge({
  roomNumber,
  occupied = 0,
  capacity = 0,
  className = "",
}: RoomNumberBadgeProps) {
  const [isActive, setIsActive] = useState(false)

  const isFull = occupied > 0 && occupied >= capacity
  const isPartial = occupied > 0 && occupied < capacity

  const baseColor = isFull
    ? "success"
    : isPartial
    ? "warning"
    : "foreground"

  const getColors = (color: string) => {
    switch (color) {
      case "success":
        return { bg: "bg-success/10", border: "border-success", text: "text-success" }
      case "warning":
        return { bg: "bg-warning/10", border: "border-warning", text: "text-warning" }
      default:
        return { bg: "bg-background", border: "border-foreground", text: "text-foreground" }
    }
  }

  const colors = getColors(baseColor)

  return (
    <span className={className}>
      <button
        type="button"
        className={`relative inline-block rounded-[0.6rem] ${colors.border}`}
        onMouseDown={() => setIsActive(true)}
        onMouseUp={() => setIsActive(false)}
        onMouseLeave={() => setIsActive(false)}
        style={{ transform: isActive ? "translateY(0)" : "translateY(-1.5px)" }}
      >
        <span
          className={`inline-block rounded-[0.6rem] border-2 ${colors.bg} ${colors.border} px-2.5 py-1 text-sm font-bold ${colors.text}`}
          style={{ transform: isActive ? "translateY(0)" : "translateY(-1.5px)" }}
        >
          {roomNumber}
        </span>
      </button>
    </span>
  )
}