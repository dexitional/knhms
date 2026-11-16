import { cn } from "#/lib/utils.ts";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div aria-hidden data-slot="skeleton" className={cn("skeleton rounded-md", className)} {...props} />;
}

export { Skeleton };
