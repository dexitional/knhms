import { useState } from "react";
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

export const Route = createFileRoute("/admin/forgot-password")({
  component: AdminForgotPasswordPage,
});

const requestSchema = z.object({
  institutionalEmail: z.string().email("Enter a valid email"),
});
type RequestFormValues = z.infer<typeof requestSchema>;

const resetSchema = z
  .object({
    otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmNewPassword: z.string().min(8, "New password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });
type ResetFormValues = z.infer<typeof resetSchema>;

function AdminForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [institutionalEmail, setInstitutionalEmail] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");

  const requestForm = useForm<RequestFormValues>({ resolver: zodResolver(requestSchema) });

  const requestMutation = useMutation({
    mutationFn: (values: RequestFormValues) =>
      api.post<{ maskedPhone: string }>("/admin-auth/forgot-password", values),
    onSuccess: (data, values) => {
      setInstitutionalEmail(values.institutionalEmail);
      setMaskedPhone(data.maskedPhone);
      setStep("reset");
    },
    onError: (err) => {
      requestForm.setError("root", {
        message: err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      });
    },
  });

  const resetForm = useForm<ResetFormValues>({ resolver: zodResolver(resetSchema) });

  const resetMutation = useMutation({
    mutationFn: (values: ResetFormValues) =>
      api.post("/admin-auth/reset-password", { institutionalEmail, ...values }),
    onSuccess: () => navigate({ to: "/admin/login" }),
    onError: (err) => {
      resetForm.setError("root", {
        message: err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      });
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-foreground px-4">
      <Card className="w-full max-w-sm border-0 shadow-xl">
        <CardHeader className="items-center text-center">
          <img src={asset("logo.png")} alt="Kwame Nkrumah Hall crest" className="mb-2 h-16 w-auto" />
          {step === "request" ? (
            <>
              <CardTitle className="text-xl">Reset Password</CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter your institutional email and we'll text a code to the phone number on file.
              </p>
            </>
          ) : (
            <>
              <CardTitle className="text-xl">Enter Your Code</CardTitle>
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit code to {maskedPhone}. It expires in 10 minutes.
              </p>
            </>
          )}
        </CardHeader>
        <CardContent>
          {step === "request" ? (
            <form
              onSubmit={requestForm.handleSubmit((values) => requestMutation.mutate(values))}
              className="flex flex-col gap-4"
            >
              {requestForm.formState.errors.root && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {requestForm.formState.errors.root.message}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label>Institutional Email</Label>
                <Input
                  type="email"
                  placeholder="you@ucc.edu.gh"
                  {...requestForm.register("institutionalEmail")}
                />
                {requestForm.formState.errors.institutionalEmail && (
                  <p className="text-xs text-destructive">
                    {requestForm.formState.errors.institutionalEmail.message}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={requestMutation.isPending} className="mt-2">
                {requestMutation.isPending ? "Sending..." : "Send Code"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                <Link to="/admin/login" className="font-medium text-primary hover:underline">
                  Back to sign in
                </Link>
              </p>
            </form>
          ) : (
            <form
              onSubmit={resetForm.handleSubmit((values) => resetMutation.mutate(values))}
              className="flex flex-col gap-4"
            >
              {resetForm.formState.errors.root && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {resetForm.formState.errors.root.message}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label>6-Digit Code</Label>
                <Input inputMode="numeric" maxLength={6} placeholder="000000" {...resetForm.register("otp")} />
                {resetForm.formState.errors.otp && (
                  <p className="text-xs text-destructive">{resetForm.formState.errors.otp.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>New Password</Label>
                <Input type="password" {...resetForm.register("newPassword")} />
                {resetForm.formState.errors.newPassword && (
                  <p className="text-xs text-destructive">{resetForm.formState.errors.newPassword.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Confirm New Password</Label>
                <Input type="password" {...resetForm.register("confirmNewPassword")} />
                {resetForm.formState.errors.confirmNewPassword && (
                  <p className="text-xs text-destructive">
                    {resetForm.formState.errors.confirmNewPassword.message}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Didn't get a code?{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => requestMutation.mutate({ institutionalEmail })}
                >
                  Resend
                </button>
              </p>
              <Button type="submit" disabled={resetMutation.isPending} className="mt-2">
                {resetMutation.isPending ? "Saving..." : "Reset Password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
