import { createFileRoute, redirect } from "@tanstack/react-router"

// The guide moved to /freshers; keep old links (and shared QR codes) working.
export const Route = createFileRoute("/_web/freshmen")({
  beforeLoad: () => {
    throw redirect({ to: "/freshers", statusCode: 301 })
  },
})
