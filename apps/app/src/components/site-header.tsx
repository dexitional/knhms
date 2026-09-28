import { useEffect, useId, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { asset } from "#/lib/asset";

const sectionLinks = [
  { to: "/freshmen", label: "FRESHMEN" },
  { to: "/knh-hub", label: "KNH-HUB" },
  { to: "/e-market", label: "E-MARKET" },
  { to: "/yellow-pages", label: "YELLOW PAGES" },
] as const;

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Close the mobile menu after navigating, and on Escape.
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 glass-panel">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 md:h-16">
        <Link to="/" className="flex min-w-0 items-center gap-2 md:gap-3">
          <img src={asset("logo.png")} alt="Kwame Nkrumah Hall crest" className="h-9 w-auto shrink-0 md:h-11" />
          <div className="min-w-0 leading-none">
            <p className="truncate text-xs font-extrabold tracking-wide text-foreground sm:text-sm md:text-lg">
              KWAME NKRUMAH HALL
            </p>
            <p
              className="-mt-1 text-base font-bold tracking-wide text-primary md:-mt-2 md:text-xl"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              Leadership by Example
            </p>
          </div>
        </Link>

        {/* Desktop navigation */}
        <nav
          aria-label="Sections"
          className="hidden h-full items-center gap-2 font-[Roboto,sans-serif] tracking-wider text-gray-500 md:flex *:flex *:items-center *:px-3 *:py-0 *:text-[0.8rem] *:font-semibold"
        >
          {sectionLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="h-fit rounded hover:text-foreground"
              activeProps={{
                className:
                  "bg-primary -skew-10 rotate-10 tracking-widest font-bold text-white ring-2 ring-primary border-3 border-white hover:text-white",
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 text-sm font-medium md:flex">
          <Link to="/student/login" className="rounded-md bg-primary/90 px-3 py-2 text-white hover:text-gray-200">
            Student Login
          </Link>
          <Link
            to="/admin/login"
            className="rounded-md bg-foreground px-3 py-2 text-background hover:bg-foreground/90"
          >
            Admin
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="flex size-10 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
        >
          {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {/* Mobile menu panel */}
      <div
        id={menuId}
        hidden={!menuOpen}
        className="border-t border-border/60 md:hidden"
      >
        <nav aria-label="Sections" className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 font-[Roboto,sans-serif] sm:px-6">
          {sectionLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-md px-3 py-2.5 text-sm font-semibold tracking-wider text-gray-600 transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-primary text-white hover:bg-primary hover:text-white" }}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-sm font-medium">
            <Link
              to="/student/login"
              onClick={() => setMenuOpen(false)}
              className="rounded-md bg-primary/90 px-3 py-2.5 text-center text-white hover:text-gray-200"
            >
              Student Login
            </Link>
            <Link
              to="/admin/login"
              onClick={() => setMenuOpen(false)}
              className="rounded-md bg-foreground px-3 py-2.5 text-center text-background hover:bg-foreground/90"
            >
              Admin
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
