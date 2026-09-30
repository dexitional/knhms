import { useState } from "react"
import { motion } from "motion/react"
import { ArrowUpRight, CalendarDays, Clock, Megaphone, MapPin } from "lucide-react"
import type { HubPostRow } from "@knh/db"
import { RichContent } from "#/components/rich-content"
import { Dialog, DialogContent, DialogTitle } from "#/components/ui/dialog.tsx"
import { cn } from "#/lib/utils"
import { SectionHeading, imageSrc } from "./shared"

// Alumni events and announcements: KNH Hub posts in the "Alumni" category
// (Admin → KNH Hub), shown here instead of on the KNH Hub page.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const day = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00Z`)

// "Oct 1 – 7, 2026", "Sep 30 – Oct 2, 2026" or "Oct 1, 2026"
function eventDates(start: string, end: string | null) {
  const a = day(start)
  const b = end ? day(end) : null
  const fmt = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
  if (!b || b.getTime() === a.getTime()) return `${fmt(a)}, ${a.getUTCFullYear()}`
  if (a.getUTCFullYear() !== b.getUTCFullYear()) return `${fmt(a)}, ${a.getUTCFullYear()} – ${fmt(b)}, ${b.getUTCFullYear()}`
  if (a.getUTCMonth() === b.getUTCMonth()) return `${fmt(a)} – ${b.getUTCDate()}, ${b.getUTCFullYear()}`
  return `${fmt(a)} – ${fmt(b)}, ${b.getUTCFullYear()}`
}

function publishedLabel(d: string) {
  return day(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
}

function daysUntil(start: string) {
  const diff = Math.round((day(start).getTime() - day(new Date().toISOString()).getTime()) / 86_400_000)
  if (diff <= 0) return "Happening now"
  if (diff === 1) return "Tomorrow"
  return diff < 60 ? `In ${diff} days` : null
}

export function EventsSection({
  events,
  announcements,
}: {
  events: Array<HubPostRow>
  announcements: Array<HubPostRow>
}) {
  const [reading, setReading] = useState<HubPostRow | null>(null)
  if (events.length === 0 && announcements.length === 0) return null

  return (
    <section id="events" className="scroll-mt-28 bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="What's on"
          title="Events & announcements"
          lead="Reunions, homecomings and news for the KNH alumni family."
        />

        <div className={cn("grid gap-8", events.length > 0 && announcements.length > 0 && "lg:grid-cols-[3fr_2fr]")}>
          {events.length > 0 && (
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold tracking-widest text-muted-foreground uppercase">
                <CalendarDays className="size-4 text-primary" /> Upcoming events
              </h3>
              <ul className="flex flex-col gap-4">
                {events.map((e, i) => {
                  const start = day(e.event_start!)
                  const soon = daysUntil(e.event_start!)
                  return (
                    <motion.li
                      key={e.id}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ delay: i * 0.06, duration: 0.45 }}
                    >
                      <button
                        type="button"
                        onClick={() => setReading(e)}
                        className="group flex w-full items-stretch gap-5 overflow-hidden rounded-3xl border border-black/5 bg-[#f7f5f2] p-3 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_20px_40px_-20px_rgba(250,100,0,0.45)]"
                      >
                        <span className="flex w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-amber-400 py-3 text-white shadow-md sm:w-24">
                          <span className="text-xs font-bold tracking-widest uppercase">{MONTHS[start.getUTCMonth()]}</span>
                          <span className="text-3xl leading-none font-black sm:text-4xl">{start.getUTCDate()}</span>
                          <span className="text-[11px] font-medium text-white/80">{start.getUTCFullYear()}</span>
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-1 pr-2">
                          {soon && (
                            <span className="w-fit rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-primary uppercase">
                              {soon}
                            </span>
                          )}
                          <span className="text-lg leading-snug font-bold text-foreground group-hover:text-primary">{e.title}</span>
                          <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="size-3.5 text-primary" />
                              {eventDates(e.event_start!, e.event_end)}
                            </span>
                            {e.event_time && (
                              <span className="inline-flex items-center gap-1.5">
                                <Clock className="size-3.5 text-primary" />
                                {e.event_time}
                              </span>
                            )}
                            {e.location && (
                              <span className="inline-flex items-center gap-1.5">
                                <MapPin className="size-3.5 text-primary" />
                                {e.location}
                              </span>
                            )}
                          </span>
                        </span>
                        <ArrowUpRight className="mt-2 mr-1 size-5 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                      </button>
                    </motion.li>
                  )
                })}
              </ul>
            </div>
          )}

          {announcements.length > 0 && (
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold tracking-widest text-muted-foreground uppercase">
                <Megaphone className="size-4 text-primary" /> Announcements
              </h3>
              <ol className="relative flex flex-col gap-3 border-l-2 border-primary/20 pl-6">
                {announcements.map((a, i) => (
                  <motion.li
                    key={a.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ delay: i * 0.06, duration: 0.45 }}
                    className="relative"
                  >
                    <span className="absolute top-5 -left-[31px] size-3 rounded-full bg-primary ring-4 ring-white" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => setReading(a)}
                      className="group w-full rounded-2xl border border-black/5 bg-white p-4 text-left shadow-sm transition hover:border-primary/30 hover:shadow-md"
                    >
                      <span className="text-xs font-semibold text-muted-foreground">{publishedLabel(a.published_on)}</span>
                      <span className="mt-1 block leading-snug font-bold text-foreground group-hover:text-primary">{a.title}</span>
                      {a.excerpt && <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{a.excerpt}</span>}
                    </button>
                  </motion.li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>

      <Dialog open={reading != null} onOpenChange={(o) => !o && setReading(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {reading && (
            <div className="flex flex-col gap-4">
              {reading.image_url && (
                <img src={imageSrc(reading.image_url)} alt="" className="-mx-6 -mt-6 aspect-[16/7] w-[calc(100%+3rem)] max-w-none object-cover" />
              )}
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                  {reading.type === "event" ? "Alumni event" : "Alumni announcement"}
                </p>
                <DialogTitle className="mt-1 text-2xl leading-tight font-black">{reading.title}</DialogTitle>
              </div>
              {reading.type === "event" && reading.event_start ? (
                <ul className="flex flex-wrap gap-x-5 gap-y-2 rounded-2xl bg-secondary/60 px-4 py-3 text-sm">
                  <li className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-4 text-primary" /> {eventDates(reading.event_start, reading.event_end)}
                  </li>
                  {reading.event_time && (
                    <li className="inline-flex items-center gap-1.5">
                      <Clock className="size-4 text-primary" /> {reading.event_time}
                    </li>
                  )}
                  {reading.location && (
                    <li className="inline-flex items-center gap-1.5">
                      <MapPin className="size-4 text-primary" /> {reading.location}
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{publishedLabel(reading.published_on)}</p>
              )}
              {reading.body ? (
                <RichContent html={reading.body} className="sm:prose-base" />
              ) : (
                reading.excerpt && <p className="text-muted-foreground">{reading.excerpt}</p>
              )}
              {reading.link_url && (
                <a
                  href={reading.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 w-fit items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-white transition hover:bg-primary"
                >
                  Learn more <ArrowUpRight className="size-4" />
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
