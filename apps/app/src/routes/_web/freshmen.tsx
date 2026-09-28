import { createFileRoute } from "@tanstack/react-router"
import { DecorativeBackground } from "#/components/decorative-background"
import { PageHero } from "#/components/page-hero"
import { Card, CardContent } from "#/components/ui/card.tsx"

export const Route = createFileRoute("/_web/freshmen")({
  component: FreshmenPage,
})

function FreshmenPage() {
  return (
    <div className="relative">
      <DecorativeBackground />
      <PageHero title="Freshmen Information" subtitle="Welcome Freshmen!" />

      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <Card className="glass-panel border-0">
          <CardContent className="space-y-4 text-base text-muted-foreground">
            <p>
              Welcome to KNH! This section is dedicated to providing you with all the information
              you need as a new student.
            </p>
            <p>
              Here you'll find resources about accommodation, academic programs, campus facilities,
              and student life.
            </p>
            <p>
              We're excited to have you join our community and look forward to supporting your
              journey.
            </p>
            <p>
              Feel free to explore the various resources available to help you settle in and
              succeed.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
