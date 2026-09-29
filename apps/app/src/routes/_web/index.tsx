import { createFileRoute, redirect } from "@tanstack/react-router"

// The Freshmen guide is the site's entry page; the hall registration QR
// code page lives at /qrcode.
export const Route = createFileRoute("/_web/")({
  beforeLoad: () => {
    throw redirect({ to: "/freshmen" })
  },
})
