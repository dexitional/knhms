import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { AnimatePresence, motion } from "motion/react"
import { ArrowUpRight, Building2, CircleCheckBig, Copy, CopyCheck, CreditCard, HandHeart, Loader2, Smartphone, Wallet } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { api, ApiError } from "#/lib/api-client"
import { CHANNEL_TYPE_LABELS, DONATION_METHOD_LABELS, formatCedis } from "#/lib/alumni"
import type { AlumniProject, ChannelType, DonationChannel } from "#/lib/alumni"
import { cn } from "#/lib/utils"
import { SectionHeading } from "./shared"

// "Give back": how to donate (channels managed in admin, with copy buttons)
// and a pledge form. Pledges are stored for the hall to confirm; only
// confirmed gifts appear under "Donations made".

const CHANNEL_ICON: Record<ChannelType, LucideIcon> = {
  momo: Smartphone,
  bank: Building2,
  card: CreditCard,
  other: Wallet,
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        })
      }}
      aria-label={`Copy ${label}`}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition",
        copied ? "bg-emerald-500 text-white" : "bg-black/5 text-foreground hover:bg-primary hover:text-white",
      )}
    >
      {copied ? <CopyCheck className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  )
}

function ChannelCard({ channel, index }: { channel: DonationChannel; index: number }) {
  const Icon = CHANNEL_ICON[channel.type]
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_12px_32px_-18px_rgba(0,0,0,0.25)]"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-amber-400 text-white">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-foreground">{channel.label}</p>
          <p className="text-xs text-muted-foreground">
            {[CHANNEL_TYPE_LABELS[channel.type], channel.provider, channel.branch].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      {channel.account_number && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-secondary/70 px-4 py-3">
          <div className="min-w-0">
            <p className="font-mono text-lg font-bold tracking-wider text-foreground">{channel.account_number}</p>
            {channel.account_name && <p className="truncate text-xs text-muted-foreground">{channel.account_name}</p>}
          </div>
          <CopyButton value={channel.account_number.replace(/\s+/g, "")} label={`${channel.label} number`} />
        </div>
      )}
      {channel.instructions && <p className="mt-3 text-sm text-muted-foreground">{channel.instructions}</p>}
      {channel.link_url && (
        <a
          href={channel.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-foreground px-5 text-sm font-semibold text-white transition hover:bg-primary"
        >
          Give online <ArrowUpRight className="size-4" />
        </a>
      )}
    </motion.article>
  )
}

const QUICK_AMOUNTS = [100, 200, 500, 1000, 5000]

const pledgeFormSchema = z
  .object({
    donorName: z.string().trim().min(2, "Enter your name").max(150),
    phone: z.string().trim().max(30),
    email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]),
    amount: z.coerce.number({ message: "Enter an amount" }).positive("Enter an amount").max(100_000_000),
    projectId: z.string(),
    method: z.enum(["momo", "bank", "card", "cash", "other"]),
    reference: z.string().max(100),
    message: z.string().max(500),
    isAnonymous: z.boolean(),
  })
  .refine((v) => v.phone.length >= 9 || v.email !== "", {
    message: "Give a phone number or email so we can confirm your gift.",
    path: ["phone"],
  })
type PledgeInput = z.input<typeof pledgeFormSchema>
type PledgeValues = z.output<typeof pledgeFormSchema>

const inputClass =
  "h-11 w-full rounded-xl border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/15 aria-[invalid=true]:border-rose-400"

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </label>
  )
}

const apiMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError && !err.message.startsWith("[object") ? err.message : fallback

