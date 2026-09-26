import { Link } from "@tanstack/react-router";
import { asset } from "#/lib/asset";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 glass-panel">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <img src={asset("logo.png")} alt="Kwame Nkrumah Hall crest" className="h-11 w-auto" />
          <div className="leading-none">
            <p className="text-base font-extrabold tracking-wide text-foreground sm:text-lg">
              KWAME NKRUMAH HALL
            </p>
            <p className="-mt-2 text-lg font-bold tracking-wide text-primary sm:text-xl" style={{ fontFamily: "'Caveat', cursive" }}>
              Leadership by Example
            </p>
          </div>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-medium sm:gap-4">
          <Link
            to="/register"
            className="hidden rounded-md px-3 py-2 text-foreground/80 hover:text-foreground sm:inline-block"
          >
            Register
          </Link>
          <Link
            to="/student/login"
            className="rounded-md px-3 py-2 text-foreground/80 hover:text-foreground"
          >
            Student Login
          </Link>
          <Link
            to="/admin/login"
            className="rounded-md bg-foreground px-3 py-2 text-background hover:bg-foreground/90"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
