import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, MessageSquareHeart, ShoppingBag, User, Wrench } from "lucide-react";
import { getStudentSession } from "#/server/session";
import { api } from "#/lib/api-client";
import { asset } from "#/lib/asset";
import { Button } from "#/components/ui/button.tsx";

export const Route = createFileRoute("/student/_student")({
  beforeLoad: async () => {
    const student = await getStudentSession();
    if (!student) throw redirect({ to: "/student/login" });
    return { student };
  },
  component: StudentLayout,
});

const navItems = [
  { to: "/student", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/student/profile", label: "Profile", icon: User },
  { to: "/student/repairs", label: "Repair Requests", icon: Wrench },
  { to: "/student/orders", label: "Orders", icon: ShoppingBag },
  { to: "/student/suggestions", label: "Suggestions", icon: MessageSquareHeart },
] as const;

function StudentLayout() {
  const { student } = Route.useRouteContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await api.post("/student-auth/logout");
    navigate({ to: "/student/login" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card sm:flex">
        <div className="flex items-center gap-3 border-b border-border px-6 py-5">
          <img src={asset("logo.png")} alt="" className="h-9 w-auto" />
          <div className="leading-tight">
            <p className="text-sm font-bold">KNH</p>
            <p className="text-[10px] tracking-widest text-primary uppercase">Student Portal</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: "exact" in item && item.exact }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-secondary hover:text-foreground [&.active]:bg-primary [&.active]:text-primary-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <div className="mb-2 px-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">{student.fullName}</p>
            <p>Room {student.roomNumber}</p>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
            <LogOut className="size-4" />
            Log out
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:hidden">
          <div className="flex items-center gap-2">
            <img src={asset("logo.png")} alt="" className="h-7 w-auto" />
            <span className="text-sm font-bold">KNH Student</span>
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
