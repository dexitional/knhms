import { useEffect, useId, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { asset } from "#/lib/asset";
import { HALL_PAGES } from "#/lib/hall";
import { ARTICLE_SECTIONS } from "#/lib/posts";

const NEWS_LINKS = [ARTICLE_SECTIONS.news, ARTICLE_SECTIONS.announcement, ARTICLE_SECTIONS.event];

// HOME opens a dropdown of the hall pages (same pattern as the akaweb
// header): hover or the chevron opens it, the label itself goes home.
const sectionLinks = [
  { to: "/freshers", label: "FRESHERS" },
  { to: "/e-market", label: "E-MARKET" },
  { to: "/yellow-pages", label: "YELLOW PAGES" },
  { to: "/alumni", label: "ALUMNI" },
] as const;

const ACTIVE_LINK =
  "bg-primary -skew-10 rotate-10 tracking-widest font-bold text-white ring-2 ring-primary border-3 border-white hover:text-white";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [homeOpen, setHomeOpen] = useState(false);
  const [mobileHomeOpen, setMobileHomeOpen] = useState(false);
  const menuId = useId();
  const homePanelId = useId();
  const homeRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const homeActive = pathname === "/" || /^\/(hall|news|announcements|events)(\/|$)/.test(pathname);

  // Close menus after navigating, and on Escape.
  useEffect(() => {
    setMenuOpen(false);
    setHomeOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!menuOpen && !homeOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setHomeOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, homeOpen]);
  // A click-opened dropdown closes when clicking elsewhere.
  useEffect(() => {
    if (!homeOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!homeRef.current?.contains(e.target as Node)) setHomeOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [homeOpen]);

  const openHome = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setHomeOpen(true);
  };
  const closeHomeSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setHomeOpen(false), 160);
  };

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
          className="hidden h-full items-center gap-2 font-[Roboto,sans-serif] tracking-wider text-gray-500 md:flex *:flex *:items-center *:text-[0.8rem] *:font-semibold"
        >
          <div ref={homeRef} className="relative h-full" onMouseEnter={openHome} onMouseLeave={closeHomeSoon}>
            <div className={`flex h-fit items-center rounded ${homeActive ? ACTIVE_LINK : "hover:text-foreground"}`}>
              <Link to="/" className="py-0 pl-3 pr-1">
                HOME
              </Link>
              <button
                type="button"
                onClick={() => setHomeOpen((open) => !open)}
                aria-expanded={homeOpen}
                aria-controls={homePanelId}
                aria-label="Hall pages"
                className="flex items-center pr-2 pl-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ChevronDown className={`size-3.5 transition-transform ${homeOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
            </div>
            {homeOpen && <HomePanel id={homePanelId} onNavigate={() => setHomeOpen(false)} />}
          </div>
          {sectionLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="h-fit rounded px-3 py-0 hover:text-foreground"
              activeProps={{ className: ACTIVE_LINK }}
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
          <div>
            <div className={`flex items-center rounded-md ${homeActive ? "bg-primary text-white" : "text-gray-600"}`}>
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className={`flex-1 rounded-md px-3 py-2.5 text-sm font-semibold tracking-wider transition-colors ${homeActive ? "" : "hover:bg-secondary hover:text-foreground"}`}
              >
                HOME
              </Link>
              <button
                type="button"
                onClick={() => setMobileHomeOpen((open) => !open)}
                aria-expanded={mobileHomeOpen}
                aria-label="Hall pages"
                className="flex size-10 items-center justify-center rounded-md"
              >
                <ChevronDown className={`size-4 transition-transform ${mobileHomeOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
            </div>
            {mobileHomeOpen && (
              <ul className="my-1 ml-3 border-l-2 border-primary/40 pl-2">
                {NEWS_LINKS.map((section) => (
                  <li key={section.path}>
                    <Link
                      to={section.path}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-secondary hover:text-foreground"
                      activeProps={{ className: "font-semibold text-primary" }}
                    >
                      {section.label}
                    </Link>
                  </li>
                ))}
                <li aria-hidden="true" className="mx-3 my-1 border-t border-border/60" />
                {HALL_PAGES.map((p) => (
                  <li key={p.slug}>
                    <Link
                      to="/hall/$page"
                      params={{ page: p.slug }}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-secondary hover:text-foreground"
                      activeProps={{ className: "font-semibold text-primary" }}
                    >
                      {p.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
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

// Intro on the left, the hall pages on the right (akaweb's mega panel).
function HomePanel({ id, onNavigate }: { id: string; onNavigate: () => void }) {
  return (
    <div id={id} className="absolute top-full -left-4 z-50 font-sans tracking-normal">
      {/* Soft charcoal gradient with a gentle orange glow and an orange edge
          on the intro; light text, orange on hover. */}
      <div className="relative isolate grid w-[640px] grid-cols-[220px_1fr] overflow-hidden rounded-b-2xl border border-t-0 border-white/10 bg-gradient-to-br from-neutral-800 via-neutral-800 to-neutral-700 shadow-2xl shadow-black/30">
        <div className="pointer-events-none absolute -top-24 -right-16 -z-10 size-72 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-28 left-24 -z-10 size-64 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
        <div className="flex flex-col justify-between border-t-2 border-r border-t-primary border-r-white/10 bg-gradient-to-b from-white/[0.07] to-transparent p-6 text-white">
          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] text-primary uppercase">Kwame Nkrumah Hall</p>
            <p className="mt-2 text-xl font-extrabold">Home</p>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              News and events from the hall, and the people and projects behind it.
            </p>
          </div>
          <ul className="mt-6 grid gap-1.5">
            {NEWS_LINKS.map((section) => (
              <li key={section.path}>
                <Link
                  to={section.path}
                  onClick={onNavigate}
                  className="inline-flex w-full items-center justify-between gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/20"
                >
                  {section.label}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <ul className="grid content-start gap-1 p-3">
          {HALL_PAGES.map((p) => (
            <li key={p.slug}>
              <Link
                to="/hall/$page"
                params={{ page: p.slug }}
                onClick={onNavigate}
                className="group block rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.07] focus-visible:bg-white/[0.07] focus-visible:outline-none"
              >
                <span className="flex items-center justify-between gap-2 text-sm font-semibold text-white group-hover:text-primary">
                  {p.label}
                  <ArrowRight
                    className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-0.5 block text-[13px] font-normal text-white/65">{p.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
