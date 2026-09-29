import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  BookUser,
  DoorOpen,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageSquareHeart,
  Newspaper,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
  Wrench,
  GraduationCap,
  Boxes,
} from "lucide-react";
import { getAdminSession } from "#/server/session";
import { api } from "#/lib/api-client";
import { asset } from "#/lib/asset";
import { Button } from "#/components/ui/button.tsx";
import { canView, homePathFor, MODULE_PATHS } from "#/lib/permissions";
import type { AdminModule } from "#/lib/permissions";

// The module a path belongs to ("/admin" itself is the overview); null for
// pages every admin can open, like Account.
function moduleForPath(pathname: string): AdminModule | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/admin") return "overview";
  const match = MODULE_PATHS.filter(([, base]) => base !== "/admin").find(
    ([, base]) => path === base || path.startsWith(`${base}/`),
  );
  return match?.[0] ?? null;
}

export const Route = createFileRoute("/admin/_admin")({
  beforeLoad: async ({ location }) => {
    const admin = await getAdminSession();
    if (!admin) throw redirect({ to: "/admin/login" });
    // Pages outside the role's permissions send them to their own home page.
    const area = moduleForPath(location.pathname);
    if (area && !canView(admin.role, area)) {
      const home = homePathFor(admin.role);
      if (home !== location.pathname) throw redirect({ href: home });
    }
    return { admin };
  },
  component: AdminLayout,
});

const navItems = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, module: "overview", exact: true },
  { to: "/admin/reports", label: "Reports", icon: LayoutDashboard, module: "reports" },
  { to: "/admin/rooms", label: "Rooms", icon: DoorOpen, module: "rooms" },
  { to: "/admin/students", label: "Students", icon: Users, module: "students" },
  { to: "/admin/repairs", label: "Repairs", icon: Wrench, module: "repairs" },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag, module: "orders" },
  { to: "/admin/suggestions", label: "Suggestions", icon: MessageSquareHeart, module: "suggestions" },
  { to: "/admin/hub", label: "KNH Hub", icon: Newspaper, module: "hub" },
  { to: "/admin/freshmen", label: "Freshmen Guide", icon: GraduationCap, module: "freshmen" },
  { to: "/admin/yellow-pages", label: "Yellow Pages", icon: BookUser, module: "yellowPages" },
  { to: "/admin/e-market", label: "E-Market", icon: Store, module: "market" },
  { to: "/admin/sellers", label: "Sellers", icon: BadgeCheck, module: "sellers" },
  { to: "/admin/inventory", label: "Inventories", icon: Boxes, module: "inventory" },
  { to: "/admin/staff", label: "Users", icon: ShieldCheck, module: "users" },
] as const;

function AdminLayout() {
  const { admin } = Route.useRouteContext();
  // Only the modules this role can open (lib/permissions.ts).
  const visibleNav = navItems.filter((item) => canView(admin.role, item.module));
  const navigate = useNavigate();

  const handleLogout = async () => {
    await api.post("/admin-auth/logout");
    navigate({ to: "/admin/login" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-foreground text-background sm:flex">
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
          <img src={asset("logo.png")} alt="" className="h-12 w-auto" />
          <div className="leading-tight">
            <p className="text-lg font-bold tracking-widest">KNH</p>
            <p className="text-xs tracking-widest text-primary uppercase">Admin</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {visibleNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: "exact" in item && item.exact }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-background/70 hover:bg-white/10 hover:text-background [&.active]:bg-primary [&.active]:text-primary-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="mb-2 px-3 text-xs text-background/60">
            <p className="font-semibold text-background">{admin.fullName}</p>
            <p className="capitalize">{admin.role.replace("_", " ")}</p>
          </div>
          <Link
            to="/admin/account"
            className="mb-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-background/70 hover:bg-white/10 hover:text-background [&.active]:bg-primary [&.active]:text-primary-foreground"
          >
            <KeyRound className="size-4" />
            Account
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-white/20 bg-transparent text-background hover:bg-slate-200 hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Log out
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:hidden">
          <div className="flex items-center gap-2">
            <img src={asset("logo.png")} alt="" className="h-7 w-auto" />
            <span className="text-sm font-bold">KNH Admin</span>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={handleLogout} aria-label="Log out">
            <LogOut className="size-4" />
          </Button>
        </header>
        <main className="flex-1 p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
