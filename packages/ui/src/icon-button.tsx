import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn.js";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        solid: "bg-primary text-primary-foreground hover:opacity-90",
        outline: "border border-border bg-background hover:bg-secondary",
        ghost: "hover:bg-secondary",
      },
      size: {
        sm: "h-8 w-8 [&_svg]:size-4",
        md: "h-9 w-9 [&_svg]:size-4",
        lg: "h-10 w-10 [&_svg]:size-5",
      },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  },
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  // Required, not optional — an icon-only control with no accessible name is
  // a structural accessibility bug, not a style choice.
  "aria-label": string;
  asChild?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(iconButtonVariants({ variant, size }), className)} {...props} />
    );
  },
);
IconButton.displayName = "IconButton";
