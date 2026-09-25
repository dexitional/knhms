import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "#/lib/api-client";
import { StatusBadge } from "#/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableEmptyValue,
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

export const Route = createFileRoute("/admin/_admin/repairs/")({
  component: AdminRepairsPage,
});

interface RepairRow {
  id: number;
  room_number: string;
  student_name: string;
  registration_number: string;
  category: string | null;
  status: string;
  assigned_admin_name: string | null;
  created_at: string;
}

const STATUSES = ["all", "pending", "approved", "assigned", "completed"] as const;

function AdminRepairsPage() {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-repairs", status],
    queryFn: () =>
      api.get<{ items: RepairRow[]; total: number }>("/repairs", {
        status: status === "all" ? undefined : status,
        pageSize: 100,
      }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Repair Requests</h1>
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
              <TableHead>Room</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link
                    to="/admin/repairs/$requestId"
                    params={{ requestId: String(r.id) }}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {r.student_name}
                  </Link>
                </TableCell>
                <TableCell>{r.room_number}</TableCell>
                <TableCell>{r.category ?? <TableEmptyValue />}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell>{r.assigned_admin_name ?? <TableEmptyValue >Unassigned</TableEmptyValue>}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
