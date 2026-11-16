import { useRouterState } from "@tanstack/react-router";
import { cn } from "#/lib/utils.ts";
import { Skeleton } from "#/components/ui/skeleton";
import { TableCell, TableRow } from "#/components/ui/table.tsx";

// Loading layouts shaped like the pages they stand in for, so a page keeps
// its structure while data arrives instead of showing "Loading..." text.

export function Loading({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}

export function Lines({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3", i === count - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function HeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-7 w-56 max-w-full" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>
      {action && <Skeleton className="hidden h-9 w-32 sm:block" />}
    </div>
  );
}

export function StatsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <Loading
      className={cn(
        "grid grid-cols-2 gap-3",
        count >= 6
          ? "md:grid-cols-3 xl:grid-cols-6"
          : count === 5
            ? "md:grid-cols-3 lg:grid-cols-5"
            : count === 3
              ? "md:grid-cols-3"
              : "md:grid-cols-4",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="size-8 rounded-lg" />
          </div>
          <Skeleton className="mt-3 h-7 w-16" />
          <Skeleton className="mt-2.5 h-2.5 w-28" />
        </div>
      ))}
    </Loading>
  );
}

export function CardSkeleton({
  lines = 4,
  chart = false,
  className,
}: {
  lines?: number;
  chart?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-6 shadow-sm", className)}>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-2 h-3 w-56 max-w-full" />
      {chart ? <Skeleton className="mt-5 h-48 rounded-lg" /> : <Lines count={lines} className="mt-5" />}
    </div>
  );
}

// Rows of bars for a card or list that isn't a <table>.
export function TableRowsSkeleton({ rows = 6, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <Loading className={cn("divide-y divide-border", className)}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-6 py-3.5">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton
              key={c}
              className={cn("h-3.5", c === 0 ? "w-40 flex-[2]" : "flex-1", c >= 2 && "hidden md:block")}
            />
          ))}
        </div>
      ))}
    </Loading>
  );
}

// Placeholder rows inside a real <TableBody>, so the column headers stay put.
export function TableBodySkeleton({ rows = 6, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r} aria-hidden className="hover:bg-transparent">
          {Array.from({ length: cols }).map((__, c) => (
            <TableCell key={c} className="py-3.5">
              <Skeleton className={cn("h-3.5", c === 0 ? "w-36" : c === cols - 1 ? "ml-auto w-12" : "w-20")} />
            </TableCell>
          ))}
        </TableRow>
      ))}
      <TableRow className="sr-only">
        <TableCell role="status">Loading…</TableCell>
      </TableRow>
    </>
  );
}

// A table card on its own: header bar plus rows.
export function TableSkeleton({ rows = 6, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card shadow-sm", className)}>
      <div className="flex items-center justify-between gap-3 border-b px-6 py-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-48 max-w-[40%]" />
      </div>
      <TableRowsSkeleton rows={rows} cols={cols} />
    </div>
  );
}

// A stack of cards, for list pages such as repair requests or orders.
export function ListSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <Loading className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-48 max-w-[60%]" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Lines count={2} className="mt-4" />
        </div>
      ))}
    </Loading>
  );
}

export function FormSkeleton({ fields = 6, className }: { fields?: number; className?: string }) {
  return (
    <Loading className={cn("rounded-xl border bg-card p-6 shadow-sm", className)}>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-2 h-3 w-64 max-w-full" />
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-6 h-9 w-32" />
    </Loading>
  );
}

// A page of stacked sections, such as billing or a menu.
export function StackSkeleton({ cards = 3, className }: { cards?: number; className?: string }) {
  return (
    <Loading className={cn("space-y-6", className)}>
      <HeaderSkeleton />
      {Array.from({ length: cards }).map((_, i) => (
        <CardSkeleton key={i} lines={i === 0 ? 3 : 5} />
      ))}
    </Loading>
  );
}

// A record page: title row, a summary card beside a details card.
export function DetailSkeleton({ className }: { className?: string }) {
  return (
    <Loading className={cn("space-y-6", className)}>
      <Skeleton className="h-3 w-24" />
      <HeaderSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <CardSkeleton lines={6} className="lg:col-span-2" />
        <CardSkeleton lines={5} />
      </div>
      <CardSkeleton lines={4} />
    </Loading>
  );
}

export function DashboardSkeleton({ stats = 4, className }: { stats?: number; className?: string }) {
  return (
    <Loading className={cn("space-y-6", className)}>
      <StatsSkeleton count={stats} />
      <div className="grid gap-6 lg:grid-cols-2">
        <CardSkeleton chart />
        <CardSkeleton chart />
      </div>
      <CardSkeleton lines={5} />
    </Loading>
  );
}

// Shown by the router while a portal page's code and data are on their way.
export function PageSkeleton() {
  return (
    <Loading className="space-y-6">
      <HeaderSkeleton />
      <StatsSkeleton count={4} />
      <TableSkeleton rows={5} />
    </Loading>
  );
}

// The public site's pages: a centred hero, then a grid of cards.
export function WebPageSkeleton() {
  return (
    <Loading className="mx-auto max-w-6xl px-4 pt-16 pb-16 sm:px-6">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="size-24 rounded-full" />
        <Skeleton className="h-10 w-80 max-w-full" />
        <Skeleton className="h-7 w-48 rounded-full" />
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <Skeleton className="h-40 rounded-none" />
            <div className="p-5">
              <Skeleton className="h-4 w-3/4" />
              <Lines count={2} className="mt-4" />
            </div>
          </div>
        ))}
      </div>
    </Loading>
  );
}

// A printable form: letterhead, then rows of fields.
export function PrintSkeleton() {
  return (
    <Loading className="mx-auto max-w-3xl px-8 py-12">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-16 rounded-full" />
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-3.5 w-40" />
      </div>
      <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
      <Lines count={5} className="mt-10" />
    </Loading>
  );
}

// The router's pending view: picks the layout that matches where the user is
// going, so a click shows the next page's shape straight away.
export function RoutePending() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/print")) return null;
  // Sign-in pages are small forms that appear quickly; a dashboard-shaped
  // placeholder in front of them would only flash.
  if (/^\/(admin|student|seller)\/(login|register|forgot)/.test(pathname)) return null;
  if (/^\/(admin|student|seller)(\/|$)/.test(pathname)) return <PageSkeleton />;
  return <WebPageSkeleton />;
}

// A thin bar along the top of the window while the router is loading a page.
export function NavigationProgress() {
  const pending = useRouterState({ select: (s) => s.status === "pending" });
  if (!pending) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-primary/15" aria-hidden>
      <div className="nav-progress h-full w-1/3 bg-primary" />
    </div>
  );
}
