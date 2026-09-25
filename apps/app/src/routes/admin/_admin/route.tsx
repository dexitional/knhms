import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import {
  DoorOpen,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageSquareHeart,
  ShieldCheck,
  ShoppingBag,
  Users,
  Wrench,
} from "lucide-react";
import { getAdminSession } from "#/server/session";
import { api } from "#/lib/api-client";
import { asset } from "#/lib/asset";
import { Button } from "#/components/ui/button.tsx";

export const Route = createFileRoute("/admin/_admin")({
  beforeLoad: async () => {
    const admin = await getAdminSession();
    if (!admin) throw redirect({ to: "/admin/login" });
    return { admin };
  },
  component: AdminLayout,
});

const navItems = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/reports", label: "Reports", icon: LayoutDashboard },
  { to: "/admin/rooms", label: "Rooms", icon: DoorOpen },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/repairs", label: "Repairs", icon: Wrench },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/suggestions", label: "Suggestions", icon: MessageSquareHeart },
  { to: "/admin/staff", label: "Staff", icon: ShieldCheck },
] as const;

function AdminLayout() {
  const { admin } = Route.useRouteContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await api.post("/admin-auth/logout");
    navigate({ to: "/admin/login" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-foreground text-background sm:flex">
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
          <img src={asset("logo.png")} alt="" className="h-9 w-auto" />
          <div className="leading-tight">
            <p className="text-sm font-bold">KNH</p>
            <p className="text-[10px] tracking-widest text-primary uppercase">Admin Portal</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
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
          <Button variant="outline" size="sm" className="w-full border-white/20 text-background hover:bg-white/10 hover:text-background" onClick={handleLogout}>
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
