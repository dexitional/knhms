import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "#/lib/api-client";
import { Button } from "#/components/ui/button.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableEmptyValue,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table.tsx";

const ROLE_VARIANT: Record<string, "purple" | "info" | "secondary"> = {
  super_admin: "purple",
  admin: "info",
  staff: "secondary",
};

export const Route = createFileRoute("/admin/_admin/staff/")({
  component: StaffPage,
});

interface AdminRow {
  id: number;
  full_name: string;
  staff_number: string;
  role: string;
  position: string | null;
  institutional_email: string;
  is_active: 0 | 1;
}

function StaffPage() {
  const { admin } = Route.useRouteContext();
  const { data, isLoading } = useQuery({
    queryKey: ["admins"],
    queryFn: () => api.get<{ admins: AdminRow[] }>("/admins"),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Staff &amp; Admins</h1>
        {admin.role === "super_admin" && (
          <Button asChild>
            <Link to="/admin/staff/new">
              <Plus className="size-4" />
              Add Staff
            </Link>
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading && <p className="px-6 py-4 text-muted-foreground">Loading...</p>}
        <Table className="min-w-[820px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Staff No.</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.admins.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  {admin.role === "super_admin" ? (
                    <Link
                      to="/admin/staff/$staffId"
                      params={{ staffId: String(a.id) }}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {a.full_name}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">{a.full_name}</span>
                  )}
                </TableCell>
                <TableCell>{a.staff_number}</TableCell>
                <TableCell>
                  <Badge variant={ROLE_VARIANT[a.role] ?? "secondary"} className="capitalize">
                    {a.role.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>{a.position ?? <TableEmptyValue />}</TableCell>
                <TableCell className="text-muted-foreground">{a.institutional_email}</TableCell>
                <TableCell>
                  <Badge variant={a.is_active ? "success" : "danger"}>
                    {a.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
