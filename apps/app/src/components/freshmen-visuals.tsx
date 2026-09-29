import { useEffect, useState } from "react"
import type { ComponentType, ReactNode, SVGProps } from "react"
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react"
import type { Variants } from "motion/react"
import { Check, ChevronDown, CircleHelp } from "lucide-react"
import { cn } from "#/lib/utils"
import { asset } from "#/lib/asset"
import type { TopicItem } from "#/lib/freshmen"
import { freshmenIcon } from "#/components/freshmen-icons"

// Illustrations, infographics and animated pieces for the Freshmen guide
// (routes/_web/freshmen.tsx). Everything is drawn in code with theme colours,
// and all motion respects the viewer's reduced-motion setting (MotionConfig
// on the page).

type Icon = ComponentType<SVGProps<SVGSVGElement>>

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
}

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

// Fades and lifts its children in the first time they scroll into view.
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  )
}

// ---- Reading progress --------------------------------------------------------

export function ReadingProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, restDelta: 0.001 })
  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="fixed inset-x-0 top-14 z-30 h-1 origin-left bg-gradient-to-r from-primary via-amber-400 to-primary md:top-16"
    />
  )
}

// ---- Hero illustration -------------------------------------------------------

const WINDOWS = Array.from({ length: 12 }, (_, i) => ({ col: i % 4, row: Math.floor(i / 4) }))

export function HallIllustration() {
  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-md">
      <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label="Illustration of Kwame Nkrumah Hall">
        <defs>
          <linearGradient id="fg-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="fg-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f3ede7" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="160" r="140" fill="url(#fg-sky)" />
        {/* Sun */}
        <motion.circle
          cx="318"
          cy="70"
          r="22"
          className="fill-amber-300"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "318px 70px" }}
        />
        {/* Clouds */}
        <motion.g
          className="fill-white"
          animate={{ x: [0, 18, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        >
          <ellipse cx="90" cy="72" rx="26" ry="10" />
          <ellipse cx="108" cy="64" rx="18" ry="10" />
        </motion.g>
        {/* Ground */}
        <ellipse cx="200" cy="262" rx="170" ry="14" className="fill-primary/15" />
        {/* Building */}
        <rect x="110" y="110" width="180" height="150" rx="6" fill="url(#fg-wall)" className="stroke-foreground/15" strokeWidth="2" />
        <rect x="100" y="100" width="200" height="16" rx="4" className="fill-foreground" />
        <rect x="170" y="80" width="60" height="24" rx="4" className="fill-primary" />
        <text x="200" y="97" textAnchor="middle" className="fill-white text-[11px] font-bold tracking-widest">
          KNH
        </text>
        {WINDOWS.map(({ col, row }, i) => (
          <motion.rect
            key={i}
            x={128 + col * 40}
            y={130 + row * 34}
            width="24"
            height="20"
            rx="3"
            className="fill-amber-200 stroke-foreground/20"
            strokeWidth="1.5"
            initial={{ opacity: 0.25 }}
            animate={{ opacity: [0.25, 1, 1, 0.25] }}
            transition={{ duration: 6, repeat: Infinity, delay: (i * 0.37) % 4, times: [0, 0.15, 0.7, 1] }}
          />
        ))}
        <rect x="186" y="222" width="28" height="38" rx="4" className="fill-primary" />
        <circle cx="208" cy="242" r="2" className="fill-white" />
        {/* Trees */}
        {[70, 330].map((x) => (
          <g key={x}>
            <rect x={x - 3} y="222" width="6" height="38" rx="2" className="fill-amber-800/70" />
            <motion.circle
              cx={x}
              cy="212"
              r="22"
              className="fill-emerald-500/80"
              animate={{ rotate: [-2, 2, -2] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: `${x}px 250px` }}
            />
          </g>
        ))}
      </svg>

      {/* Floating cards */}
      <motion.div
        className="absolute top-[6%] -left-2 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg sm:-left-6"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Check className="size-4" />
        </span>
        <span className="text-xs leading-tight">
          <span className="block font-semibold text-foreground">Registered</span>
          <span className="text-muted-foreground">Room assigned</span>
        </span>
      </motion.div>
      <motion.div
        className="absolute -right-2 bottom-[18%] flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg sm:-right-6"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      >
        <img src={asset("logo.png")} alt="" className="size-7 object-contain" />
        <span className="text-xs leading-tight">
          <span className="block font-semibold text-foreground">Orientation</span>
          <span className="font-medium text-primary">Mandatory</span>
        </span>
      </motion.div>
    </div>
  )
}

// ---- Stats ---------------------------------------------------------------------

function CountUp({ to }: { to: number }) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      setValue(to)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900)
      setValue(Math.round(to * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [to])
  return <>{value}</>
}

