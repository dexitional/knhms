import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, Upload } from "lucide-react";
import { api, ApiError } from "#/lib/api-client";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableEmptyValue,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select.tsx";

export const Route = createFileRoute("/admin/_admin/rooms/")({
  component: RoomsPage,
});

interface RoomMember {
  id: number;
  full_name: string;
  photo_url: string;
}

interface Room {
  id: number;
  room_number: string;
  block: string | null;
  floor: string | null;
  capacity: number;
  gender_type: string;
  occupied: number;
  members: RoomMember[];
}

const GENDER_VARIANT: Record<string, "info" | "purple" | "secondary"> = {
  male: "info",
  female: "purple",
  mixed: "secondary",
};

function MemberChips({ members }: { members: RoomMember[] }) {
  if (members.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {members.map((member) => (
        <img
          key={member.id}
          src={member.photo_url}
          alt={member.full_name}
          title={member.full_name}
          className="size-6 rounded-full border border-border object-cover"
        />
      ))}
    </div>
  );
}

const roomSchema = z.object({
  roomNumber: z.string().min(1, "Required").max(20),
  block: z.string().max(20).optional(),
  floor: z.string().max(10).optional(),
  capacity: z.number().int().min(1).max(10),
  genderType: z.enum(["male", "female", "mixed"]),
});
type RoomFormValues = z.infer<typeof roomSchema>;

function RoomsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => api.get<{ items: Room[]; total: number }>("/rooms", { pageSize: 100 }),
  });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: { capacity: 4, genderType: "mixed" },
  });

  const createMutation = useMutation({
    mutationFn: (values: RoomFormValues) => api.post("/rooms", values),
    onSuccess: () => {
      toast.success("Room added.");
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setDialogOpen(false);
      reset();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't add room."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/rooms/${id}`),
    onSuccess: () => {
      toast.success("Room deleted.");
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't delete room."),
  });

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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                onSubmit={handleSubmit((values) => createMutation.mutate(values))}
                className="flex flex-col gap-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Room Number</Label>
                    <Input {...register("roomNumber")} />
                    {errors.roomNumber && <p className="text-xs text-destructive">{errors.roomNumber.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Capacity</Label>
                    <Input type="number" min={1} max={10} {...register("capacity", { valueAsNumber: true })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Block (optional)</Label>
                    <Input {...register("block")} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Floor (optional)</Label>
                    <Input {...register("floor")} />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label>Gender Type</Label>
                    <Controller
                      control={control}
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
                <TableCell className="font-medium">{room.room_number}</TableCell>
                <TableCell>{room.block ?? <TableEmptyValue />}</TableCell>
                <TableCell>{room.floor ?? <TableEmptyValue />}</TableCell>
                <TableCell>
                  <Badge variant={GENDER_VARIANT[room.gender_type] ?? "secondary"} className="capitalize">
                    {room.gender_type}
                  </Badge>
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
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete room ${room.room_number}`}
                    onClick={() => {
                      if (confirm(`Delete room ${room.room_number}?`)) deleteMutation.mutate(room.id);
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
