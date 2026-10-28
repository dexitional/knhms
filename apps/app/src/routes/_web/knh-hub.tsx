import { createFileRoute, redirect } from "@tanstack/react-router"

// The KNH Hub is now the Home page; keep old links working.
export const Route = createFileRoute("/_web/knh-hub")({
  beforeLoad: () => {
    throw redirect({ to: "/", statusCode: 301 })
  },
})
