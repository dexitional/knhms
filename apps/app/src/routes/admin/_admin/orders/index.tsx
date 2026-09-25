import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "#/lib/api-client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select.tsx";

export const Route = createFileRoute("/admin/_admin/orders/")({
  component: AdminOrdersPage,
});

interface OrderRow {
  id: number;
  student_name: string;
  registration_number: string;
  service_type: string;
  quantity: number;
  details: string | null;
  status: string;
  created_at: string;
}

const STATUSES = ["all", "pending", "processing", "completed", "cancelled"] as const;
const EDITABLE_STATUSES = ["pending", "processing", "completed", "cancelled"] as const;

function AdminOrdersPage() {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", status],
    queryFn: () =>
      api.get<{ items: OrderRow[]; total: number }>("/orders", {
        status: status === "all" ? undefined : status,
        pageSize: 100,
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: number; newStatus: string }) =>
      api.patch(`/orders/${id}`, { status: newStatus }),
    onSuccess: () => {
      toast.success("Order updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: () => toast.error("Couldn't update the order."),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Orders</h1>
        <Select value={status} onValueChange={(v) => setStatus(v as (typeof STATUSES)[number])}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading && <p className="px-6 py-4 text-muted-foreground">Loading...</p>}
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Student</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Placed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.student_name}</TableCell>
                <TableCell>{order.service_type}</TableCell>
                <TableCell>{order.quantity}</TableCell>
                <TableCell>
                  <Select
                    value={order.status}
                    onValueChange={(v) => updateMutation.mutate({ id: order.id, newStatus: v })}
                  >
                    <SelectTrigger size="sm" className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EDITABLE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
