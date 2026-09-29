import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "#/lib/api-client";
import { FileUploadField } from "#/components/file-upload-field";
import { Button } from "#/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select.tsx";

export const Route = createFileRoute("/admin/_admin/staff/$staffId")({
  component: StaffDetailPage,
});

interface AdminDetail {
  id: number;
  full_name: string;
  staff_number: string;
  role: string;
  position: string | null;
  phone_number: string | null;
  photo_url: string | null;
  institutional_email: string;
  is_active: 0 | 1;
}

interface EditableValues {
  fullName: string;
  role: string;
  position: string;
  phoneNumber: string;
  photoUrl: string;
}

function StaffDetailPage() {
  const { staffId } = Route.useParams();
  const { admin: currentAdmin } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admins", staffId],
    queryFn: () => api.get<{ admin: AdminDetail }>(`/admins/${staffId}`),
  });

  const { register, handleSubmit, control } = useForm<EditableValues>({
    values: data
      ? {
          fullName: data.admin.full_name,
          role: data.admin.role,
          position: data.admin.position ?? "",
          phoneNumber: data.admin.phone_number ?? "",
          photoUrl: data.admin.photo_url ?? "",
        }
      : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (values: EditableValues) => api.patch(`/admins/${staffId}`, values),
    onSuccess: () => {
      toast.success("User account updated.");
      queryClient.invalidateQueries({ queryKey: ["admins"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't update account."),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => api.delete(`/admins/${staffId}`),
    onSuccess: () => {
      toast.success("User account deactivated.");
      navigate({ to: "/admin/staff" });
    },
  });

  if (currentAdmin.role !== "super_admin") {
    return <p className="text-muted-foreground">Only super admins can manage user accounts.</p>;
  }
  if (isLoading || !data) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/admin/staff">
          <ArrowLeft className="size-4" />
          Back to Users
        </Link>
      </Button>

      <h1 className="text-2xl font-bold text-foreground">{data.admin.full_name}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Edit Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
            className="flex flex-col gap-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Full Name</Label>
                <Input {...register("fullName")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Role</Label>
                <Controller
                  control={control}
                  name="role"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="tutor">Tutor</SelectItem>
                        <SelectItem value="technician">Technician</SelectItem>
                        <SelectItem value="stores">Stores</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Position</Label>
                <Input {...register("position")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Phone Number</Label>
                <Input {...register("phoneNumber")} />
              </div>
            </div>
            <Controller
              control={control}
              name="photoUrl"
              render={({ field }) => (
                <FileUploadField label="Photo" folder="admin-photos" value={field.value} onChange={field.onChange} />
              )}
            />
            <div className="flex gap-3">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              {data.admin.is_active === 1 && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    if (confirm(`Deactivate ${data.admin.full_name}'s account?`)) deactivateMutation.mutate();
                  }}
                >
                  Deactivate Account
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
