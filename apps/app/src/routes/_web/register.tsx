import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
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

export const Route = createFileRoute("/_web/register")({
  component: RegisterPage,
});

const registerSchema = z
  .object({
    roomNumber: z.string().min(1, "Room number is required"),
    gender: z.enum(["male", "female"], { message: "Select a gender" }),
    fullName: z.string().min(2, "Full name is required").max(150),
    registrationNumber: z.string().min(3, "Registration number is required").max(30),
    programme: z.string().min(2, "Programme is required").max(150),
    level: z.enum(["100", "200", "300", "400", "500", "600"], { message: "Select a level" }),
    phoneCountryCode: z.string().min(1, "Required").max(5),
    phoneNumber: z.string().min(6, "Enter a valid phone number").max(20),
    passportPhotoUrl: z.string().url("Please upload your passport photo"),
    emergencyContactName: z.string().min(2, "Required").max(150),
    email: z.string().email("Enter a valid email"),
    emergencyContactNumber: z.string().min(6, "Enter a valid phone number").max(20),
    idType: z.enum(["ghana_card", "passport"], { message: "Select an ID type" }),
    idNumber: z.string().min(3, "Required").max(50),
    receiptUrl: z.string().url("Please upload your payment receipt"),
    pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
    confirmPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  })
  .refine((data) => data.pin === data.confirmPin, {
    message: "PINs do not match",
    path: ["confirmPin"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { phoneCountryCode: "+233" },
  });

  const registerMutation = useMutation({
    mutationFn: (values: RegisterFormValues) => api.post("/student-auth/register", values),
    onSuccess: () => {
      toast.success("Registration complete! Redirecting to your dashboard...");
      navigate({ to: "/student" });
    },
    onError: (err) => {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    registerMutation.mutate(values);
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground">Hall Registration</h1>
        <p className="mt-2 text-muted-foreground">
          Fill in your details below. You'll set your dashboard PIN at the end.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        {serverError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <Card className="glass-panel border-0">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Room Number" error={errors.roomNumber?.message}>
              <Input placeholder="e.g. B204" {...register("roomNumber")} />
            </Field>
            <Field label="Gender" error={errors.gender?.message}>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Full Name" error={errors.fullName?.message} className="sm:col-span-2">
              <Input placeholder="As it appears on your ID" {...register("fullName")} />
            </Field>
            <Field label="Registration Number" error={errors.registrationNumber?.message}>
              <Input placeholder="e.g. UCC/2026/00123" {...register("registrationNumber")} />
            </Field>
            <Field label="Programme" error={errors.programme?.message}>
              <Input placeholder="e.g. BSc. Computer Science" {...register("programme")} />
            </Field>
            <Field label="Level" error={errors.level?.message}>
              <Controller
                control={control}
                name="level"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {["100", "200", "300", "400", "500", "600"].map((lvl) => (
                        <SelectItem key={lvl} value={lvl}>
                          Level {lvl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" placeholder="you@example.com" {...register("email")} />
            </Field>
            <div className="grid grid-cols-[6rem_1fr] gap-2 sm:col-span-1">
              <Field label="Code" error={errors.phoneCountryCode?.message}>
                <Input placeholder="+233" {...register("phoneCountryCode")} />
              </Field>
              <Field label="Phone Number" error={errors.phoneNumber?.message}>
                <Input placeholder="24 123 4567" {...register("phoneNumber")} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-0">
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Emergency Contact Name" error={errors.emergencyContactName?.message}>
              <Input placeholder="Full name" {...register("emergencyContactName")} />
            </Field>
            <Field label="Emergency Contact Number" error={errors.emergencyContactNumber?.message}>
              <Input placeholder="Phone number" {...register("emergencyContactNumber")} />
            </Field>
          </CardContent>
        </Card>

        <Card className="glass-panel border-0">
          <CardHeader>
            <CardTitle>Identification &amp; Documents</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="ID Type" error={errors.idType?.message}>
              <Controller
                control={control}
                name="idType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select ID type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ghana_card">Ghana Card</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="ID Number" error={errors.idNumber?.message}>
              <Input placeholder="ID number" {...register("idNumber")} />
            </Field>
            <div className="sm:col-span-2">
              <Controller
                control={control}
                name="passportPhotoUrl"
                render={({ field }) => (
                  <FileUploadField
                    label="Passport Picture"
                    folder="student-photos"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.passportPhotoUrl && (
                <p className="mt-1 text-xs text-destructive">{errors.passportPhotoUrl.message}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Controller
                control={control}
                name="receiptUrl"
                render={({ field }) => (
                  <FileUploadField
                    label="Payment Receipt"
                    folder="receipts"
                    value={field.value}
                    onChange={field.onChange}
                    helpText="Image or PDF of your accommodation pay-in slip / receipt."
                  />
                )}
              />
              {errors.receiptUrl && (
                <p className="mt-1 text-xs text-destructive">{errors.receiptUrl.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-0">
          <CardHeader>
            <CardTitle>Set Your Dashboard PIN</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="4-Digit PIN" error={errors.pin?.message}>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                {...register("pin")}
              />
            </Field>
            <Field label="Confirm PIN" error={errors.confirmPin?.message}>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                {...register("confirmPin")}
              />
            </Field>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              You'll use your Registration Number and this PIN to log in to your dashboard.
              Choose something only you would guess.
            </p>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? "Submitting..." : "Complete Registration"}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