export function GuideStats({ stats }: { stats: Array<{ value: number; label: string; icon: Icon }> }) {
  return (
    <motion.dl variants={stagger} className="grid grid-cols-3 gap-3">
      {stats.map(({ value, label, icon: StatIcon }) => (
        <motion.div
          key={label}
          variants={fadeUp}
          className="rounded-xl border border-border bg-card/80 px-3 py-3 text-center shadow-sm backdrop-blur"
        >
          <StatIcon className="mx-auto size-5 text-primary" aria-hidden="true" />
          <dd className="mt-1 text-2xl font-black text-foreground">
            <CountUp to={value} />
          </dd>
          <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        </motion.div>
      ))}
    </motion.dl>
  )
}

// ---- Journey infographic -----------------------------------------------------

export interface JourneyStage {
  anchor: string
  label: string
  detail: string | null
  icon: string
}

// One stage per guide, in order.
export function JourneyInfographic({ stages }: { stages: Array<JourneyStage> }) {
  if (stages.length === 0) return null
  return (
    <section aria-labelledby="journey-heading" className="mt-10">
      <h2 id="journey-heading" className="text-lg font-bold text-foreground">
        Your freshman journey
      </h2>
      <p className="text-sm text-muted-foreground">
        {stages.length} stage{stages.length === 1 ? "" : "s"} from admission to settling in. Tap a stage to jump to it.
      </p>
      <motion.ol
        className={cn(
          "relative mt-6 grid gap-4 sm:grid-cols-2",
          stages.length >= 3 && "md:grid-cols-3",
          stages.length >= 4 && "lg:grid-cols-4",
          stages.length >= 5 && "xl:grid-cols-5",
        )}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
      >
        {/* Connecting line (wide screens) */}
        <motion.span
          aria-hidden="true"
          className="absolute top-7 right-[10%] left-[10%] hidden h-0.5 origin-left bg-gradient-to-r from-primary/60 via-primary to-primary/60 lg:block"
          variants={{ hidden: { scaleX: 0 }, visible: { scaleX: 1, transition: { duration: 1.2, ease: "easeInOut" } } }}
        />
        {stages.map((stage, i) => {
          const StageIcon = freshmenIcon(stage.icon)
          return (
          <motion.li key={stage.anchor} variants={fadeUp} className="relative">
            <a href={`#${stage.anchor}`} className="group flex flex-col items-center text-center">
              <span className="relative flex size-14 items-center justify-center rounded-2xl bg-card text-primary shadow-md ring-1 ring-border transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-primary group-hover:text-white group-hover:shadow-lg">
                <StageIcon className="size-6" aria-hidden="true" />
                <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-foreground text-[0.65rem] font-bold text-background">
                  {i + 1}
                </span>
              </span>
              <span className="mt-3 text-sm font-semibold text-foreground group-hover:text-primary">{stage.label}</span>
              {stage.detail && (
                <span className="line-clamp-2 max-w-48 text-xs text-muted-foreground">{stage.detail}</span>
              )}
            </a>
          </motion.li>
          )
        })}
      </motion.ol>
    </section>
  )
}

// ---- Guide covers --------------------------------------------------------------

const COVER_GRADIENTS = [
  "from-amber-400 to-primary",
  "from-primary to-rose-500",
  "from-rose-500 to-primary",
  "from-primary to-amber-500",
]

