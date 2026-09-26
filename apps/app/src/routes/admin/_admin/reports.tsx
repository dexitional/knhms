import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "#/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card.tsx";
import { StatusBadge } from "#/components/status-badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select.tsx";
import { Badge } from "#/components/ui/badge";
import { RoomNumberBadge } from "#/components/room-number-badge";
import { GenderBadge } from "#/components/gender-badge";
import { Pagination } from "#/components/pagination";

export const Route = createFileRoute("/admin/_admin/reports")({
  component: ReportsPage,
});

interface StudentReportRow {
  id: number;
  full_name: string;
  registration_number: string;
  level: string;
  gender: string;
  room_number: string;
  registered_at: string;
}

interface RepairReportRow {
  id: number;
  room_number: string;
  student_name: string;
  registration_number: string;
  status: string;
  created_at: string;
}

function ReportsPage() {
  const [studentsPage, setStudentsPage] = useState(1)
  const [repairsPage, setRepairsPage] = useState(1)
  const STUDENTS_PAGE_SIZE = 5
  const REPAIRS_PAGE_SIZE = 10

  const { data: studentsData } = useQuery({
    queryKey: ["reports", "students", studentsPage],
    queryFn: () =>
      api.get<{ students: StudentReportRow[]; total: number; page: number; pageSize: number }>(
        "/reports/students",
        { page: studentsPage, pageSize: STUDENTS_PAGE_SIZE },
      ),
  });
  const { data: repairsData } = useQuery({
    queryKey: ["reports", "repairs", repairsPage],
    queryFn: () =>
      api.get<{
        statusCounts: { status: string; count: number }[]
        items: RepairReportRow[]
        total: number
        page: number
        pageSize: number
      }>("/reports/repairs", { page: repairsPage, pageSize: REPAIRS_PAGE_SIZE }),
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">Reports</h1>

      <Card>
        <CardHeader>
          <CardTitle>Registered Students</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Reg. Number</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentsData?.students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell>{s.registration_number}</TableCell>
                  <TableCell>
                    <RoomNumberBadge roomNumber={s.room_number} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">Level {s.level}</Badge>
                  </TableCell>
                  <TableCell>
                    <GenderBadge gender={s.gender as "male" | "female" | "mixed"} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(s.registered_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {studentsData && (
            <Pagination
              page={studentsData.page}
              pageSize={studentsData.pageSize}
              total={studentsData.total}
              onPageChange={setStudentsPage}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Repair Requests</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="mb-4 flex flex-wrap gap-3 px-6">
            {repairsData?.statusCounts.map((sc) => (
              <div key={sc.status} className="rounded-lg border border-border px-4 py-2 text-center">
                <p className="text-lg font-bold text-foreground">{sc.count}</p>
                <p className="text-xs text-muted-foreground capitalize">{sc.status}</p>
              </div>
            ))}
          </div>
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Student</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repairsData?.items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.student_name}</TableCell>
                  <TableCell>
                    <RoomNumberBadge roomNumber={r.room_number} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {repairsData && (
            <Pagination
              page={repairsData.page}
              pageSize={repairsData.pageSize}
              total={repairsData.total}
              onPageChange={setRepairsPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
