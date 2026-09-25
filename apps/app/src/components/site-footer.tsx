import { asset } from "#/lib/asset";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-foreground text-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center sm:px-6">
        <img src={asset("logo.png")} alt="Kwame Nkrumah Hall crest" className="h-14 w-auto" />
        <div>
          <p className="text-sm font-bold tracking-wide">KWAME NKRUMAH HALL</p>
          <p className="text-xs font-medium tracking-widest text-primary uppercase">
            Leadership by Example
          </p>
        </div>
        <p className="max-w-md text-xs text-background/60">
          University of Cape Coast — Hall Management System. For assistance, contact the Hall
          Porters' Lodge or Presiding Hall Assistants.
        </p>
        <p className="text-[11px] text-background/40">
          &copy; {new Date().getFullYear()} Kwame Nkrumah Hall, University of Cape Coast.
        </p>
      </div>
    </footer>
  );
}
