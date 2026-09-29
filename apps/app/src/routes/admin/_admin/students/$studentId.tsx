import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { ArrowLeft, KeyRound, Pencil } from "lucide-react"
import { api, ApiError } from "#/lib/api-client"
import { STUDENT_EDITORS, canManage } from "#/lib/permissions"
import { FormField } from "#/components/form-field"
import { Button } from "#/components/ui/button.tsx"
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card.tsx"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog.tsx"
import { Input } from "#/components/ui/input.tsx"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select.tsx"

export const Route = createFileRoute("/admin/_admin/students/$studentId")({
  component: StudentDetailPage,
})

interface StudentDetail {
  id: number
  room_id: number
  full_name: string
  registration_number: string
  room_number: string
  programme: string
  level: string
  gender: string
  email: string
  phone_country_code: string
  phone_number: string
  passport_photo_url: string
  emergency_contact_name: string
  emergency_contact_number: string
  id_type: string
  id_number: string
  receipt_url: string
  locked_until: string | null
  created_at: string
}

interface RoomOption {
  id: number
  room_number: string
  capacity: number
  gender_type: string
  occupied: number
}

const errorMessage = (fallback: string) => (err: unknown) =>
  toast.error(err instanceof ApiError ? err.message : fallback)

function StudentDetailPage() {
  const { studentId } = Route.useParams()
  const { admin } = Route.useRouteContext()
  // Admins manage students (e.g. PIN resets); only super admins edit records.
  const canResetPin = canManage(admin.role, "students")
  const canEdit = STUDENT_EDITORS.includes(admin.role)
  const [editing, setEditing] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["students", studentId],
    queryFn: () => api.get<{ student: StudentDetail }>(`/students/${studentId}`),
  })

  const resetPin = useMutation({
    mutationFn: () => api.post<{ phone: string }>(`/students/${studentId}/reset-pin`),
    onSuccess: ({ phone }) => toast.success(`New PIN sent by SMS to ${phone}.`, { duration: 6000 }),
    onError: errorMessage("Couldn't reset the PIN."),
  })

  if (isLoading || !data) return <p className="text-muted-foreground">Loading...</p>
  const s = data.student
  const locked = !!s.locked_until && new Date(s.locked_until) > new Date()

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/admin/students">
          <ArrowLeft className="size-4" />
          Back to Students
        </Link>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src={s.passport_photo_url} alt="" className="size-20 rounded-xl object-cover" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{s.full_name}</h1>
            <p className="text-muted-foreground">
              {s.registration_number} &middot; Room {s.room_number}
            </p>
          </div>
        </div>
        {(canEdit || canResetPin) && (
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Button onClick={() => setEditing(true)}>
                <Pencil className="size-4" /> Edit
              </Button>
            )}
            {canResetPin && (
              <Button
                variant="outline"
                disabled={resetPin.isPending}
                onClick={() => {
                  if (
                    confirm(
                      `Reset ${s.full_name}'s PIN? A new 4-digit PIN will be sent by SMS to ${s.phone_country_code} ${s.phone_number}${locked ? ", and their account will be unlocked" : ""}.`,
                    )
                  )
                    resetPin.mutate()
                }}
              >
                <KeyRound className="size-4" /> {resetPin.isPending ? "Resetting..." : "Reset PIN"}
              </Button>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <Field label="Programme" value={s.programme} />
          <Field label="Level" value={s.level} />
          <Field label="Gender" value={s.gender} />
          <Field label="Email" value={s.email} />
          <Field label="Phone" value={`${s.phone_country_code} ${s.phone_number}`} />
          <Field
            label="Identification"
            value={`${s.id_type === "ghana_card" ? "Ghana Card" : "Passport"} — ${s.id_number}`}
          />
          <Field label="Emergency Contact" value={s.emergency_contact_name} />
          <Field label="Emergency Contact Number" value={s.emergency_contact_number} />
          <Field label="Registered" value={new Date(s.created_at).toLocaleString()} />
          {locked && (
            <Field label="Account Status" value={`Locked until ${new Date(s.locked_until!).toLocaleString()}`} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Receipt</CardTitle>
        </CardHeader>
        <CardContent>
          <a href={s.receipt_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            View uploaded receipt
          </a>
        </CardContent>
      </Card>

      {canEdit && editing && <EditStudentDialog student={s} onClose={() => setEditing(false)} />}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  )
}

const LEVELS = ["100", "200", "300", "400", "500", "600"] as const

const editSchema = z.object({
  fullName: z.string().trim().min(2, "Required").max(150),
  registrationNumber: z.string().trim().min(3, "Required").max(30),
  email: z.string().trim().email("Enter a valid email").max(150),
  gender: z.enum(["male", "female"]),
  programme: z.string().trim().min(2, "Required").max(150),
  level: z.enum(LEVELS),
  roomId: z.coerce.number().int().positive("Choose a room"),
  phoneCountryCode: z.string().trim().min(1, "Required").max(5),
  phoneNumber: z.string().trim().min(6, "Enter a valid phone number").max(20),
  emergencyContactName: z.string().trim().min(2, "Required").max(150),
  emergencyContactNumber: z.string().trim().min(6, "Enter a valid phone number").max(20),
  idType: z.enum(["ghana_card", "passport"]),
  idNumber: z.string().trim().min(3, "Required").max(50),
})
type EditInput = z.input<typeof editSchema>
type EditValues = z.output<typeof editSchema>

function EditStudentDialog({ student, onClose }: { student: StudentDetail; onClose: () => void }) {
  const queryClient = useQueryClient()
  const rooms = useQuery({
    queryKey: ["students", "room-options"],
    queryFn: () => api.get<{ rooms: Array<RoomOption> }>("/students/room-options"),
  })

  const form = useForm<EditInput, unknown, EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      fullName: student.full_name,
      registrationNumber: student.registration_number,
      email: student.email,
      gender: student.gender as "male" | "female",
      programme: student.programme,
      level: student.level as (typeof LEVELS)[number],
      roomId: student.room_id,
      phoneCountryCode: student.phone_country_code,
      phoneNumber: student.phone_number,
      emergencyContactName: student.emergency_contact_name,
      emergencyContactNumber: student.emergency_contact_number,
      idType: student.id_type as "ghana_card" | "passport",
      idNumber: student.id_number,
    },
  })
  const errors = form.formState.errors
  const gender = form.watch("gender")

  const mutation = useMutation({
    mutationFn: (values: EditValues) => api.patch(`/students/${student.id}`, values),
    onSuccess: () => {
      toast.success("Student updated.")
      queryClient.invalidateQueries({ queryKey: ["students"] })
      onClose()
    },
    onError: errorMessage("Couldn't update the student."),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit {student.full_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Full name" error={errors.fullName?.message}>
              <Input {...form.register("fullName")} />
            </FormField>
            <FormField label="Registration number" error={errors.registrationNumber?.message}>
              <Input {...form.register("registrationNumber")} />
            </FormField>
            <FormField label="Email" error={errors.email?.message}>
              <Input type="email" {...form.register("email")} />
            </FormField>
            <FormField label="Programme" error={errors.programme?.message}>
              <Input {...form.register("programme")} />
            </FormField>
            <FormField label="Level">
              <Controller
                control={form.control}
                name="level"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((l) => (
                        <SelectItem key={l} value={l}>
                          Level {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Gender">
              <Controller
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              label="Room"
              hint="Full rooms and rooms for the other gender can't be chosen"
              error={errors.roomId?.message}
              className="sm:col-span-2"
            >
              <Controller
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={rooms.isLoading ? "Loading rooms..." : "Choose a room"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(rooms.data?.rooms ?? []).map((r) => {
                        const current = r.id === student.room_id
                        const full = !current && r.occupied >= r.capacity
                        const wrongGender = r.gender_type !== "mixed" && r.gender_type !== gender
                        return (
                          <SelectItem key={r.id} value={String(r.id)} disabled={full || wrongGender}>
                            Room {r.room_number} · {r.occupied}/{r.capacity} · {r.gender_type}
                            {current ? " (current)" : full ? " (full)" : ""}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <div className="grid grid-cols-[5rem_1fr] gap-2 sm:col-span-2">
              <FormField label="Code" error={errors.phoneCountryCode?.message}>
                <Input {...form.register("phoneCountryCode")} />
              </FormField>
              <FormField label="Phone number" hint="PIN resets are sent here" error={errors.phoneNumber?.message}>
                <Input type="tel" {...form.register("phoneNumber")} />
              </FormField>
            </div>
            <FormField label="Emergency contact" error={errors.emergencyContactName?.message}>
              <Input {...form.register("emergencyContactName")} />
            </FormField>
            <FormField label="Emergency contact number" error={errors.emergencyContactNumber?.message}>
              <Input type="tel" {...form.register("emergencyContactNumber")} />
            </FormField>
            <FormField label="ID type">
              <Controller
                control={form.control}
                name="idType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ghana_card">Ghana Card</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="ID number" error={errors.idNumber?.message}>
              <Input {...form.register("idNumber")} />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
