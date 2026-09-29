import { useEffect, useMemo, useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { MotionConfig, motion } from "motion/react"
import { ArrowRight, BookOpen, ChevronDown, CircleHelp, ClipboardCheck, ListTree, QrCode } from "lucide-react"
import { cn } from "#/lib/utils"
import type { FreshmenGuide } from "#/lib/freshmen"
import { getFreshmenPage } from "#/server/freshmen"
import { DecorativeBackground } from "#/components/decorative-background"
import { RichContent } from "#/components/rich-content"
import { Button } from "#/components/ui/button.tsx"
import {
  AnimatedSteps,
  AvatarStack,
  FaqItem,
  GuideCover,
  GuideStats,
  HallIllustration,
  IconCards,
  JourneyInfographic,
  MandatoryChecklist,
  PeopleGrid,
  ReadingProgress,
  Reveal,
  fadeUp,
  stagger,
} from "#/components/freshmen-visuals"
import type { Person } from "#/components/freshmen-visuals"

// Content is managed in Admin → Freshmen Guide.
export const Route = createFileRoute("/_web/freshmen")({
  loader: () => getFreshmenPage(),
  component: FreshmenPage,
})

const FAQ_ANCHOR = "faqs"
const FAQ_HEADING_ANCHOR = "frequently-asked-questions"

interface NavTopic {
  anchor: string
  title: string
}
interface NavSection extends NavTopic {
  topics: Array<NavTopic>
}
interface NavGuide extends NavTopic {
  sections: Array<NavSection>
}

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "item"
  )
}

// Readable, unique in-page anchors derived from titles ("#what-to-pack").
function buildAnchors(guides: Array<FreshmenGuide>) {
  const used = new Set([FAQ_ANCHOR, FAQ_HEADING_ANCHOR])
  const make = (title: string) => {
    const base = slugify(title)
    let anchor = base
    for (let n = 2; used.has(anchor); n++) anchor = `${base}-${n}`
    used.add(anchor)
    return anchor
  }
  const guideAnchors = new Map<number, string>()
  const sectionAnchors = new Map<number, string>()
  const topicAnchors = new Map<number, string>()
  for (const g of guides) {
    guideAnchors.set(g.id, make(g.title))
    for (const s of g.sections) {
      sectionAnchors.set(s.id, make(s.title))
      for (const t of s.topics) topicAnchors.set(t.id, make(t.title))
    }
  }
  return { guideAnchors, sectionAnchors, topicAnchors }
}

// Headings count as "current" once they pass this offset below the sticky header.
const SPY_OFFSET = 140

function useActiveAnchor(ids: Array<string>) {
  const [active, setActive] = useState(ids[0] ?? "")
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      let current = ids[0] ?? ""
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= SPY_OFFSET) current = id
      }
      setActive(current)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [ids])
  return active
}

