import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "#/lib/api-client";
import { Button } from "#/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";

export const Route = createFileRoute("/admin/_admin/account")({
  component: AdminAccountPage,
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmNewPassword: z.string().min(8, "New password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });
type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

function AdminAccountPage() {
  const { admin } = Route.useRouteContext();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  const changePasswordMutation = useMutation({
    mutationFn: (values: ChangePasswordValues) =>
      api.post("/admin-auth/me/password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      toast.success("Password changed.");
      reset();
    },
    onError: (err) => {
      setError("root", {
        message: err instanceof ApiError ? err.message : "Couldn't change your password. Please try again.",
      });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">Account</h1>

      <Card>
        <CardHeader>
          <CardTitle>Signed in as</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="font-medium text-foreground">{admin.fullName}</p>
          <p className="text-muted-foreground">
            {admin.institutionalEmail} &middot; <span className="capitalize">{admin.role.replace("_", " ")}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((values) => changePasswordMutation.mutate(values))}
            className="flex max-w-md flex-col gap-4"
          >
            {errors.root && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errors.root.message}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label>Current Password</Label>
              <Input type="password" {...register("currentPassword")} />
              {errors.currentPassword && (
                <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>New Password</Label>
              <Input type="password" {...register("newPassword")} />
              {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Confirm New Password</Label>
              <Input type="password" {...register("confirmNewPassword")} />
              {errors.confirmNewPassword && (
                <p className="text-xs text-destructive">{errors.confirmNewPassword.message}</p>
              )}
            </div>
            <Button type="submit" disabled={changePasswordMutation.isPending} className="w-fit">
              {changePasswordMutation.isPending ? "Saving..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
