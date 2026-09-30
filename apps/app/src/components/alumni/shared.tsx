import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { motion, useInView } from "motion/react"
import { asset } from "#/lib/asset"
import { cn } from "#/lib/utils"

// Shared building blocks for the Alumni page sections.

export const imageSrc = (url: string) => (/^https?:\/\//.test(url) ? url : asset(url))

export function initials(name: string) {
  return name
    .replace(/^(Dr|Prof|Mr|Mrs|Ms|Rev|Hon|Nana)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")
}

// "+233 (0) 24 …" → "+23324…"
export const telHref = (phone: string) => `tel:${phone.replace(/\(0\)/g, "").replace(/[^\d+]/g, "")}`

export function SectionHeading({
  eyebrow,
  title,
  lead,
  dark = false,
  className,
  children,
}: {
  eyebrow: string
  title: ReactNode
  lead?: ReactNode
  dark?: boolean
  className?: string
  children?: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn("mb-10 flex flex-wrap items-end justify-between gap-4", className)}
    >
      <div className="max-w-2xl">
        <p className={cn("text-xs font-semibold tracking-[0.2em] uppercase", dark ? "text-amber-300" : "text-primary")}>
          {eyebrow}
        </p>
        <h2
          className={cn(
            "mt-2 text-3xl leading-tight font-black tracking-tight text-balance md:text-5xl",
            dark ? "text-white" : "text-foreground",
          )}
        >
          {title}
        </h2>
        {lead && <p className={cn("mt-3 text-lg text-pretty", dark ? "text-white/65" : "text-muted-foreground")}>{lead}</p>}
      </div>
      {children}
    </motion.div>
  )
}

// Counts up from 0 the first time it scrolls into view.
export function CountUp({ value, format = (n) => n.toLocaleString() }: { value: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-40px" })
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (!inView) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1400)
      setShown(Math.round(value * (1 - Math.pow(1 - t, 4))))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, value])
  return <span ref={ref}>{format(shown)}</span>
}

// Photo, or initials on a warm gradient.
export function PersonImage({
  name,
  photoUrl,
  className,
  textClassName = "text-5xl",
}: {
  name: string
  photoUrl: string | null | undefined
  className?: string
  textClassName?: string
}) {
  return photoUrl ? (
    <img src={imageSrc(photoUrl)} alt={name} loading="lazy" className={cn("size-full object-cover object-top", className)} />
  ) : (
    <div
      className={cn(
        "flex size-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,var(--color-amber-300),var(--primary)_45%,#7c2d12)] font-black text-white/90",
        textClassName,
        className,
      )}
    >
      {initials(name)}
    </div>
  )
}

// Smooth-scrolls to an in-page section (respecting reduced motion).
export function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
}
