import { useState } from "react"
import { useForm } from "react-hook-form"
import type { FieldPath } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, ArrowRight, Briefcase, Check, GraduationCap, Heart, Loader2, PartyPopper, User } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { api, ApiError } from "#/lib/api-client"
import { MEMBERSHIP_INTERESTS } from "#/lib/alumni"
import { cn } from "#/lib/utils"
import { SectionHeading } from "./shared"

// Membership sign-up as a four-step wizard with a review, validating each
// step before moving on. Applications are stored for the hall to follow up.

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(150),
  email: z.string().trim().email("Enter a valid email").max(150),
  phone: z
    .string()
    .trim()
    .min(9, "Enter a valid phone number")
    .max(30)
    .regex(/^[+\d][\d\s()-]+$/, "Enter a valid phone number"),
  classYear: z.string().trim().min(2, "Which year did you finish?").max(40),
  programme: z.string().max(150),
  occupation: z.string().max(150),
  employer: z.string().max(150),
  location: z.string().max(150),
  linkedinUrl: z.union([z.literal(""), z.string().trim().url("Enter a full link, e.g. https://linkedin.com/in/…")]),
  interests: z.array(z.string()),
  wantsUpdates: z.boolean(),
})
type Values = z.infer<typeof schema>

const STEPS: Array<{ title: string; blurb: string; icon: LucideIcon; fields: Array<FieldPath<Values>> }> = [
  { title: "About you", blurb: "How we'll reach you", icon: User, fields: ["fullName", "email", "phone"] },
  { title: "Your KNH years", blurb: "When you called KNH home", icon: GraduationCap, fields: ["classYear", "programme"] },
  { title: "Today", blurb: "Where life has taken you", icon: Briefcase, fields: ["occupation", "employer", "location", "linkedinUrl"] },
  { title: "Get involved", blurb: "How you'd like to help", icon: Heart, fields: ["interests", "wantsUpdates"] },
]

const inputClass =
  "h-12 w-full rounded-xl border border-white/15 bg-white/[0.07] px-4 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/15 aria-[invalid=true]:border-rose-400"

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-white/85">{label}</span>
      {children}
      {error && <span className="text-xs text-rose-300">{error}</span>}
    </label>
  )
}

const YEARS = Array.from({ length: 60 }, (_, i) => String(new Date().getFullYear() - i))

