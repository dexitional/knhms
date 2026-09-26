import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Pencil, Plus, Search, Trash2, Upload } from "lucide-react"
import { api, ApiError } from "#/lib/api-client"
import { Button } from "#/components/ui/button.tsx"
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
  DialogTrigger,
} from "#/components/ui/dialog.tsx"
import { Input } from "#/components/ui/input.tsx"
import { Label } from "#/components/ui/label.tsx"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select.tsx"
import { Pagination } from "#/components/pagination"
import { ImageViewer } from "#/components/image-viewer"
import { RoomNumberBadge } from "#/components/room-number-badge"
import { BlockBadge } from "#/components/block-badge"
import { GenderBadge } from "#/components/gender-badge"

export const Route = createFileRoute("/admin/_admin/rooms/")({
  component: RoomsPage,
})

interface RoomMember {
  id: number
  full_name: string
  photo_url: string
}

interface Room {
  id: number
  room_number: string
  block: string | null
  floor: string | null
  capacity: number
  gender_type: string
  occupied: number
  members: RoomMember[]
}

const PAGE_SIZE = 20

function MemberChips({ members }: { members: RoomMember[] }) {
  if (members.length === 0) return null
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<RoomMember | null>(null)

  return (
    <>
      <div className="flex items-center gap-1">
        {members.map((member) => (
          <img
            key={member.id}
            src={member.photo_url}
            alt={member.full_name}
            title={member.full_name}
            className="size-6 rounded-full border border-border object-cover cursor-pointer hover:ring-2 hover:ring-primary"
            onClick={() => {
              setSelectedMember(member)
              setViewerOpen(true)
            }}
          />
        ))}
      </div>
      {selectedMember && (
        <ImageViewer
          open={viewerOpen}
          onOpenChange={(open) => {
            setViewerOpen(open)
            if (!open) setSelectedMember(null)
          }}
          src={selectedMember.photo_url}
          alt={selectedMember.full_name}
        />
      )}
    </>
  )
}

const roomSchema = z.object({
  roomNumber: z.string().min(1, "Required").max(20),
  block: z.string().max(20).optional(),
  floor: z.string().max(10).optional(),
  capacity: z.number().int().min(1).max(10),
  genderType: z.enum(["male", "female", "mixed"]),
})
type RoomFormValues = z.infer<typeof roomSchema>

function RoomsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["rooms", page, search],
    queryFn: () =>
      api.get<{ items: Room[]; total: number; page: number; pageSize: number }>("/rooms", {
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
      }),
  })

  const createForm = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: { capacity: 4, genderType: "mixed" },
  })

  const editForm = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
  })

  const createMutation = useMutation({
    mutationFn: (values: RoomFormValues) => api.post("/rooms", values),
    onSuccess: () => {
      toast.success("Room added.")
      queryClient.invalidateQueries({ queryKey: ["rooms"] })
      setCreateOpen(false)
      createForm.reset()
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't add room."),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: RoomFormValues }) =>
      api.patch(`/rooms/${id}`, values),
    onSuccess: () => {
      toast.success("Room updated.")
      queryClient.invalidateQueries({ queryKey: ["rooms"] })
      setEditOpen(false)
      setEditingRoom(null)
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't update room."),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/rooms/${id}`),
    onSuccess: () => {
      toast.success("Room deleted.")
      queryClient.invalidateQueries({ queryKey: ["rooms"] })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't delete room."),
  })

  const openEdit = (room: Room) => {
    setEditingRoom(room)
    editForm.reset({
      roomNumber: room.room_number,
      block: room.block ?? "",
      floor: room.floor ?? "",
      capacity: room.capacity,
      genderType: room.gender_type as "male" | "female" | "mixed",
    })
    setEditOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Rooms</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/rooms/upload">
              <Upload className="size-4" />
              Bulk Upload
            </Link>
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                Add Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Room</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
                className="flex flex-col gap-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Room Number</Label>
                    <Input {...createForm.register("roomNumber")} />
                    {createForm.formState.errors.roomNumber && (
                      <p className="text-xs text-destructive">
                        {createForm.formState.errors.roomNumber.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Capacity</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      {...createForm.register("capacity", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Block (optional)</Label>
                    <Input {...createForm.register("block")} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Floor (optional)</Label>
                    <Input {...createForm.register("floor")} />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label>Gender Type</Label>
                    <Controller
                      control={createForm.control}
                      name="genderType"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mixed">Mixed</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Saving..." : "Save Room"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search rooms..."
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
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Room</TableHead>
              <TableHead>Block</TableHead>
              <TableHead>Floor</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Occupancy</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.map((room) => (
              <TableRow key={room.id}>
                <TableCell>
                  <RoomNumberBadge roomNumber={room.room_number} occupied={room.occupied} capacity={room.capacity} />
                </TableCell>
                <TableCell>
                  <BlockBadge block={room.block} />
                </TableCell>
                <TableCell>{room.floor ?? <TableEmptyValue />}</TableCell>
                <TableCell>
                  <GenderBadge gender={room.gender_type as "male" | "female" | "mixed"} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>
                      {room.occupied} / {room.capacity}
                    </span>
                    <MemberChips members={room.members} />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit room ${room.room_number}`}
                      onClick={() => openEdit(room)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete room ${room.room_number}`}
                      onClick={() => {
                        if (confirm(`Delete room ${room.room_number}?`))
                          deleteMutation.mutate(room.id)
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Room{editingRoom ? ` — ${editingRoom.room_number}` : ""}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((values) => {
              if (!editingRoom) return
              editMutation.mutate({ id: editingRoom.id, values })
            })}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Room Number</Label>
                <Input {...editForm.register("roomNumber")} />
                {editForm.formState.errors.roomNumber && (
                  <p className="text-xs text-destructive">
                    {editForm.formState.errors.roomNumber.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Capacity</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  {...editForm.register("capacity", { valueAsNumber: true })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Block (optional)</Label>
                <Input {...editForm.register("block")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Floor (optional)</Label>
                <Input {...editForm.register("floor")} />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Gender Type</Label>
                <Controller
                  control={editForm.control}
                  name="genderType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mixed">Mixed</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
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
