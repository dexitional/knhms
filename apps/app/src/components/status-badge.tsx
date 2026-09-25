import { Badge } from "#/components/ui/badge.tsx";

type SoftVariant = "secondary" | "success" | "warning" | "info" | "danger" | "purple";

const VARIANT_BY_STATUS: Record<string, SoftVariant> = {
  // repair requests
  pending: "warning",
  approved: "info",
  assigned: "purple",
  completed: "success",
  // orders
  processing: "info",
  cancelled: "danger",
  // suggestions
  new: "warning",
  reviewed: "success",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={VARIANT_BY_STATUS[status] ?? "secondary"} className="capitalize">
      {status}
    </Badge>
  );
}