function PledgeForm({ projects, projectId }: { projects: Array<AlumniProject>; projectId: number | null }) {
  const form = useForm<PledgeInput, unknown, PledgeValues>({
    resolver: zodResolver(pledgeFormSchema),
    defaultValues: {
      donorName: "",
      phone: "",
      email: "",
      amount: "",
      projectId: "general",
      method: "momo",
      reference: "",
      message: "",
      isAnonymous: false,
    },
  })
  const errors = form.formState.errors
  const amount = Number(form.watch("amount")) || 0

  // "Support this project" elsewhere on the page pre-selects the project.
  useEffect(() => {
    if (projectId) form.setValue("projectId", String(projectId))
  }, [projectId, form])

  const submit = useMutation({
    mutationFn: (v: PledgeValues) =>
      api.post("/alumni/pledges", {
        donorName: v.donorName,
        phone: v.phone,
        email: v.email,
        amount: v.amount,
        projectId: v.projectId === "general" ? null : Number(v.projectId),
        method: v.method,
        reference: v.reference,
        message: v.message,
        isAnonymous: v.isAnonymous,
      }),
  })

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_24px_60px_-28px_rgba(250,100,0,0.45)] sm:p-8">
      <AnimatePresence mode="wait" initial={false}>
        {submit.isSuccess ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex min-h-[28rem] flex-col items-center justify-center text-center"
          >
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 12 }}
              className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-amber-400 text-white shadow-xl"
            >
              <HandHeart className="size-9" />
            </motion.span>
            <h3 className="mt-6 text-2xl font-black text-foreground">Thank you for giving back!</h3>
            <p className="mt-2 max-w-sm text-muted-foreground">
              We've recorded your gift of {formatCedis(amount)}. The hall office will confirm it, and you'll get a
              text if you left your number.
            </p>
            <button
              type="button"
              onClick={() => {
                submit.reset()
                form.reset()
              }}
              className="mt-6 text-sm font-semibold text-primary hover:underline"
            >
              Record another gift
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={form.handleSubmit((v) => submit.mutate(v))}
            className="flex flex-col gap-4"
          >
            <div>
              <h3 className="text-xl font-black text-foreground">Record your gift</h3>
              <p className="text-sm text-muted-foreground">
                Sent money, or planning to? Let us know so we can confirm and thank you.
              </p>
            </div>

            <div>
              <span className="text-sm font-medium text-foreground">Amount (GH₵)</span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => form.setValue("amount", String(a), { shouldValidate: true })}
                    className={cn(
                      "h-10 rounded-full border px-4 text-sm font-semibold transition",
                      amount === a ? "border-primary bg-primary text-white" : "border-black/10 hover:border-primary/50",
                    )}
                  >
                    {a.toLocaleString()}
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  placeholder="Other"
                  aria-label="Other amount"
                  aria-invalid={Boolean(errors.amount)}
                  className={cn(inputClass, "h-10 w-28 rounded-full")}
                  {...form.register("amount")}
                />
              </div>
              {errors.amount && <span className="mt-1 block text-xs text-rose-600">{errors.amount.message}</span>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name" error={errors.donorName?.message}>
                <input className={inputClass} aria-invalid={Boolean(errors.donorName)} {...form.register("donorName")} />
              </Field>
              <Field label="Support" error={undefined}>
                <Controller
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <select className={inputClass} value={field.value} onChange={field.onChange}>
                      <option value="general">General hall fund</option>
                      {projects
                        .filter((p) => p.status !== "completed")
                        .map((p) => (
                          <option key={p.id} value={String(p.id)}>
                            {p.title}
                          </option>
                        ))}
                    </select>
                  )}
                />
              </Field>
              <Field label="Phone" error={errors.phone?.message}>
                <input type="tel" className={inputClass} aria-invalid={Boolean(errors.phone)} placeholder="024 123 4567" {...form.register("phone")} />
              </Field>
              <Field label="Email (optional)" error={errors.email?.message}>
                <input type="email" className={inputClass} aria-invalid={Boolean(errors.email)} {...form.register("email")} />
              </Field>
              <Field label="How did you give?">
                <select className={inputClass} {...form.register("method")}>
                  {Object.entries(DONATION_METHOD_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Transaction reference (optional)">
                <input className={inputClass} placeholder="e.g. MoMo transaction ID" {...form.register("reference")} />
              </Field>
              <Field label="A message for the hall (optional)" className="sm:col-span-2">
                <textarea rows={2} className={cn(inputClass, "h-auto py-3")} {...form.register("message")} />
              </Field>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 rounded border-input accent-[var(--primary)]" {...form.register("isAnonymous")} />
              Show me as <span className="font-semibold">Anonymous</span> on the page
            </label>

            {submit.isError && (
              <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {apiMessage(submit.error, "Something went wrong. Please try again.")}
              </p>
            )}

            <button
              type="submit"
              disabled={submit.isPending}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-amber-500 px-6 text-sm font-bold text-white shadow-lg shadow-primary/30 transition hover:shadow-xl hover:shadow-primary/40 disabled:opacity-60"
            >
              {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : <CircleCheckBig className="size-4" />}
              {amount > 0 ? `Record my gift of ${formatCedis(amount)}` : "Record my gift"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}

export function GiveSection({
  channels,
  projects,
  projectId,
}: {
  channels: Array<DonationChannel>
  projects: Array<AlumniProject>
  projectId: number | null
}) {
  return (
    <section id="give" className="scroll-mt-28 bg-gradient-to-b from-[#fff7f0] to-[#f7f5f2] py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Donate"
          title={
            <>
              Give back to <span className="text-primary">KNH</span>
            </>
          }
          lead="Send your gift through any of the channels below, then record it so we can confirm and thank you."
        />
        <div className="grid gap-8 lg:grid-cols-[5fr_6fr]">
          <div className="flex flex-col gap-4">
            {channels.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-black/10 bg-white/60 p-6 text-sm text-muted-foreground">
                Donation details will be published here soon. In the meantime, contact the hall office through the
                Yellow Pages.
              </div>
            ) : (
              channels.map((c, i) => <ChannelCard key={c.id} channel={c} index={i} />)
            )}
          </div>
          <PledgeForm projects={projects} projectId={projectId} />
        </div>
      </div>
    </section>
  )
}
