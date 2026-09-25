import * as React from "react";
import { cva  } from "class-variance-authority";
import type {VariantProps} from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "#/lib/utils.ts";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-transparent px-2.5 py-1 text-[13px] font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        // Solid variants, for badges outside data tables.
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        destructive: "bg-destructive text-white focus-visible:ring-destructive/20 [a&]:hover:bg-destructive/90",
        outline: "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        // Soft pill variants — the in-table treatment.
        secondary: "bg-slate-100 text-slate-600",
        success: "bg-emerald-100 text-emerald-700",
        warning: "bg-amber-100 text-amber-700",
        info: "bg-blue-100 text-blue-700",
        danger: "bg-rose-100 text-rose-700",
        purple: "bg-violet-100 text-violet-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
