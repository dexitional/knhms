import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
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

export const Route = createFileRoute("/admin/_admin/staff/new")({
  component: NewStaffPage,
});

const schema = z.object({
  fullName: z.string().min(2, "Required").max(150),
  staffNumber: z.string().min(1, "Required").max(50),
  role: z.enum(["super_admin", "admin", "staff"]),
  position: z.string().max(100).optional(),
  phoneNumber: z.string().max(20).optional(),
  photoUrl: z.string().url().optional(),
  institutionalEmail: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});
type FormValues = z.infer<typeof schema>;

function NewStaffPage() {
  const { admin } = Route.useRouteContext();
  const navigate = useNavigate();

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "staff" },
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => api.post("/admins", values),
    onSuccess: () => {
      toast.success("Staff account created.");
      navigate({ to: "/admin/staff" });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't create staff account."),
  });

  if (admin.role !== "super_admin") {
    return <p className="text-muted-foreground">Only super admins can add staff accounts.</p>;
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/admin/staff">
          <ArrowLeft className="size-4" />
          Back to Staff
        </Link>
      </Button>

      <h1 className="text-2xl font-bold text-foreground">Add Staff Account</h1>

      <Card>
        <CardHeader>
          <CardTitle>Staff Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((values) => createMutation.mutate(values))}
            className="flex flex-col gap-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Full Name</Label>
                <Input {...register("fullName")} />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Staff Number</Label>
                <Input {...register("staffNumber")} />
                {errors.staffNumber && <p className="text-xs text-destructive">{errors.staffNumber.message}</p>}
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
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Position (optional)</Label>
                <Input placeholder="e.g. Hall Warden" {...register("position")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Phone Number (optional)</Label>
                <Input {...register("phoneNumber")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Institutional Email</Label>
                <Input type="email" {...register("institutionalEmail")} />
                {errors.institutionalEmail && (
                  <p className="text-xs text-destructive">{errors.institutionalEmail.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Initial Password</Label>
                <Input type="password" {...register("password")} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
            </div>
            <Controller
              control={control}
              name="photoUrl"
              render={({ field }) => (
                <FileUploadField
                  label="Photo (optional)"
                  folder="admin-photos"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Button type="submit" disabled={createMutation.isPending} className="w-fit">
              {createMutation.isPending ? "Creating..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
