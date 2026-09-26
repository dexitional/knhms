import * as React from "react";

import { cn } from "#/lib/utils.ts";

// Shared admin table styling: roomy rows, hairline dividers (no vertical
// rules, no zebra striping), dark normal-case headers rather than the small
// uppercase muted style, and a soft brand-tinted hover.
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table data-slot="table" className={cn("w-full caption-bottom text-[15px]", className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn("[&_tr]:border-b", className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border transition-colors hover:bg-primary/[0.04] data-[state=selected]:bg-primary/[0.06]",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "px-6 py-2 text-left align-middle font-semibold whitespace-nowrap text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td data-slot="table-cell" className={cn("px-6 py-2 align-middle text-foreground", className)} {...props} />
  );
}

// For values that are absent rather than empty-string — matches the
// italic-muted "None" treatment in the reference design.
function TableEmptyValue({ children = "None" }: { children?: React.ReactNode }) {
  return <span className="text-muted-foreground italic">{children}</span>;
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmptyValue };
