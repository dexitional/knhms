import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { asset } from "#/lib/asset";
import { api, ApiError } from "#/lib/api-client";
import { Button } from "#/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
});

const loginSchema = z.object({
  institutionalEmail: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

function AdminLoginPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const loginMutation = useMutation({
    mutationFn: (values: LoginFormValues) => api.post("/admin-auth/login", values),
    onSuccess: () => navigate({ to: "/admin" }),
    onError: (err) => {
      setError("root", {
        message: err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      });
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-foreground px-4">
      <Card className="w-full max-w-sm border-0 shadow-xl">
        <CardHeader className="items-center text-center">
          <img src={asset("logo.png")} alt="Kwame Nkrumah Hall crest" className="mb-2 h-16 w-auto" />
          <CardTitle className="text-xl">Admin Dashboard</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in with your institutional email</p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((values) => loginMutation.mutate(values))}
            className="flex flex-col gap-4"
          >
            {errors.root && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errors.root.message}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label>Institutional Email</Label>
              <Input type="email" placeholder="you@ucc.edu.gh" {...register("institutionalEmail")} />
              {errors.institutionalEmail && (
                <p className="text-xs text-destructive">{errors.institutionalEmail.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Password</Label>
              <Input type="password" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" disabled={loginMutation.isPending} className="mt-2">
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              <Link to="/admin/forgot-password" className="font-medium text-primary hover:underline">
                Forgot your password?
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