// A banner for the top of each guide: gradient, pattern, number and icon.
export function GuideCover({
  guideId,
  index,
  title,
  summary,
  headingId,
  icon,
  imageUrl,
  dark = false,
}: {
  guideId: string
  index: number
  title: string
  summary?: string | null
  headingId: string
  icon: string
  imageUrl?: string | null
  dark?: boolean
}) {
  const CoverIcon = freshmenIcon(icon, CircleHelp)
  const gradient = dark ? "from-foreground to-primary" : COVER_GRADIENTS[index % COVER_GRADIENTS.length]
  return (
    <Reveal>
      <div className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-lg sm:p-8", gradient)}>
        {/* Optional cover photo, tinted so the text stays readable. */}
        {imageUrl && (
          <>
            <motion.img
              src={imageUrl}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
              initial={{ scale: 1.08 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-85", gradient)} />
          </>
        )}
        {/* Dotted pattern */}
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full opacity-20">
          <defs>
            <pattern id={`dots-${guideId}`} width="18" height="18" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#dots-${guideId})`} />
        </svg>
        <span
          aria-hidden="true"
          className="absolute -right-2 -bottom-8 text-[7rem] leading-none font-black text-white/15 select-none sm:text-[9rem]"
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="relative flex items-start gap-4">
          <motion.span
            className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 backdrop-blur sm:size-14"
            initial={{ rotate: -12, scale: 0.8 }}
            whileInView={{ rotate: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 14 }}
          >
            <CoverIcon className="size-6 sm:size-7" aria-hidden="true" />
          </motion.span>
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-widest text-white/80 uppercase">Guide {index + 1}</p>
            <h2 id={headingId} className="mt-0.5 text-2xl font-bold sm:text-3xl">
              {title}
            </h2>
            {summary && <p className="mt-1 max-w-xl text-white/90">{summary}</p>}
          </div>
        </div>
      </div>
    </Reveal>
  )
}

// ---- Icon cards ----------------------------------------------------------------

export function IconCards({ items }: { items: Array<TopicItem> }) {
  return (
    <motion.ul
      className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={stagger}
    >
      {items.map((item, i) => {
        const ItemIcon = freshmenIcon(item.icon)
        return (
        <motion.li
          key={i}
          variants={fadeUp}
          whileHover={{ y: -4 }}
          className="group rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
            <ItemIcon className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-2 text-sm font-semibold text-foreground">{item.title}</p>
          {item.note && <p className="text-xs leading-snug text-muted-foreground">{item.note}</p>}
        </motion.li>
        )
      })}
    </motion.ul>
  )
}

// ---- Animated steps -------------------------------------------------------------

export function AnimatedSteps({ items }: { items: Array<TopicItem> }) {
  return (
    <motion.ol
      className="relative mt-4 flex flex-col gap-4"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={stagger}
    >
      <motion.span
        aria-hidden="true"
        className="absolute top-3 bottom-3 left-[15px] w-0.5 origin-top bg-primary/25"
        variants={{ hidden: { scaleY: 0 }, visible: { scaleY: 1, transition: { duration: 0.9, ease: "easeInOut" } } }}
      />
      {items.map((item, i) => (
        <motion.li key={i} variants={fadeUp} className="relative flex gap-4">
          <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-md ring-4 ring-background">
            {i + 1}
          </span>
          <span className="rounded-lg border border-border bg-card px-4 py-2.5 shadow-sm">
            <span className="block text-foreground">{item.title}</span>
            {item.note && <span className="block text-sm text-muted-foreground">{item.note}</span>}
          </span>
        </motion.li>
      ))}
    </motion.ol>
  )
}

// ---- Mandatory checklist tracker ----------------------------------------------

const CHECKLIST_KEY = "knh-freshmen-checklist"

function ProgressRing({ value, total }: { value: number; total: number }) {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const pct = total === 0 ? 0 : value / total
  return (
    <div className="relative size-24 shrink-0">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <circle cx="40" cy="40" r={radius} className="fill-none stroke-secondary" strokeWidth="8" />
        <motion.circle
          cx="40"
          cy="40"
          r={radius}
          className="fill-none stroke-primary"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ type: "spring", stiffness: 90, damping: 18 }}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black text-foreground">
          {value}/{total}
        </span>
        <span className="text-[0.65rem] font-medium text-muted-foreground uppercase">done</span>
      </span>
    </div>
  )
}

