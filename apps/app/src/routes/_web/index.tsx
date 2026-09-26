import { createFileRoute, Link } from "@tanstack/react-router"
import { QrCode, ScanLine, ClipboardCheck, Wrench, ShoppingBag, MessageSquareHeart } from "lucide-react"
import { motion } from "motion/react"
import { getRegistrationQr } from "#/server/qr"
import { DecorativeBackground } from "#/components/decorative-background"
import { RegistrationQrCard } from "#/components/registration-qr-card"
import { Button } from "#/components/ui/button.tsx"
import { Card, CardContent } from "#/components/ui/card.tsx"

export const Route = createFileRoute("/_web/")({
  loader: () => getRegistrationQr(),
  component: LandingPage,
})

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
}

const steps = [
  {
    icon: ScanLine,
    title: "Scan the QR code",
    description: "Point your phone's camera at the code above — no app to install.",
  },
  {
    icon: ClipboardCheck,
    title: "Fill in your details",
    description: "Room number, personal info, emergency contact, and ID — all in one form.",
  },
  {
    icon: QrCode,
    title: "Upload your documents",
    description: "Add your passport photo and payment receipt directly from your phone.",
  },
  {
    icon: ClipboardCheck,
    title: "Get instant access",
    description: "Set your 4-digit PIN and your student dashboard is ready immediately.",
  },
]

const services = [
  {
    icon: Wrench,
    title: "Repair Requests",
    description: "Report maintenance issues in your room and track their status to completion.",
  },
  {
    icon: ShoppingBag,
    title: "Hall Services",
    description: "Place orders for laundry, cleaning, and other hall services.",
  },
  {
    icon: MessageSquareHeart,
    title: "Suggestions",
    description: "Share feedback with hall management — anonymously if you prefer.",
  },
]

function LandingPage() {
  const { svg } = Route.useLoaderData()

  return (
    <div className="relative">
      <DecorativeBackground />

      <section className="mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:pt-24">
        <motion.div
          className="flex flex-col gap-6 text-center lg:text-left"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.span
            variants={fadeUp}
            className="mx-auto inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold tracking-widest text-primary uppercase lg:mx-0"
          >
            University of Cape Coast
          </motion.span>
          <motion.h1
            variants={fadeUp}
            className="text-4xl leading-tight font-black tracking-tight text-foreground whitespace-nowrap sm:text-5xl lg:text-6xl"
          >
            Kwame Nkrumah Hall
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mx-auto max-w-xl text-lg text-muted-foreground lg:mx-0"
          >
            Register for your room, manage your stay, and request hall services — all from your
            phone.{" "}
            <span className="font-semibold text-foreground">Leadership by Example.</span>
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start"
          >
            <Button asChild size="lg">
              <Link to="/register">Register Now</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/student/login">Student Login</Link>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
        >
          <RegistrationQrCard svg={svg} />
        </motion.div>
      </section>

      <motion.section
        className="mx-auto max-w-6xl px-4 pb-20 sm:px-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <motion.h2
          variants={fadeUp}
          className="mb-8 text-center text-2xl font-bold text-foreground sm:text-3xl"
        >
          How Registration Works
        </motion.h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              variants={{
                hidden: { opacity: 0, y: 24 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { delay: i * 0.1 },
                },
              }}
            >
              <Card className="glass-panel border-0">
                <CardContent className="flex flex-col items-center gap-3 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <step.icon className="size-6" />
                  </div>
                  <span className="text-xs font-bold tracking-widest text-primary">
                    STEP {i + 1}
                  </span>
                  <h3 className="font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section
        className="border-t border-border/60 bg-secondary/30 py-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <motion.h2
          variants={fadeUp}
          className="mb-8 text-center text-2xl font-bold text-foreground sm:text-3xl"
        >
          Your Dashboard, After You Register
        </motion.h2>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {services.map((service, i) => (
              <motion.div
                key={service.title}
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { delay: i * 0.1 },
                  },
                }}
              >
                <Card className="border-0 bg-card shadow-md">
                  <CardContent className="flex flex-col items-center gap-3 text-center">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                      <service.icon className="size-7" />
                    </div>
                    <h3 className="font-semibold text-foreground">{service.title}</h3>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>
    </div>
  )
}
