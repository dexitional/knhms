import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "#/lib/api-client";
import { getAdminSession } from "#/server/session";
import { RoomNumberBadge } from "#/components/room-number-badge";

export const Route = createFileRoute("/print/repairs/$requestId")({
  beforeLoad: async () => {
    const admin = await getAdminSession();
    if (!admin) throw new Error("Not authenticated");
  },
  component: RepairPrintPage,
});

interface RepairDetail {
  id: number;
  room_number: string;
  student_name: string;
  registration_number: string;
  category: string | null;
  description: string;
  status: string;
  assigned_admin_id: number | null;
  assigned_admin_name: string | null;
  student_remarks: string | null;
  admin_remarks: string | null;
  created_at: string;
}

function RepairPrintPage() {
  const { requestId } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-repairs", requestId],
    queryFn: () => api.get<{ request: RepairDetail }>(`/repairs/${requestId}`),
  });

  if (isLoading || !data) return <p className="text-center text-gray-600 py-20">Loading...</p>;
  const r = data.request;

  return (
    <PrintContent r={r} />
  );
}

function PrintContent({ r }: { r: RepairDetail }) {
  useEffect(() => {
    window.print();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white min-h-screen">
      <div className="text-center mb-6 border-b-2 border-gray-900 pb-4">
        <img src="/logo.png" alt="KNH Logo" className="h-16 w-auto mx-auto mb-3" />
        <h1 className="text-3xl font-bold text-gray-900">KNH - Repair Request Printout</h1>
        <p className="text-gray-600 text-lg mt-1">Kwame Nkrumah Hall - Maintenance System</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <p className="font-semibold text-gray-900">Request ID</p>
          <p className="text-gray-700">#{r.id}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-900">Status</p>
          <p className="text-gray-700 capitalize">{r.status}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-900">Category</p>
          <p className="text-gray-700">{r.category ?? "General"}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-900">Room</p>
          <p className="text-gray-700">
            <RoomNumberBadge roomNumber={r.room_number} />
          </p>
        </div>
        <div>
          <p className="font-semibold text-gray-900">Submitted</p>
          <p className="text-gray-700">{new Date(r.created_at).toLocaleString()}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-900">Printed</p>
          <p className="text-gray-700">{new Date().toLocaleString()}</p>
        </div>
      </div>

      <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-2">Student Details</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="font-medium text-gray-600">Name:</p>
            <p className="text-gray-900">{r.student_name}</p>
          </div>
          <div>
            <p className="font-medium text-gray-600">Reg. Number:</p>
            <p className="text-gray-900">{r.registration_number}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-2">Technician Assignment</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="font-medium text-gray-600">Assigned To:</p>
            <p className="text-gray-900">{r.assigned_admin_name ?? "Unassigned"}</p>
          </div>
          <div>
            <p className="font-medium text-gray-600">Status:</p>
            <p className="text-gray-900 capitalize">{r.status}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="font-semibold text-gray-900 mb-2">Issue Description</h3>
        <p className="text-gray-700 whitespace-pre-wrap">{r.description}</p>
      </div>

      {r.student_remarks && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-2">Student Remarks</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{r.student_remarks}</p>
        </div>
      )}

      {r.admin_remarks && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-2">Admin/Technician Remarks</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{r.admin_remarks}</p>
        </div>
      )}

      <div className="border-t-2 border-gray-900 pt-4 text-center text-sm text-gray-600">
        <p>This document was generated from the KNH Maintenance System.</p>
        <p className="mt-4">Technician Signature: _________________________    Date: _______________</p>
        <p className="mt-2">Student Signature: _________________________    Date: _______________</p>
      </div>
    </div>
  );
}