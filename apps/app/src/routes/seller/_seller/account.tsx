import { createFileRoute } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api, ApiError } from "#/lib/api-client"
import { sellerOverviewQuery } from "#/lib/sellers"
import type { Seller } from "#/lib/sellers"
import { FormField } from "#/components/form-field"
import { Button } from "#/components/ui/button.tsx"
import { Input } from "#/components/ui/input.tsx"
import { Textarea } from "#/components/ui/textarea.tsx"

export const Route = createFileRoute("/seller/_seller/account")({
  component: SellerAccountPage,
})

const errorMessage = (fallback: string) => (err: unknown) =>
  toast.error(err instanceof ApiError ? err.message : fallback)

function SellerAccountPage() {
  const { data } = useQuery(sellerOverviewQuery)

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">Account</h1>
      {data ? <ProfileForm seller={data.seller} /> : <p className="text-muted-foreground">Loading...</p>}
      <PasswordForm />
    </div>
  )
}

const profileSchema = z.object({
  businessName: z.string().trim().min(2, "Required").max(150),
  ownerName: z.string().trim().min(2, "Required").max(150),
  phone: z.string().trim().min(10, "Enter a valid phone number").max(30),
  location: z.string().max(255),
  description: z.string().max(500),
})
type ProfileValues = z.infer<typeof profileSchema>

function ProfileForm({ seller }: { seller: Seller }) {
  const queryClient = useQueryClient()
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      businessName: seller.business_name,
      ownerName: seller.owner_name,
      phone: seller.phone,
      location: seller.location ?? "",
      description: seller.description ?? "",
    },
  })
  const errors = form.formState.errors

  const mutation = useMutation({
    mutationFn: (values: ProfileValues) => api.patch("/seller/profile", values),
    onSuccess: () => {
      toast.success("Profile updated.")
      queryClient.invalidateQueries({ queryKey: ["seller"] })
    },
    onError: errorMessage("Couldn't update your profile."),
  })

  return (
    <form
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
    >
      <div>
        <h2 className="font-semibold text-foreground">Business profile</h2>
        <p className="text-sm text-muted-foreground">
          Shown to customers on your listings. Email: <span className="font-medium">{seller.email}</span>
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Business / Vendor Name" error={errors.businessName?.message}>
          <Input {...form.register("businessName")} />
        </FormField>
        <FormField label="Your Full Name" error={errors.ownerName?.message}>
          <Input {...form.register("ownerName")} />
        </FormField>
        <FormField label="Phone / WhatsApp" error={errors.phone?.message}>
          <Input type="tel" {...form.register("phone")} />
        </FormField>
        <FormField label="Location">
          <Input {...form.register("location")} />
        </FormField>
        <FormField label="About your business" className="sm:col-span-2">
          <Textarea rows={3} {...form.register("description")} />
        </FormField>
      </div>
      <Button type="submit" className="w-fit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving..." : "Save Profile"}
      </Button>
    </form>
  )
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword: z.string().min(8, "At least 8 characters"),
    confirmNewPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  })
type PasswordValues = z.infer<typeof passwordSchema>

function PasswordForm() {
  const form = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) })
  const errors = form.formState.errors

  const mutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: PasswordValues) =>
      api.post("/seller-auth/me/password", { currentPassword, newPassword }),
    onSuccess: () => {
      toast.success("Password changed.")
      form.reset({ currentPassword: "", newPassword: "", confirmNewPassword: "" })
    },
    onError: errorMessage("Couldn't change your password."),
  })

  return (
    <form
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
    >
      <h2 className="font-semibold text-foreground">Change password</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Current Password" error={errors.currentPassword?.message}>
          <Input type="password" autoComplete="current-password" {...form.register("currentPassword")} />
        </FormField>
        <FormField label="New Password" error={errors.newPassword?.message}>
          <Input type="password" autoComplete="new-password" {...form.register("newPassword")} />
        </FormField>
        <FormField label="Confirm New Password" error={errors.confirmNewPassword?.message}>
          <Input type="password" autoComplete="new-password" {...form.register("confirmNewPassword")} />
        </FormField>
      </div>
      <Button type="submit" variant="outline" className="w-fit" disabled={mutation.isPending}>
        {mutation.isPending ? "Changing..." : "Change Password"}
      </Button>
    </form>
  )
}
