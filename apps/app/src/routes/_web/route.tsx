import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteHeader } from "#/components/site-header";
import { SiteFooter } from "#/components/site-footer";

export const Route = createFileRoute("/_web")({
  component: WebLayout,
});

function WebLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