// Ticks are remembered in this browser only; nothing is sent anywhere.
export function MandatoryChecklist({ items }: { items: Array<{ id: string; title: string }> }) {
  const [done, setDone] = useState<Array<string>>([])
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? "[]") as unknown
      if (Array.isArray(saved)) setDone(saved.filter((v): v is string => typeof v === "string"))
    } catch {
      // Storage unavailable: start unticked.
    }
  }, [])
  const toggle = (id: string) => {
    setDone((prev) => {
      const next = prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
      try {
        localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next))
      } catch {
        // Ignore: ticks just won't persist.
      }
      return next
    })
  }
  const count = items.filter((i) => done.includes(i.id)).length
  const complete = count === items.length && items.length > 0

  return (
    <section
      aria-labelledby="mandatory-heading"
      className="relative mt-10 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <ProgressRing value={count} total={items.length} />
        <div className="min-w-0 flex-1">
          <h2 id="mandatory-heading" className="text-lg font-bold text-foreground">
            Mandatory checklist
          </h2>
          <p className="text-sm text-muted-foreground">
            Every freshman must complete these. Tick them off as you go; your progress is saved on this device.
          </p>
          <AnimatePresence>
            {complete && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 text-sm font-semibold text-emerald-600"
              >
                All done. Welcome to Kwame Nkrumah Hall!
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {items.map((item) => {
          const checked = done.includes(item.id)
          return (
            <li key={item.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                aria-label={`Mark "${item.title}" as done`}
                onClick={() => toggle(item.id)}
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                  checked ? "border-primary bg-primary text-white" : "border-input hover:border-primary",
                )}
              >
                <AnimatePresence>
                  {checked && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Check className="size-3.5" strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              <a
                href={`#${item.id}`}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  checked ? "text-muted-foreground line-through" : "text-foreground",
                )}
              >
                {item.title}
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ---- People --------------------------------------------------------------------

export interface Person {
  id: number
  name: string
  title: string
  photo_url: string | null
}

function initials(name: string) {
  return name
    .replace(/^(Dr|Prof|Mr|Mrs|Ms|Chief)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")
}

export function Avatar({ person, className }: { person: Person; className?: string }) {
  return person.photo_url ? (
    <img
      src={person.photo_url}
      alt=""
      loading="lazy"
      className={cn("size-12 shrink-0 rounded-full object-cover ring-2 ring-background", className)}
    />
  ) : (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-amber-500 font-bold text-white ring-2 ring-background",
        className,
      )}
    >
      {initials(person.name)}
    </span>
  )
}

export function AvatarStack({ people, label }: { people: Array<Person>; label: string }) {
  if (people.length === 0) return null
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-3">
        {people.slice(0, 5).map((p, i) => (
          <motion.span
            key={p.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.08 }}
            title={`${p.name}, ${p.title}`}
          >
            <Avatar person={p} className="size-10 text-xs" />
          </motion.span>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

export function PeopleGrid({ people }: { people: Array<Person> }) {
  if (people.length === 0) return null
  return (
    <motion.ul
      className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={stagger}
    >
      {people.map((p) => (
        <motion.li
          key={p.id}
          variants={fadeUp}
          whileHover={{ y: -4 }}
          className="flex flex-col items-center rounded-xl border border-border bg-card p-4 text-center shadow-sm transition-shadow hover:shadow-md"
        >
          <Avatar person={p} className="size-16 text-lg" />
          <p className="mt-2 text-sm leading-tight font-semibold text-foreground">{p.name}</p>
          <p className="text-xs text-primary">{p.title}</p>
        </motion.li>
      ))}
    </motion.ul>
  )
}

// ---- FAQ accordion --------------------------------------------------------------

export function FaqItem({ question, children }: { question: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="px-5 py-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 text-left font-medium text-foreground transition-colors hover:text-primary"
      >
        {question}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-2 text-muted-foreground">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
