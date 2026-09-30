import { motion } from "motion/react"
import { HandHeart, Quote } from "lucide-react"
import { formatCedis } from "#/lib/alumni"
import type { AlumniPublicContent, PublicDonation } from "#/lib/alumni"
import { cn } from "#/lib/utils"
import { CountUp, SectionHeading } from "./shared"

// "Donations made": headline totals that count up, and a wall of gratitude
// — confirmed gifts drifting past in two rows (a plain grid when there are
// only a few). Anonymous donors are already masked by the API.

function timeAgo(date: string) {
  const days = Math.floor((Date.now() - new Date(`${date}T00:00:00Z`).getTime()) / 86_400_000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months < 12 ? `${months} month${months === 1 ? "" : "s"} ago` : `${Math.floor(months / 12)}y ago`
}

function GiftCard({ gift }: { gift: PublicDonation }) {
  const anonymous = gift.donor === "Anonymous"
  return (
    <article className="w-72 shrink-0 rounded-3xl border border-white/10 bg-white/[0.06] p-5 text-white backdrop-blur-md">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            anonymous ? "bg-white/10 text-white/70" : "bg-gradient-to-br from-primary to-amber-400 text-white",
          )}
        >
          {anonymous ? <HandHeart className="size-4" /> : gift.donor.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{gift.donor}</p>
          <p className="text-xs text-white/50">{timeAgo(gift.donated_on)}</p>
        </div>
        <span className="ml-auto shrink-0 text-lg font-black text-amber-300">{formatCedis(gift.amount)}</span>
      </div>
      <p className="mt-3 truncate text-xs font-medium tracking-wide text-white/60 uppercase">
        {gift.project_title ?? "General fund"}
      </p>
      {gift.message && (
        <p className="mt-2 flex gap-1.5 text-sm text-white/80">
          <Quote className="size-3.5 shrink-0 rotate-180 text-white/40" />
          <span className="line-clamp-2">{gift.message}</span>
        </p>
      )}
    </article>
  )
}

function GiftRow({ gifts, reverse }: { gifts: Array<PublicDonation>; reverse?: boolean }) {
  const strip = [...gifts, ...gifts]
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
      <motion.div
        className="flex w-max gap-4"
        animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration: Math.max(28, gifts.length * 7), repeat: Infinity, ease: "linear" }}
      >
        {strip.map((g, i) => (
          <GiftCard key={`${g.id}-${i}`} gift={g} />
        ))}
      </motion.div>
    </div>
  )
}

export function DonationsSection({
  donations,
  totals,
  onGive,
}: {
  donations: Array<PublicDonation>
  totals: AlumniPublicContent["donationTotals"]
  onGive: () => void
}) {
  const stats = [
    { label: "Raised by alumni", value: totals.amount, format: (n: number) => formatCedis(n), big: true },
    { label: "Donors", value: totals.donors },
    { label: "Gifts", value: totals.count },
    { label: "Projects funded", value: totals.projectsFunded },
  ]
  const half = Math.ceil(donations.length / 2)

  return (
    <section id="donations" className="relative isolate scroll-mt-28 overflow-hidden bg-[#0b0b10] py-20 text-white">
      <div aria-hidden="true" className="absolute -top-40 right-0 size-[32rem] rounded-full bg-primary/30 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-40 -left-20 size-[28rem] rounded-full bg-amber-400/15 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          dark
          eyebrow="Giving back"
          title="Donations made"
          lead="Every confirmed gift from our alumni, big or small, in support of the hall and its residents."
        >
          <button
            type="button"
            onClick={onGive}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-foreground transition hover:bg-primary hover:text-white"
          >
            <HandHeart className="size-4" /> Make a donation
          </button>
        </SectionHeading>

        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className={cn(
                "rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur",
                s.big && "sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-primary/30 to-amber-400/10",
              )}
            >
              <dd className={cn("font-black tracking-tight", s.big ? "text-4xl md:text-5xl" : "text-4xl")}>
                <CountUp value={s.value} format={s.format} />
              </dd>
              <dt className="mt-1 text-sm tracking-wide text-white/60">{s.label}</dt>
            </motion.div>
          ))}
        </dl>
      </div>

      {donations.length > 0 ? (
        <div className="relative mt-12 flex flex-col gap-4">
          <p className="mx-auto mb-1 max-w-6xl px-4 text-xs font-semibold tracking-[0.2em] text-white/50 uppercase sm:px-6">
            Wall of gratitude
          </p>
          {donations.length >= 6 ? (
            <>
              <GiftRow gifts={donations.slice(0, half)} />
              <GiftRow gifts={donations.slice(half)} reverse />
            </>
          ) : (
            <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-4 px-4 sm:px-6">
              {donations.map((g) => (
                <GiftCard key={g.id} gift={g} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="relative mx-auto mt-10 max-w-6xl px-4 text-white/60 sm:px-6">
          Be the first to give. Your gift will appear here once the hall confirms it.
        </p>
      )}
    </section>
  )
}