function FreshmenPage() {
  const { guides, faqs, people } = Route.useLoaderData()

  const { anchors, nav } = useMemo(() => {
    const a = buildAnchors(guides)
    const items: Array<NavGuide> = guides.map((g) => ({
      anchor: a.guideAnchors.get(g.id)!,
      title: g.title,
      sections: g.sections.map((s) => ({
        anchor: a.sectionAnchors.get(s.id)!,
        title: s.title,
        topics: s.topics.map((t) => ({ anchor: a.topicAnchors.get(t.id)!, title: t.title })),
      })),
    }))
    if (faqs.length > 0) {
      items.push({
        anchor: FAQ_ANCHOR,
        title: "FAQs",
        sections: [{ anchor: FAQ_HEADING_ANCHOR, title: "Frequently asked questions", topics: [] }],
      })
    }
    return { anchors: a, nav: items }
  }, [guides, faqs.length])

  // Every anchor in document order, mapped to its guide and section.
  const spots = useMemo(() => {
    const list: Array<{ id: string; guide: string; section?: string }> = []
    for (const g of nav) {
      list.push({ id: g.anchor, guide: g.anchor })
      for (const s of g.sections) {
        list.push({ id: s.anchor, guide: g.anchor, section: s.anchor })
        for (const t of s.topics) list.push({ id: t.anchor, guide: g.anchor, section: s.anchor })
      }
    }
    return list
  }, [nav])
  const ids = useMemo(() => spots.map((s) => s.id), [spots])
  const activeId = useActiveAnchor(ids)
  const active = spots.find((s) => s.id === activeId) ?? spots[0]

  const mandatory = guides.flatMap((g) =>
    g.sections.filter((s) => s.is_mandatory).map((s) => ({ id: anchors.sectionAnchors.get(s.id)!, title: s.title })),
  )

  return (
    <MotionConfig reducedMotion="user">
      <ReadingProgress />
      <div className="relative font-[Roboto,sans-serif]">
        <DecorativeBackground />
        <Hero
          people={people}
          startAnchor={nav[0]?.anchor}
          stats={{ guides: nav.length, mandatory: mandatory.length, faqs: faqs.length }}
        />

        <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          {nav.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              The freshmen guide is being prepared. Check back soon.
            </p>
          ) : (
            <div className="grid gap-10 md:grid-cols-12">
              <aside className="hidden md:col-span-4 md:block lg:col-span-3">
                <GuideSidebar
                  nav={nav}
                  activeGuide={active?.guide}
                  activeSection={active?.section}
                  activeTopic={activeId}
                />
              </aside>

              <article className="min-w-0 md:col-span-8 lg:col-span-9">
                <MobileContents nav={nav} />
                <Reveal>
                  <JourneyInfographic
                    stages={guides.map((g) => ({
                      anchor: anchors.guideAnchors.get(g.id)!,
                      label: g.title,
                      detail: g.summary,
                      icon: g.icon,
                    }))}
                  />
                </Reveal>
                {mandatory.length > 0 && (
                  <Reveal>
                    <MandatoryChecklist items={mandatory} />
                  </Reveal>
                )}

                {guides.map((guide, i) => (
                  <GuideBlock key={guide.id} guide={guide} index={i} anchors={anchors} next={nav[i + 1]} />
                ))}

                {people.length > 0 && (
                  <Reveal className="mt-16">
                    <h2 className="text-2xl font-bold text-foreground">People you'll meet</h2>
                    <p className="mt-1 text-muted-foreground">
                      Your hall master, tutors and executives lead orientation and are there to help all year.
                    </p>
                    <PeopleGrid people={people} />
                  </Reveal>
                )}

                {faqs.length > 0 && (
                  <section id={FAQ_ANCHOR} className="mt-16 scroll-mt-24">
                    <GuideCover
                      guideId={FAQ_ANCHOR}
                      index={nav.length - 1}
                      title="Frequently asked questions"
                      summary="Quick answers to what freshmen ask most."
                      headingId={FAQ_HEADING_ANCHOR}
                      icon="circle-help"
                      dark
                    />
                    <Reveal className="mt-6">
                      <div className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
                        {faqs.map((faq) => (
                          <FaqItem key={faq.id} question={faq.question}>
                            <RichContent html={faq.answer} className="text-muted-foreground sm:prose-base" />
                          </FaqItem>
                        ))}
                      </div>
                    </Reveal>
                    <p className="mt-6 text-sm text-muted-foreground">
                      Still stuck? Find the hall office and executives in the{" "}
                      <Link to="/yellow-pages" className="font-medium text-primary hover:underline">
                        Yellow Pages
                      </Link>
                      .
                    </p>
                  </section>
                )}
              </article>
            </div>
          )}
        </div>
      </div>
    </MotionConfig>
  )
}

