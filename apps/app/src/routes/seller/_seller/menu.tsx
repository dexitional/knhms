import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api, ApiError } from "#/lib/api-client"
import { sellerOverviewQuery } from "#/lib/sellers"
import { FormField } from "#/components/form-field"
import { MenuManager } from "#/components/menu-manager"
import type { MenuItem } from "#/components/menu-manager"
import { Button } from "#/components/ui/button.tsx"
import { Input } from "#/components/ui/input.tsx"
import { Textarea } from "#/components/ui/textarea.tsx"

export const Route = createFileRoute("/seller/_seller/menu")({
  // Only for food vendors.
  beforeLoad: ({ context }) => {
    if (context.seller.sellerType !== "food_vendor") throw redirect({ to: "/seller" })
  },
  component: SellerMenuPage,
})

interface Vendor {
  id: number
  cuisine: string | null
  description: string | null
  logo_url: string | null
  opening_hours: string | null
  delivers: 0 | 1
  is_open: 0 | 1
  menu: Array<MenuItem>
}

const VENDOR_QUERY_KEY = ["seller", "vendor"]

function SellerMenuPage() {
  const queryClient = useQueryClient()
  const { data: overview } = useQuery(sellerOverviewQuery)
  const canManage = overview ? ["pending", "approved"].includes(overview.seller.status) : false
  const { data, isLoading } = useQuery({
    queryKey: VENDOR_QUERY_KEY,
    queryFn: () => api.get<{ vendor: Vendor }>("/seller/vendor"),
  })

  if (isLoading || !data) return <p className="text-muted-foreground">Loading...</p>

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Menu</h1>
        <p className="text-sm text-muted-foreground">
          Customers order from you on WhatsApp or by phone using the number on your account.
        </p>
      </div>

      {/* Keyed on the vendor so the form picks up saved values. */}
      <VendorProfileForm key={data.vendor.id} vendor={data.vendor} canManage={canManage} />

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground">Menu</h2>
        <MenuManager
          baseUrl="/seller/vendor/items"
          menu={data.vendor.menu}
          canEdit={canManage}
          onChanged={() => queryClient.invalidateQueries({ queryKey: ["seller"] })}
        />
      </section>
    </div>
  )
}

const vendorSchema = z.object({
  cuisine: z.string().max(100),
  description: z.string().max(500),
  openingHours: z.string().max(150),
  delivers: z.boolean(),
  isOpen: z.boolean(),
})
type VendorValues = z.infer<typeof vendorSchema>

function VendorProfileForm({ vendor, canManage }: { vendor: Vendor; canManage: boolean }) {
  const queryClient = useQueryClient()
  const form = useForm<VendorValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      cuisine: vendor.cuisine ?? "",
      description: vendor.description ?? "",
      openingHours: vendor.opening_hours ?? "",
      delivers: vendor.delivers === 1,
      isOpen: vendor.is_open === 1,
    },
  })

  const mutation = useMutation({
    mutationFn: (values: VendorValues) => api.patch("/seller/vendor", values),
    onSuccess: () => {
      toast.success("Vendor profile saved.")
      queryClient.invalidateQueries({ queryKey: VENDOR_QUERY_KEY })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't save your profile."),
  })

  return (
    <form
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
    >
      <fieldset disabled={!canManage} className="flex flex-col gap-4">
        <h2 className="font-semibold text-foreground">Vendor profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Cuisine / Speciality">
            <Input placeholder="e.g. Local dishes, Grills, Juices" {...form.register("cuisine")} />
          </FormField>
          <FormField label="Opening Hours">
            <Input placeholder="e.g. Mon–Sat: 7AM–9PM" {...form.register("openingHours")} />
          </FormField>
          <FormField label="Description" className="sm:col-span-2">
            <Textarea rows={2} {...form.register("description")} />
          </FormField>
        </div>
        <p className="text-sm text-muted-foreground">
          Your logo is managed on the{" "}
          <Link to="/seller/account" className="font-medium text-primary hover:underline">
            Account
          </Link>{" "}
          page.
        </p>
        <div className="flex flex-wrap gap-6">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="h-4 w-4 rounded border-input" {...form.register("isOpen")} />
            Open now (untick when you close for the day)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="h-4 w-4 rounded border-input" {...form.register("delivers")} />
            I deliver on campus
          </label>
        </div>
        <Button type="submit" className="w-fit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Save Profile"}
        </Button>
      </fieldset>
    </form>
  )
}
