import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api, ApiError } from "#/lib/api-client";
import { FileUploadField } from "#/components/file-upload-field";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Button } from "#/components/ui/button.tsx";

export const Route = createFileRoute("/student/_student/profile")({
  component: StudentProfilePage,
});

interface StudentProfile {
  id: number;
  full_name: string;
  registration_number: string;
  room_number: string;
  programme: string;
  level: string;
  gender: string;
  email: string;
  id_type: string;
  id_number: string;
  phone_country_code: string;
  phone_number: string;
  passport_photo_url: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
}

interface EditableValues {
  phoneCountryCode: string;
  phoneNumber: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  passportPhotoUrl: string;
}

const changePinSchema = z
  .object({
    currentPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
    newPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
    confirmNewPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  })
  .refine((data) => data.newPin === data.confirmNewPin, {
    message: "PINs do not match",
    path: ["confirmNewPin"],
  });
type ChangePinValues = z.infer<typeof changePinSchema>;

function StudentProfilePage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["students", "me"],
    queryFn: () => api.get<{ student: StudentProfile }>("/students/me"),
  });

  const { register, handleSubmit, control, reset } = useForm<EditableValues>({
    values: data
      ? {
          phoneCountryCode: data.student.phone_country_code,
          phoneNumber: data.student.phone_number,
          emergencyContactName: data.student.emergency_contact_name,
          emergencyContactNumber: data.student.emergency_contact_number,
          passportPhotoUrl: data.student.passport_photo_url,
        }
      : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (values: EditableValues) => api.patch("/students/me", values),
    onSuccess: () => {
      toast.success("Profile updated.");
      queryClient.invalidateQueries({ queryKey: ["students", "me"] });
    },
    onError: () => toast.error("Couldn't update your profile. Please try again."),
  });

  const pinForm = useForm<ChangePinValues>({ resolver: zodResolver(changePinSchema) });
  const changePinMutation = useMutation({
    mutationFn: (values: ChangePinValues) => api.post("/student-auth/me/pin", values),
    onSuccess: () => {
      toast.success("PIN changed.");
      pinForm.reset();
    },
    onError: (err) => {
      pinForm.setError("root", {
        message: err instanceof ApiError ? err.message : "Couldn't change your PIN. Please try again.",
      });
    },
  });

  if (isLoading || !data) return <p className="text-muted-foreground">Loading...</p>;
  const student = data.student;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">My Profile</h1>

      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-md">
        <CardContent className="flex items-center gap-5">
          <img
            src={student.passport_photo_url}
            alt={student.full_name}
            className="size-24 rounded-2xl border-2 border-white object-cover shadow-md sm:size-28"
          />
          <div>
            <h2 className="text-xl font-bold text-foreground">{student.full_name}</h2>
            <p className="text-sm text-muted-foreground">{student.registration_number}</p>
            <p className="text-sm text-muted-foreground">
              Room {student.room_number} &middot; {student.programme} (Level {student.level})
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registration Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <ReadOnlyField label="Gender" value={student.gender} />
          <ReadOnlyField label="Email" value={student.email} />
          <ReadOnlyField
            label="Identification"
            value={`${student.id_type === "ghana_card" ? "Ghana Card" : "Passport"} — ${student.id_number}`}
          />
          <p className="text-xs text-muted-foreground sm:col-span-2">
            To correct any of the details above, please contact the Hall Office.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
            className="flex flex-col gap-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid grid-cols-[6rem_1fr] gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Code</Label>
                  <Input {...register("phoneCountryCode")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Phone Number</Label>
                  <Input {...register("phoneNumber")} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Emergency Contact Name</Label>
                <Input {...register("emergencyContactName")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Emergency Contact Number</Label>
                <Input {...register("emergencyContactNumber")} />
              </div>
            </div>
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
            <Button type="submit" disabled={updateMutation.isPending} className="w-fit">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() =>
                reset({
                  phoneCountryCode: student.phone_country_code,
                  phoneNumber: student.phone_number,
                  emergencyContactName: student.emergency_contact_name,
                  emergencyContactNumber: student.emergency_contact_number,
                  passportPhotoUrl: student.passport_photo_url,
                })
              }
            >
              Reset
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change PIN</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={pinForm.handleSubmit((values) => changePinMutation.mutate(values))}
            className="flex flex-col gap-4"
          >
            {pinForm.formState.errors.root && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {pinForm.formState.errors.root.message}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label>Current PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  {...pinForm.register("currentPin")}
                />
                {pinForm.formState.errors.currentPin && (
                  <p className="text-xs text-destructive">{pinForm.formState.errors.currentPin.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>New PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  {...pinForm.register("newPin")}
                />
                {pinForm.formState.errors.newPin && (
                  <p className="text-xs text-destructive">{pinForm.formState.errors.newPin.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Confirm New PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  {...pinForm.register("confirmNewPin")}
                />
                {pinForm.formState.errors.confirmNewPin && (
                  <p className="text-xs text-destructive">
                    {pinForm.formState.errors.confirmNewPin.message}
                  </p>
                )}
              </div>
            </div>
            <Button type="submit" disabled={changePinMutation.isPending} className="w-fit">
              {changePinMutation.isPending ? "Saving..." : "Change PIN"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}
