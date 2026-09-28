import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { Store, UtensilsCrossed } from "lucide-react"
import { asset } from "#/lib/asset"
import { api, ApiError } from "#/lib/api-client"
import { cn } from "#/lib/utils"
import { FormField } from "#/components/form-field"
import { Button } from "#/components/ui/button.tsx"
import { Input } from "#/components/ui/input.tsx"
import { Textarea } from "#/components/ui/textarea.tsx"

export const Route = createFileRoute("/seller/register")({
  component: SellerRegisterPage,
})

const schema = z
  .object({
    sellerType: z.enum(["business", "food_vendor"]),
    businessName: z.string().trim().min(2, "Required").max(150),
    ownerName: z.string().trim().min(2, "Required").max(150),
    email: z.string().trim().email("Enter a valid email"),
    phone: z.string().trim().min(10, "Enter a valid phone number").max(30),
    location: z.string().max(255),
    description: z.string().max(500),
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
type FormValues = z.infer<typeof schema>

const TYPES = [
  {
    value: "business",
    icon: Store,
    title: "Business",
    description: "Sell products on the E-Market — books, gadgets, fashion, provisions, and more.",
  },
  {
    value: "food_vendor",
    icon: UtensilsCrossed,
    title: "Food Vendor",
    description: "List your food spot and menu so students and staff can order from you.",
  },
] as const

function SellerRegisterPage() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sellerType: "business", location: "", description: "" },
  })

  const registerMutation = useMutation({
    mutationFn: (values: FormValues) => api.post("/seller-auth/register", values),
    onSuccess: () => navigate({ to: "/seller" }),
    onError: (err) =>
      setError("root", {
        message: err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      }),
  })

  return (
    <div className="min-h-screen bg-[#FFF5ED] px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={asset("logo.png")} alt="Kwame Nkrumah Hall crest" className="h-12 w-auto" />
            <div className="leading-tight">
              <p className="text-sm font-extrabold tracking-wide">KWAME NKRUMAH HALL</p>
              <p className="text-xs font-semibold tracking-widest text-primary uppercase">E-Market Sellers</p>
            </div>
          </Link>
          <Link to="/seller/login" className="text-sm font-medium text-muted-foreground hover:text-primary">
            Already registered? Log in
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Sell on the KNH E-Market</h1>
          <p className="mt-1 text-muted-foreground">
            Register your business or food spot. The hall office reviews every application — you can set up your
            listings while you wait, and they go live once you're approved.
          </p>
        </div>

        <form
          onSubmit={handleSubmit((values) => registerMutation.mutate(values))}
          className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
        >
          <Controller
            control={control}
            name="sellerType"
            render={({ field }) => (
              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="mb-2 text-sm font-medium">What are you registering?</legend>
                {TYPES.map((t) => (
                  <label
                    key={t.value}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-lg border-2 p-4 transition-colors",
                      field.value === t.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                    )}
                  >
                    <input
                      type="radio"
                      name={field.name}
                      value={t.value}
                      checked={field.value === t.value}
                      onChange={() => field.onChange(t.value)}
                      className="sr-only"
                    />
                    <t.icon className="size-6 shrink-0 text-primary" />
                    <span>
                      <span className="block font-semibold">{t.title}</span>
                      <span className="block text-sm text-muted-foreground">{t.description}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Business / Vendor Name" error={errors.businessName?.message}>
              <Input {...register("businessName")} />
            </FormField>
            <FormField label="Your Full Name" error={errors.ownerName?.message}>
              <Input autoComplete="name" {...register("ownerName")} />
            </FormField>
            <FormField label="Email" error={errors.email?.message}>
              <Input type="email" autoComplete="email" {...register("email")} />
            </FormField>
            <FormField label="Phone / WhatsApp" hint="Customers contact you on this number" error={errors.phone?.message}>
              <Input type="tel" autoComplete="tel" placeholder="e.g. 024 123 4567" {...register("phone")} />
            </FormField>
            <FormField label="Location (optional)" className="sm:col-span-2">
              <Input placeholder="e.g. Science Market, Stall 12" {...register("location")} />
            </FormField>
            <FormField label="About your business (optional)" className="sm:col-span-2">
              <Textarea rows={3} {...register("description")} />
            </FormField>
            <FormField label="Password" error={errors.password?.message}>
              <Input type="password" autoComplete="new-password" {...register("password")} />
            </FormField>
            <FormField label="Confirm Password" error={errors.confirmPassword?.message}>
              <Input type="password" autoComplete="new-password" {...register("confirmPassword")} />
            </FormField>
          </div>

          <p className="rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
            Sellers pay a one-time registration fee and a monthly fee set by the hall office. You'll see the current
            fees and how to pay in your seller portal.
          </p>

          {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

          <Button type="submit" size="lg" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? "Submitting..." : "Submit Application"}
          </Button>
        </form>
      </div>
    </div>
  )
}