function Hero({
  people,
  startAnchor,
  stats,
}: {
  people: Array<Person>
  startAnchor?: string
  stats: { guides: number; mandatory: number; faqs: number }
}) {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-12 sm:px-6 md:pt-14 lg:grid-cols-2">
      <motion.div initial="hidden" animate="visible" variants={stagger} className="flex flex-col gap-5">
        <motion.span
          variants={fadeUp}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold tracking-widest text-primary uppercase"
        >
          <BookOpen className="size-3.5" aria-hidden="true" />
          Freshmen guide
        </motion.span>
        <motion.h1
          variants={fadeUp}
          className="text-4xl leading-tight font-black tracking-tight text-balance text-foreground sm:text-5xl"
        >
          Your first steps at <span className="text-primary">Kwame Nkrumah Hall</span>
        </motion.h1>
        <motion.p variants={fadeUp} className="max-w-xl text-lg text-pretty text-muted-foreground">
          Everything for your first weeks in one place: what to do before you arrive, how to register and check in, the
          activities every freshman must attend, and answers to common questions.
        </motion.p>
        <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3">
          {startAnchor && (
            <Button asChild size="lg">
              <a href={`#${startAnchor}`}>
                Start the guide <ArrowRight />
              </a>
            </Button>
          )}
          {/* Kept together so the QR code always sits beside Register. */}
          <div className="flex items-center gap-2">
            <Button asChild size="lg" variant="outline">
              <Link to="/register">Register for the hall</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary/40 text-primary hover:border-primary hover:bg-primary/5 hover:text-primary"
            >
              <Link to="/qrcode" title="Hall registration QR code">
                <QrCode /> QR code
              </Link>
            </Button>
          </div>
        </motion.div>
        <motion.div variants={fadeUp}>
          <GuideStats
            stats={[
              { value: stats.guides, label: "Guides", icon: BookOpen },
              { value: stats.mandatory, label: "Mandatory steps", icon: ClipboardCheck },
              { value: stats.faqs, label: "FAQs answered", icon: CircleHelp },
            ]}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <AvatarStack people={people} label="Your hall team is here to help." />
        </motion.div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
      >
        <HallIllustration />
      </motion.div>
    </section>
  )
}

