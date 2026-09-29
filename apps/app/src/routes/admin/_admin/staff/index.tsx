import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Pencil, Plus, Search, RotateCcw, Trash2 } from "lucide-react"
import { api, ApiError } from "#/lib/api-client"
import { Button } from "#/components/ui/button.tsx"
import { Badge } from "#/components/ui/badge.tsx"
import { Input } from "#/components/ui/input.tsx"
import {
  Table,
  TableBody,
  TableCell,
  TableEmptyValue,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table.tsx"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx"
import { Label } from "#/components/ui/label.tsx"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select.tsx"
import { RoleBadge } from "#/components/role-badge"

export const Route = createFileRoute("/admin/_admin/staff/")({
  component: StaffPage,
})

interface AdminRow {
  id: number
  full_name: string
  staff_number: string
  role: string
  position: string | null
  phone_number: string | null
  institutional_email: string
  is_active: 0 | 1
}

const adminSchema = z.object({
  fullName: z.string().min(2, "Required").max(150),
  role: z.enum(["super_admin", "admin", "staff", "tutor", "technician", "stores", "supervisor", "editor", "manager"]),
  position: z.string().max(100).optional(),
  phoneNumber: z.string().max(20).optional(),
  isActive: z.boolean(),
})
type AdminFormValues = z.infer<typeof adminSchema>

function StaffPage() {
  const { admin: currentAdmin } = Route.useRouteContext()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [editOpen, setEditOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<AdminRow | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["admins", search],
    queryFn: () => api.get<{ admins: AdminRow[] }>("/admins", { search: search || undefined }),
  })

  const editForm = useForm<AdminFormValues>({
    resolver: zodResolver(adminSchema),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: AdminFormValues }) =>
      api.patch(`/admins/${id}`, values),
    onSuccess: () => {
      toast.success("User updated.")
      queryClient.invalidateQueries({ queryKey: ["admins"] })
      setEditOpen(false)
      setEditingAdmin(null)
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't update the user."),
  })

  const resetMutation = useMutation({
    mutationFn: (id: number) =>
      api.post<{ success: boolean; phone: string }>(`/admins/${id}/reset-password`),
    onSuccess: (result) => {
      toast.success(`Password reset. Sent to ${result.phone}.`, { duration: 5000 })
      queryClient.invalidateQueries({ queryKey: ["admins"] })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't reset password."),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admins/${id}`),
    onSuccess: () => {
      toast.success("User account deactivated.")
      queryClient.invalidateQueries({ queryKey: ["admins"] })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't deactivate the user."),
  })

  const openEdit = (a: AdminRow) => {
    setEditingAdmin(a)
    editForm.reset({
      fullName: a.full_name,
      role: a.role as "super_admin" | "admin" | "staff" | "tutor" | "technician" | "stores" | "supervisor" | "editor" | "manager",
      position: a.position ?? "",
      phoneNumber: a.phone_number ?? "",
      isActive: a.is_active === 1,
    })
    setEditOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          {currentAdmin.role === "super_admin" && (
            <Button asChild>
              <Link to="/admin/staff/new">
                <Plus className="size-4" />
                Add User
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading && <p className="px-6 py-4 text-muted-foreground">Loading...</p>}
        <Table className="min-w-[820px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Staff No.</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.admins
              .filter((a) =>
                a.full_name.toLowerCase().includes(search.toLowerCase()) ||
                a.staff_number.toLowerCase().includes(search.toLowerCase()) ||
                a.institutional_email.toLowerCase().includes(search.toLowerCase()) ||
                a.role.toLowerCase().includes(search.toLowerCase()) ||
                (a.position?.toLowerCase().includes(search.toLowerCase()) ?? false),
              )
              .map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    {currentAdmin.role === "super_admin" ? (
                      <Link
                        to="/admin/staff/$staffId"
                        params={{ staffId: String(a.id) }}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {a.full_name}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">{a.full_name}</span>
                    )}
                  </TableCell>
                  <TableCell>{a.staff_number}</TableCell>
                  <TableCell>
                    <RoleBadge role={a.role as "super_admin" | "admin" | "staff" | "tutor" | "technician" | "stores" | "supervisor" | "editor" | "manager"} />
                  </TableCell>
                  <TableCell>{a.position ?? <TableEmptyValue />}</TableCell>
                  <TableCell>{a.phone_number ?? <TableEmptyValue />}</TableCell>
                  <TableCell className="text-muted-foreground">{a.institutional_email}</TableCell>
                  <TableCell>
                    <Badge variant={a.is_active ? "success" : "danger"}>
                      {a.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {currentAdmin.role === "super_admin" && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${a.full_name}`}
                          onClick={() => openEdit(a)}
                          title="Edit user details"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Reset password for ${a.full_name}`}
                          onClick={() => {
                            if (confirm(`Reset password for ${a.full_name}? A new password will be sent via SMS.`))
                              resetMutation.mutate(a.id)
                          }}
                          disabled={resetMutation.isPending}
                          title="Reset password and send new one via SMS"
                        >
                          <RotateCcw className="size-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Deactivate ${a.full_name}`}
                          onClick={() => {
                            if (confirm(`Deactivate ${a.full_name}'s account? This will disable their login access.`))
                              deleteMutation.mutate(a.id)
                          }}
                          disabled={deleteMutation.isPending}
                          title="Deactivate account"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User{editingAdmin ? ` — ${editingAdmin.full_name}` : ""}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((values) => {
              if (!editingAdmin) return
              editMutation.mutate({ id: editingAdmin.id, values })
            })}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Full Name</Label>
                <Input {...editForm.register("fullName")} />
                {editForm.formState.errors.fullName && (
                  <p className="text-xs text-destructive">{editForm.formState.errors.fullName.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Role</Label>
                <Controller
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="tutor">Tutor</SelectItem>
                        <SelectItem value="technician">Technician</SelectItem>
                        <SelectItem value="stores">Stores</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Position (optional)</Label>
                <Input {...editForm.register("position")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Phone Number (optional)</Label>
                <Input {...editForm.register("phoneNumber")} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={editForm.watch("isActive")}
                onChange={(e) => editForm.setValue("isActive", e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active
              </Label>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={editMutation.isPending}>
                {editMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}