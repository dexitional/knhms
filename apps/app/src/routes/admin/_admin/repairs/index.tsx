import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { api, ApiError } from "#/lib/api-client"
import { Input } from "#/components/ui/input.tsx"
import { StatusBadge } from "#/components/status-badge"
import { Button } from "#/components/ui/button.tsx"
import { toast } from "sonner"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select.tsx"
import { Pagination } from "#/components/pagination"
import { RoomNumberBadge } from "#/components/room-number-badge"
import { Pencil } from "lucide-react"

export const Route = createFileRoute("/admin/_admin/repairs/")({
  component: AdminRepairsPage,
})

interface RepairRow {
  id: number
  room_number: string
  student_name: string
  registration_number: string
  category: string | null
  status: string
  assigned_admin_name: string | null
  created_at: string
}

const STATUSES = ["pending", "approved", "assigned", "completed"] as const
const FILTER_STATUSES = ["all", "pending", "approved", "assigned", "completed"] as const
const PAGE_SIZE = 20

function AdminRepairsPage() {
  const { admin: currentAdmin } = Route.useRouteContext()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<(typeof FILTER_STATUSES)[number]>("all")
  const [search, setSearch] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["admin-repairs", page, status, search],
    queryFn: () =>
      api.get<{ items: RepairRow[]; total: number; page: number; pageSize: number }>("/repairs", {
        page,
        pageSize: PAGE_SIZE,
        status: status === "all" ? undefined : status,
        search: search || undefined,
      }),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: (typeof STATUSES)[number] }) =>
      api.patch(`/repairs/${id}`, { status }),
    onSuccess: () => {
      toast.success("Status updated.")
      queryClient.invalidateQueries({ queryKey: ["admin-repairs"] })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't update status."),
  })

  const canEdit = currentAdmin.role === "super_admin" || currentAdmin.role === "admin"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Repair Requests</h1>
        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-8"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as (typeof STATUSES)[number])
              setPage(1)
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading && <p className="px-6 py-4 text-muted-foreground">Loading...</p>}
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Student</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Submitted</TableHead>
              {canEdit && (
                <>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
<TableBody>
            {data?.items.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  {r.student_name}
                </TableCell>
                <TableCell>
                  <RoomNumberBadge roomNumber={r.room_number} />
                </TableCell>
                <TableCell>{r.category ?? <TableEmptyValue />}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell>
                  {r.assigned_admin_name ?? <TableEmptyValue>Unassigned</TableEmptyValue>}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </TableCell>
                {canEdit && (
                  <>
                    <TableCell>
                      <Select
                        value={r.status}
                        onValueChange={(newStatus) => {
                          if (newStatus !== r.status) {
                            updateStatusMutation.mutate({ id: r.id, status: newStatus as (typeof STATUSES)[number] })
                          }
                        }}
                        disabled={updateStatusMutation.isPending}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        asChild
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit repair for ${r.student_name}`}
                        onClick={() => {
                          // Navigate to detail page for editing
                          window.location.href = `/admin/repairs/${r.id}`;
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data && (
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  )
}
