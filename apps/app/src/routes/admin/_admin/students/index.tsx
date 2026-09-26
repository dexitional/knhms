import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { api } from "#/lib/api-client"
import { Badge } from "#/components/ui/badge.tsx"
import { Input } from "#/components/ui/input.tsx"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table.tsx"
import { Pagination } from "#/components/pagination"
import { ImageViewer } from "#/components/image-viewer"
import { GenderBadge } from "#/components/gender-badge"
import { RoomNumberBadge } from "#/components/room-number-badge"

export const Route = createFileRoute("/admin/_admin/students/")({
  component: StudentsPage,
})

interface StudentRow {
  id: number
  full_name: string
  registration_number: string
  room_number: string
  level: string
  gender: string
  email: string
  passport_photo_url: string
}

const PAGE_SIZE = 20

function StudentsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<{ src: string; alt: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["students", page, search],
    queryFn: () =>
      api.get<{ items: StudentRow[]; total: number; page: number; pageSize: number }>(
        "/students",
        { page, pageSize: PAGE_SIZE, search: search || undefined },
      ),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Students</h1>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, reg. number, or email"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-8"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {isLoading && <p className="px-6 py-4 text-muted-foreground">Loading...</p>}
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16" />
              <TableHead>Name</TableHead>
              <TableHead>Reg. Number</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="pr-0">
                  <img
                    src={student.passport_photo_url}
                    alt={student.full_name}
                    className="size-10 rounded-full border border-border object-cover cursor-pointer hover:ring-2 hover:ring-primary"
                    onClick={() => {
                      setSelectedPhoto({ src: student.passport_photo_url, alt: student.full_name })
                      setViewerOpen(true)
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Link
                    to="/admin/students/$studentId"
                    params={{ studentId: String(student.id) }}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {student.full_name}
                  </Link>
                </TableCell>
                <TableCell>{student.registration_number}</TableCell>
                <TableCell>
                  <RoomNumberBadge roomNumber={student.room_number} />
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">Level {student.level}</Badge>
                </TableCell>
                <TableCell>
                  <GenderBadge gender={student.gender as "male" | "female" | "mixed"} />
                </TableCell>
                <TableCell className="text-muted-foreground">{student.email}</TableCell>
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
        {selectedPhoto && (
          <ImageViewer
            open={viewerOpen}
            onOpenChange={(open) => {
              setViewerOpen(open)
              if (!open) setSelectedPhoto(null)
            }}
            src={selectedPhoto.src}
            alt={selectedPhoto.alt}
          />
        )}
      </div>
    </div>
  )
}
