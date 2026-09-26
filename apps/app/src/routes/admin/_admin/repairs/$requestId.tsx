import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, Printer } from "lucide-react";
import { api } from "#/lib/api-client";
import { Button } from "#/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { Label } from "#/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select.tsx";
import { StatusBadge } from "#/components/status-badge";
import { RoomNumberBadge } from "#/components/room-number-badge";

export const Route = createFileRoute("/admin/_admin/repairs/$requestId")({
  component: RepairDetailPage,
});

interface RepairDetail {
  id: number;
  room_number: string;
  student_name: string;
  registration_number: string;
  category: string | null;
  description: string;
  status: string;
  assigned_admin_id: number | null;
  assigned_admin_name: string | null;
  student_remarks: string | null;
  admin_remarks: string | null;
  created_at: string;
}

interface AdminOption {
  id: number;
  full_name: string;
}

interface UpdateValues {
  status: string;
  assignedAdminId: string;
  adminRemarks: string;
}

function RepairDetailPage() {
  const { requestId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-repairs", requestId],
    queryFn: () => api.get<{ request: RepairDetail }>(`/repairs/${requestId}`),
  });
  const { data: adminsData } = useQuery({
    queryKey: ["admins"],
    queryFn: () => api.get<{ admins: AdminOption[] }>("/admins"),
  });

  const { handleSubmit, control, register } = useForm<UpdateValues>({
    values: data
      ? {
          status: data.request.status,
          assignedAdminId: data.request.assigned_admin_id ? String(data.request.assigned_admin_id) : "unassigned",
          adminRemarks: data.request.admin_remarks ?? "",
        }
      : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (values: UpdateValues) =>
      api.patch(`/repairs/${requestId}`, {
        status: values.status,
        assignedAdminId: values.assignedAdminId === "unassigned" ? null : Number(values.assignedAdminId),
        adminRemarks: values.adminRemarks,
      }),
    onSuccess: () => {
      toast.success("Repair request updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-repairs"] });
    },
    onError: () => toast.error("Couldn't update the request."),
  });

  if (isLoading || !data) return <p className="text-muted-foreground">Loading...</p>;
  const r = data.request;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link to="/admin/repairs">
            <ArrowLeft className="size-4" />
            Back to Repairs
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={`/print/repairs/${requestId}`} target="_blank" rel="noreferrer">
            <Printer className="size-4 mr-1" />
            Print
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{r.category ?? "General repair"}</span>
            <StatusBadge status={r.status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
<div className="text-sm text-muted-foreground">
             <p>
               <span className="font-medium text-foreground">{r.student_name}</span> ({r.registration_number}) &middot;
               <RoomNumberBadge roomNumber={r.room_number} />
             </p>
             <p>Submitted {new Date(r.created_at).toLocaleString()}</p>
           </div>
          <p className="rounded-md bg-secondary/50 px-3 py-2 text-sm">{r.description}</p>
          {r.student_remarks && (
            <p className="rounded-md border border-border px-3 py-2 text-sm">
              <span className="font-medium text-foreground">Student remarks: </span>
              {r.student_remarks}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Request</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
            className="flex flex-col gap-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["pending", "approved", "assigned", "completed"].map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Assign To</Label>
                <Controller
                  control={control}
                  name="assignedAdminId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {adminsData?.admins.map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {a.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Admin Remarks</Label>
              <Textarea rows={3} {...register("adminRemarks")} />
            </div>
            <Button type="submit" disabled={updateMutation.isPending} className="w-fit">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