function GuideSidebar({
  nav,
  activeGuide,
  activeSection,
  activeTopic,
}: {
  nav: Array<NavGuide>
  activeGuide?: string
  activeSection?: string
  activeTopic: string
}) {
  return (
    <nav aria-label="Freshmen guide" className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 pb-6 text-sm">
      <Link
        to="/qrcode"
        className="group mb-5 inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-primary"
      >
        <QrCode className="size-4 transition-transform group-hover:scale-110" aria-hidden="true" />
        Hall registration QR code
      </Link>
      <ol className="flex flex-col gap-1">
        {nav.map((guide, i) => {
          const isActive = guide.anchor === activeGuide
          return (
            <li key={guide.anchor}>
              <a
                href={`#${guide.anchor}`}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "relative block py-2 pl-4 leading-snug transition-colors",
                  isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground hover:text-foreground",
                )}
              >
                {/* The active marker slides between guides. */}
                {isActive && (
                  <motion.span
                    layoutId="freshmen-guide-marker"
                    className="absolute inset-y-1 left-0 w-0.75 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                Guide {i + 1}: {guide.title}
              </a>
              {/* Only the current guide unfolds its sections. */}
              {isActive && guide.sections.length > 1 && (
                <motion.ol
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.25 }}
                  className="mt-1 mb-2 flex flex-col gap-0.5 overflow-hidden pl-4"
                >
                  {guide.sections.map((section) => {
                    const sectionActive = section.anchor === activeSection
                    return (
                      <li key={section.anchor}>
                        <a
                          href={`#${section.anchor}`}
                          className={cn(
                            "relative block rounded-md px-3 py-1.5 leading-snug transition-colors",
                            sectionActive ? "font-medium text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                          )}
                        >
                          {sectionActive && (
                            <motion.span
                              layoutId="freshmen-section-highlight"
                              className="absolute inset-0 -z-10 rounded-md bg-primary/10"
                              transition={{ type: "spring", stiffness: 400, damping: 34 }}
                            />
                          )}
                          {section.title}
                        </a>
                        {sectionActive && section.topics.length > 1 && (
                          <div className="mt-1 mb-1 ml-3 flex flex-col border-l border-border">
                            {section.topics.map((topic) => (
                              <a
                                key={topic.anchor}
                                href={`#${topic.anchor}`}
                                className={cn(
                                  "-ml-px border-l-2 py-1 pl-3 text-[0.8rem] leading-snug transition-colors",
                                  topic.anchor === activeTopic
                                    ? "border-primary font-medium text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground",
                                )}
                              >
                                {topic.title}
                              </a>
                            ))}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </motion.ol>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// The sidebar is hidden on small screens; this collapsible list replaces it.
function MobileContents({ nav }: { nav: Array<NavGuide> }) {
  return (
    <details className="group mb-2 rounded-xl border border-border bg-card md:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <ListTree className="size-4 text-primary" aria-hidden="true" />
          Guide contents
        </span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <ol className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm">
        {nav.map((guide, i) => (
          <li key={guide.anchor}>
            <a href={`#${guide.anchor}`} className="font-semibold text-foreground hover:text-primary">
              Guide {i + 1}: {guide.title}
            </a>
            {guide.sections.length > 1 && (
              <ul className="mt-1 flex flex-col gap-1 pl-4">
                {guide.sections.map((s) => (
                  <li key={s.anchor}>
                    <a href={`#${s.anchor}`} className="text-muted-foreground hover:text-primary">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </details>
  )
}

// Rich-text styling for guide content: blockquotes render as callouts.
const CONTENT_CLASS =
  "sm:prose-base prose-p:leading-7 prose-blockquote:not-italic prose-blockquote:rounded-r-lg prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:font-normal prose-blockquote:text-foreground/80 prose-li:marker:text-primary"

function GuideBlock({
  guide,
  index,
  anchors,
  next,
}: {
  guide: FreshmenGuide
  index: number
  anchors: ReturnType<typeof buildAnchors>
  next?: NavGuide
}) {
  const anchor = anchors.guideAnchors.get(guide.id)!
  return (
    <section id={anchor} aria-labelledby={`${anchor}-title`} className="mt-16 scroll-mt-24">
      <GuideCover
        guideId={anchor}
        index={index}
        title={guide.title}
        summary={guide.summary}
        headingId={`${anchor}-title`}
        icon={guide.icon}
        imageUrl={guide.image_url}
      />

      {guide.sections.map((section) => (
        <Reveal key={section.id} className="mt-10">
          <h3
            id={anchors.sectionAnchors.get(section.id)}
            className="flex scroll-mt-24 flex-wrap items-center gap-3 text-xl font-bold text-foreground"
          >
            {section.title}
            {section.is_mandatory === 1 && (
              <span className="relative inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold tracking-wide text-white">
                <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-30 motion-reduce:hidden" />
                <span className="relative">Mandatory</span>
              </span>
            )}
          </h3>
          {section.intro && <RichContent html={section.intro} className={cn("mt-3", CONTENT_CLASS)} />}
          {section.image_url && (
            <motion.img
              src={section.image_url}
              alt=""
              loading="lazy"
              className="mt-5 aspect-16/7 w-full rounded-2xl object-cover shadow-md"
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          )}
          {section.topics.map((topic) => (
            <div key={topic.id} className="mt-6">
              <h4 id={anchors.topicAnchors.get(topic.id)} className="scroll-mt-24 font-semibold text-foreground">
                {topic.title}
              </h4>
              {topic.body && <RichContent html={topic.body} className={cn("mt-2", CONTENT_CLASS)} />}
              {topic.layout === "steps" && topic.items && <AnimatedSteps items={topic.items} />}
              {topic.layout === "cards" && topic.items && <IconCards items={topic.items} />}
            </div>
          ))}
        </Reveal>
      ))}

      {next && (
        <Reveal>
          <a
            href={`#${next.anchor}`}
            className="group mt-10 flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
          >
            <span>
              <span className="block text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Next: Guide {index + 2}
              </span>
              <span className="font-semibold text-foreground group-hover:text-primary">{next.title}</span>
            </span>
            <ArrowRight className="size-5 text-primary transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </a>
        </Reveal>
      )}
    </section>
  )
}
