import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { api } from "#/lib/api-client"
import { Input } from "#/components/ui/input.tsx"
import { StatusBadge } from "#/components/status-badge"
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

const STATUSES = ["all", "pending", "approved", "assigned", "completed"] as const
const PAGE_SIZE = 20

function AdminRepairsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all")
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link
                    to="/admin/repairs/$requestId"
                    params={{ requestId: String(r.id) }}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {r.student_name}
                  </Link>
                </TableCell>
                <TableCell>{r.room_number}</TableCell>
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
