import { motion } from "motion/react"
import { ArrowRight, BookOpen, Building2, GraduationCap, HandHeart, Lightbulb, ShieldCheck, Sparkles, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { PROJECT_STATUS_LABELS, formatCedis } from "#/lib/alumni"
import type { AlumniProject } from "#/lib/alumni"
import { cn } from "#/lib/utils"
import { SectionHeading, imageSrc } from "./shared"

// Projects alumni lead or fund, as a bento grid. Funding progress comes from
// confirmed donations; "Support this project" pre-selects it in the donation
// form.

const CATEGORY_ICONS: Array<[RegExp, LucideIcon]> = [
  [/schol|educat|fee/i, GraduationCap],
  [/infra|build|renov|library/i, Building2],
  [/safe|secur|light/i, ShieldCheck],
  [/mentor|career/i, Users],
  [/book|study|academ/i, BookOpen],
  [/innov|tech/i, Lightbulb],
  [/charit|outreach|welfare/i, HandHeart],
]
const iconFor = (category: string | null) => CATEGORY_ICONS.find(([re]) => re.test(category ?? ""))?.[1] ?? Sparkles

const GRADIENTS = [
  "from-primary via-orange-500 to-amber-400",
  "from-[#1e1b4b] via-[#4338ca] to-[#7c3aed]",
  "from-emerald-600 via-teal-500 to-cyan-400",
  "from-rose-600 via-pink-500 to-orange-400",
]

const STATUS_STYLE = {
  planned: "bg-white/85 text-slate-700",
  ongoing: "bg-amber-300 text-amber-950",
  completed: "bg-emerald-400 text-emerald-950",
} as const

function ProjectCard({
  project,
  index,
  featured,
  onSupport,
}: {
  project: AlumniProject
  index: number
  featured: boolean
  onSupport: () => void
}) {
  const Icon = iconFor(project.category)
  const pct = project.goal_amount ? Math.min(100, (project.raised_amount / project.goal_amount) * 100) : null

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: (index % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group flex flex-col overflow-hidden rounded-[1.75rem] border border-black/5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.2)] transition-shadow duration-500 hover:shadow-[0_28px_60px_-24px_rgba(250,100,0,0.45)]",
        featured && "md:col-span-2 md:row-span-2",
      )}
    >
      <div className={cn("relative overflow-hidden", featured ? "aspect-[16/9] md:aspect-auto md:flex-1" : "aspect-[16/9]")}>
        {project.image_url ? (
          <img
            src={imageSrc(project.image_url)}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className={cn("relative size-full bg-gradient-to-br", GRADIENTS[index % GRADIENTS.length])}>
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:18px_18px]"
            />
            <Icon
              aria-hidden="true"
              className="absolute -right-6 -bottom-6 size-40 text-white/20 transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6"
            />
            <span className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-white/20 text-white ring-1 ring-white/30 backdrop-blur-md">
              <Icon className="size-8" />
            </span>
          </div>
        )}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          <span className={cn("rounded-full px-3 py-1 text-xs font-bold", STATUS_STYLE[project.status])}>
            {PROJECT_STATUS_LABELS[project.status]}
          </span>
          {project.category && (
            <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
              {project.category}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-6">
        <div>
          <h3 className={cn("leading-tight font-bold tracking-tight text-foreground", featured ? "text-2xl md:text-3xl" : "text-xl")}>
            {project.title}
          </h3>
          {project.summary && <p className="mt-2 text-sm text-pretty text-muted-foreground">{project.summary}</p>}
          {(project.led_by || project.year_label) && (
            <p className="mt-2 text-xs font-medium text-foreground/60">
              {[project.led_by, project.year_label].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {(pct !== null || project.raised_amount > 0) && (
          <div>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-bold text-foreground">{formatCedis(project.raised_amount)}</span>
              {project.goal_amount && (
                <span className="text-muted-foreground">
                  of {formatCedis(project.goal_amount)} · {Math.round(pct ?? 0)}%
                </span>
              )}
            </div>
            {pct !== null && (
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-amber-400"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                />
              </div>
            )}
            <p className="mt-1.5 text-xs text-muted-foreground">
              {project.donor_count} gift{project.donor_count === 1 ? "" : "s"}
            </p>
          </div>
        )}

        {project.status !== "completed" && (
          <button
            type="button"
            onClick={onSupport}
            className="group/btn inline-flex h-11 w-fit items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-white transition hover:bg-primary"
          >
            Support this project
            <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-1" />
          </button>
        )}
      </div>
    </motion.article>
  )
}

export function ProjectsSection({
  projects,
  onSupport,
}: {
  projects: Array<AlumniProject>
  onSupport: (projectId: number) => void
}) {
  if (projects.length === 0) return null
  return (
    <section id="projects" className="scroll-mt-28 bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Impact"
          title={
            <>
              Projects that <span className="text-primary">shape the hall</span>
            </>
          }
          lead="Led and funded by alumni: facilities, scholarships and programmes for today's residents."
        />
        <div className="grid auto-rows-auto gap-5 md:grid-cols-3">
          {projects.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} featured={i === 0 && projects.length > 2} onSupport={() => onSupport(p.id)} />
          ))}
        </div>
      </div>
    </section>
  )
}
