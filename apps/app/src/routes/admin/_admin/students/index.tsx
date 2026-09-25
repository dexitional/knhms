import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "#/lib/api-client";
import { Badge } from "#/components/ui/badge.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table.tsx";

export const Route = createFileRoute("/admin/_admin/students/")({
  component: StudentsPage,
});

interface StudentRow {
  id: number;
  full_name: string;
  registration_number: string;
  room_number: string;
  level: string;
  gender: string;
  email: string;
  passport_photo_url: string;
}

function StudentsPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["students", search],
    queryFn: () =>
      api.get<{ items: StudentRow[]; total: number }>("/students", { search, pageSize: 50 }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Students</h1>
        <Input
          placeholder="Search by name, reg. number, or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
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
                    className="size-10 rounded-full border border-border object-cover"
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
                <TableCell>{student.room_number}</TableCell>
                <TableCell>
                  <Badge variant="secondary">Level {student.level}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={student.gender === "male" ? "info" : "purple"} className="capitalize">
                    {student.gender}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{student.email}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
