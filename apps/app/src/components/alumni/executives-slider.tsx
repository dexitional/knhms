import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Linkedin, Mail, Phone } from "lucide-react"
import type { AlumniExecutive } from "#/lib/alumni"
import { cn } from "#/lib/utils"
import { PersonImage, SectionHeading, telHref } from "./shared"

// Alumni association executives as a swipeable slider: native scroll-snap
// (touch, trackpad, keyboard) plus arrow buttons and progress dots.
export function ExecutivesSlider({ executives }: { executives: Array<AlumniExecutive> }) {
  const track = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)
  const [edges, setEdges] = useState({ start: true, end: false })

  const update = useCallback(() => {
    const el = track.current
    if (!el) return
    const card = el.querySelector("li")
    const step = card ? card.getBoundingClientRect().width + 20 : el.clientWidth
    setActive(Math.round(el.scrollLeft / step))
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 })
  }, [])

  useEffect(() => {
    update()
    const el = track.current
    el?.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      el?.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [update])

  const scrollBy = (dir: 1 | -1) => {
    const el = track.current
    if (!el) return
    const card = el.querySelector("li")
    const step = card ? card.getBoundingClientRect().width + 20 : el.clientWidth * 0.8
    el.scrollBy({ left: dir * step, behavior: "smooth" })
  }
  const goTo = (i: number) => {
    const el = track.current
    const card = el?.querySelectorAll("li")[i]
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" })
  }

  if (executives.length === 0) return null

  return (
    <section id="executives" className="scroll-mt-28 overflow-hidden py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Leadership"
          title="Alumni executives"
          lead="The council that steers the KNH Alumni Association, from reunions to hall projects."
        >
          <div className="flex gap-2">
            {([-1, 1] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => scrollBy(dir)}
                disabled={dir === -1 ? edges.start : edges.end}
                aria-label={dir === -1 ? "Previous executives" : "Next executives"}
                className="flex size-12 items-center justify-center rounded-full border border-black/10 bg-white text-foreground shadow-sm transition hover:border-primary hover:bg-primary hover:text-white disabled:pointer-events-none disabled:opacity-35"
              >
                {dir === -1 ? <ArrowLeft className="size-5" /> : <ArrowRight className="size-5" />}
              </button>
            ))}
          </div>
        </SectionHeading>
      </div>

      <ul
        ref={track}
        aria-label="Alumni executives"
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-4 pb-6 [scrollbar-width:none] sm:px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] [&::-webkit-scrollbar]:hidden"
      >
        {executives.map((e, i) => (
          <li key={e.id} className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[30%] xl:w-[23%]">
            <article className="group relative h-full overflow-hidden rounded-[1.75rem] bg-[#0b0b10] text-white shadow-xl">
              <div className="relative aspect-[3/4] overflow-hidden">
                <PersonImage
                  name={e.name}
                  photoUrl={e.photo_url}
                  className="transition-transform duration-700 group-hover:scale-105"
                  textClassName="text-6xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b10] via-[#0b0b10]/30 to-transparent" />
                <span className="absolute top-4 left-4 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide backdrop-blur-md">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="relative -mt-24 p-6">
                <span className="inline-flex rounded-full bg-gradient-to-r from-primary to-amber-400 px-3 py-1 text-xs font-bold tracking-wide text-white uppercase">
                  {e.position}
                </span>
                <h3 className="mt-3 text-xl leading-tight font-bold">{e.name}</h3>
                {e.class_year && <p className="text-sm text-white/60">{e.class_year}</p>}
                {e.bio && <p className="mt-3 line-clamp-3 text-sm text-white/75">{e.bio}</p>}
                {(e.email || e.phone || e.linkedin_url) && (
                  <div className="mt-4 flex gap-2">
                    {e.email && (
                      <a href={`mailto:${e.email}`} aria-label={`Email ${e.name}`} className="flex size-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-primary">
                        <Mail className="size-4" />
                      </a>
                    )}
                    {e.phone && (
                      <a href={telHref(e.phone)} aria-label={`Call ${e.name}`} className="flex size-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-primary">
                        <Phone className="size-4" />
                      </a>
                    )}
                    {e.linkedin_url && (
                      <a
                        href={e.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${e.name} on LinkedIn`}
                        className="flex size-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-primary"
                      >
                        <Linkedin className="size-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </article>
          </li>
        ))}
      </ul>

      {executives.length > 1 && (
        <div className="mt-2 flex justify-center gap-2" role="tablist" aria-label="Executive slides">
          {executives.map((e, i) => (
            <button
              key={e.id}
              type="button"
              role="tab"
              aria-selected={active === i}
              aria-label={`Go to ${e.name}`}
              onClick={() => goTo(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                active === i ? "w-8 bg-primary" : "w-2 bg-black/15 hover:bg-black/30",
              )}
            />
          ))}
        </div>
      )}
    </section>
  )
}