export function MembershipWizard() {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      classYear: "",
      programme: "",
      occupation: "",
      employer: "",
      location: "",
      linkedinUrl: "",
      interests: [],
      wantsUpdates: true,
    },
  })
  const errors = form.formState.errors
  const values = form.watch()
  const reviewing = step === STEPS.length

  const submit = useMutation({
    mutationFn: (v: Values) => api.post("/alumni/memberships", { ...v, classYear: v.classYear }),
  })

  const go = async (to: number) => {
    if (to > step && step < STEPS.length) {
      const ok = await form.trigger(STEPS[step]!.fields)
      if (!ok) return
    }
    setDirection(to > step ? 1 : -1)
    setStep(to)
  }

  const toggleInterest = (key: string) => {
    const current = form.getValues("interests")
    form.setValue("interests", current.includes(key) ? current.filter((k) => k !== key) : [...current, key])
  }

  return (
    <section id="join" className="relative isolate scroll-mt-28 overflow-hidden bg-[#0b0b10] py-20 text-white">
      <div aria-hidden="true" className="absolute -top-32 -left-24 size-[30rem] rounded-full bg-primary/35 blur-3xl" />
      <div aria-hidden="true" className="absolute right-0 -bottom-40 size-[26rem] rounded-full bg-violet-500/20 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          dark
          eyebrow="Membership"
          title={
            <>
              Join the <span className="bg-gradient-to-r from-amber-300 to-primary bg-clip-text text-transparent">KNH Alumni Network</span>
            </>
          }
          lead="Four quick steps. Reconnect with your hall, mentor residents and hear about reunions and projects first."
        />

        <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
          {/* Step rail */}
          <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-3">
            {[...STEPS, { title: "Review", blurb: "Check and send", icon: Check, fields: [] }].map((s, i) => {
              const done = submit.isSuccess || i < step
              const current = !submit.isSuccess && i === step
              return (
                <li key={s.title} className="shrink-0">
                  <button
                    type="button"
                    disabled={submit.isSuccess || i > step}
                    onClick={() => void go(i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition lg:px-4",
                      current ? "border-white/20 bg-white/10" : "border-transparent",
                      !current && i < step && "hover:bg-white/5",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition",
                        done
                          ? "border-transparent bg-gradient-to-br from-primary to-amber-400 text-white"
                          : current
                            ? "border-amber-300 text-amber-300"
                            : "border-white/20 text-white/40",
                      )}
                    >
                      {done ? <Check className="size-4" /> : <s.icon className="size-4" />}
                    </span>
                    <span className="hidden sm:block">
                      <span className={cn("block text-sm font-semibold", current || done ? "text-white" : "text-white/50")}>{s.title}</span>
                      <span className="block text-xs text-white/45">{s.blurb}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          {/* Panel */}
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl sm:p-8">
            <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-amber-300"
                animate={{ width: `${submit.isSuccess ? 100 : (step / STEPS.length) * 100}%` }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>

            <AnimatePresence mode="wait" custom={direction} initial={false}>
              {submit.isSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex min-h-[22rem] flex-col items-center justify-center text-center"
                >
                  <motion.span
                    initial={{ scale: 0, rotate: -40 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 220, damping: 12 }}
                    className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-amber-400 shadow-2xl shadow-primary/40"
                  >
                    <PartyPopper className="size-9" />
                  </motion.span>
                  <h3 className="mt-6 text-3xl font-black">Welcome home, {values.fullName.split(" ")[0]}!</h3>
                  <p className="mt-2 max-w-md text-white/70">
                    Your membership details are in. The alumni team will be in touch, and you'll get a text
                    confirmation shortly. Once KNH, always KNH.
                  </p>
                </motion.div>
              ) : (
                <motion.form
                  key={step}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -40 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (reviewing) void form.handleSubmit((v) => submit.mutate(v))()
                    else void go(step + 1)
                  }}
                  className="flex flex-col gap-5"
                >
                  <div>
                    <p className="text-xs font-semibold tracking-[0.2em] text-amber-300 uppercase">
                      {reviewing ? "Final step" : `Step ${step + 1} of ${STEPS.length}`}
                    </p>
                    <h3 className="mt-1 text-2xl font-black">{reviewing ? "Review and join" : STEPS[step]!.title}</h3>
                  </div>

                  {step === 0 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Full name" error={errors.fullName?.message} className="sm:col-span-2">
                        <input className={inputClass} autoComplete="name" aria-invalid={Boolean(errors.fullName)} {...form.register("fullName")} />
                      </Field>
                      <Field label="Email" error={errors.email?.message}>
                        <input type="email" className={inputClass} autoComplete="email" aria-invalid={Boolean(errors.email)} {...form.register("email")} />
                      </Field>
                      <Field label="Phone / WhatsApp" error={errors.phone?.message}>
                        <input type="tel" className={inputClass} autoComplete="tel" placeholder="024 123 4567" aria-invalid={Boolean(errors.phone)} {...form.register("phone")} />
                      </Field>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Year you finished" error={errors.classYear?.message}>
                        <select className={cn(inputClass, "[&>option]:text-foreground")} aria-invalid={Boolean(errors.classYear)} {...form.register("classYear")}>
                          <option value="">Choose a year</option>
                          {YEARS.map((y) => (
                            <option key={y} value={y}>
                              Class of {y}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Programme (optional)">
                        <input className={inputClass} placeholder="e.g. BSc Computer Science" {...form.register("programme")} />
                      </Field>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Occupation (optional)">
                        <input className={inputClass} placeholder="e.g. Software Engineer" {...form.register("occupation")} />
                      </Field>
                      <Field label="Organisation (optional)">
                        <input className={inputClass} placeholder="e.g. Google" {...form.register("employer")} />
                      </Field>
                      <Field label="City (optional)">
                        <input className={inputClass} placeholder="e.g. Accra, Ghana" {...form.register("location")} />
                      </Field>
                      <Field label="LinkedIn (optional)" error={errors.linkedinUrl?.message}>
                        <input className={inputClass} placeholder="https://linkedin.com/in/…" aria-invalid={Boolean(errors.linkedinUrl)} {...form.register("linkedinUrl")} />
                      </Field>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="flex flex-col gap-5">
                      <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Ways to get involved">
                        {MEMBERSHIP_INTERESTS.map((i) => {
                          const on = values.interests.includes(i.key)
                          return (
                            <button
                              key={i.key}
                              type="button"
                              aria-pressed={on}
                              onClick={() => toggleInterest(i.key)}
                              className={cn(
                                "rounded-2xl border p-4 text-left transition",
                                on ? "border-amber-300/70 bg-gradient-to-br from-primary/40 to-amber-400/20" : "border-white/10 bg-white/[0.04] hover:border-white/25",
                              )}
                            >
                              <span className="flex items-center justify-between">
                                <span className="font-semibold">{i.label}</span>
                                <span className={cn("flex size-5 items-center justify-center rounded-full border", on ? "border-transparent bg-amber-300 text-black" : "border-white/30")}>
                                  {on && <Check className="size-3" />}
                                </span>
                              </span>
                              <span className="mt-1 block text-xs text-white/55">{i.hint}</span>
                            </button>
                          )
                        })}
                      </div>
                      <label className="flex cursor-pointer items-center gap-3 text-sm text-white/80">
                        <input type="checkbox" className="size-4 accent-[var(--primary)]" {...form.register("wantsUpdates")} />
                        Send me news about reunions, projects and hall events
                      </label>
                    </div>
                  )}

                  {reviewing && (
                    <dl className="grid gap-3 rounded-2xl bg-white/[0.05] p-5 text-sm sm:grid-cols-2">
                      {[
                        ["Name", values.fullName],
                        ["Email", values.email],
                        ["Phone", values.phone],
                        ["Class", values.classYear && `Class of ${values.classYear}`],
                        ["Programme", values.programme],
                        ["Work", [values.occupation, values.employer].filter(Boolean).join(" at ")],
                        ["City", values.location],
                        [
                          "Getting involved",
                          values.interests.map((k) => MEMBERSHIP_INTERESTS.find((i) => i.key === k)?.label ?? k).join(", "),
                        ],
                      ].map(([label, value]) =>
                        value ? (
                          <div key={label}>
                            <dt className="text-xs text-white/45">{label}</dt>
                            <dd className="font-medium break-words">{value}</dd>
                          </div>
                        ) : null,
                      )}
                    </dl>
                  )}

                  {submit.isError && (
                    <p className="rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
                      {submit.error instanceof ApiError && !submit.error.message.startsWith("[object")
                        ? submit.error.message
                        : "Something went wrong. Please try again."}
                    </p>
                  )}

                  <div className="mt-2 flex items-center justify-between gap-3">
                    {step > 0 ? (
                      <button type="button" onClick={() => void go(step - 1)} className="inline-flex h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white/75 hover:text-white">
                        <ArrowLeft className="size-4" /> Back
                      </button>
                    ) : (
                      <span />
                    )}
                    <button
                      type="submit"
                      disabled={submit.isPending}
                      className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-foreground transition hover:bg-amber-300 disabled:opacity-60"
                    >
                      {submit.isPending && <Loader2 className="size-4 animate-spin" />}
                      {reviewing ? "Join the network" : step === STEPS.length - 1 ? "Review" : "Continue"}
                      {!submit.isPending && <ArrowRight className="size-4" />}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
