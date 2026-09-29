import { useEffect } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { api } from "#/lib/api-client"
import { asset } from "#/lib/asset"
import { STATUS_LABELS, formatDateTime } from "#/lib/inventory"
import type { InventoryRequest } from "#/lib/inventory"
import { getAdminSession } from "#/server/session"

// Printable stores requisition form for one inventory request. Signature
// lines are left blank for handwritten sign-off; recorded approvals and
// releases are printed with their names and times.
export const Route = createFileRoute("/print/inventory/$requestId")({
  beforeLoad: async () => {
    const admin = await getAdminSession()
    if (!admin) throw new Error("Not authenticated")
  },
  component: InventoryPrintPage,
})

function InventoryPrintPage() {
  const { requestId } = Route.useParams()
  const { data, isLoading, error } = useQuery({
    queryKey: ["inventory", "print", requestId],
    queryFn: () => api.get<{ request: InventoryRequest }>(`/inventory/requests/${requestId}`),
  })
  if (error) return <p className="py-20 text-center text-gray-600">This request couldn't be loaded.</p>
  if (isLoading || !data) return <p className="py-20 text-center text-gray-600">Loading...</p>
  return <PrintForm r={data.request} />
}

function SignOff({ role, name, at }: { role: string; name?: string | null; at?: string | null }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <p className="font-semibold text-gray-900">{role}</p>
      <p className="text-gray-700">
        Name: <span className="inline-block min-w-40 border-b border-gray-400">{name ?? ""}</span>
      </p>
      <p className="text-gray-700">
        Date: <span className="inline-block min-w-40 border-b border-gray-400">{at ? formatDateTime(at) : ""}</span>
      </p>
      <p className="mt-4 text-gray-700">
        Signature: <span className="inline-block min-w-40 border-b border-gray-400">&nbsp;</span>
      </p>
    </div>
  )
}

function PrintForm({ r }: { r: InventoryRequest }) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 300)
    return () => clearTimeout(t)
  }, [])
  const released = r.status === "released"

  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-white p-8 font-[Roboto,sans-serif] text-gray-900 print:p-0">
      <header className="flex items-center gap-4 border-b-2 border-gray-900 pb-4">
        <img src={asset("logo.png")} alt="" className="h-16 w-auto" />
        <div className="flex-1">
          <p className="text-xl font-bold">Kwame Nkrumah Hall</p>
          <p className="text-sm text-gray-600">University of Cape Coast · Hall Stores</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tracking-wide uppercase">Stores Requisition</p>
          <p className="font-mono text-base font-semibold">{r.reference}</p>
        </div>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <div>
          <p className="font-semibold">Requested by</p>
          <p className="text-gray-700">{r.requested_by_name ?? "—"}</p>
        </div>
        <div>
          <p className="font-semibold">Date requested</p>
          <p className="text-gray-700">{formatDateTime(r.created_at)}</p>
        </div>
        <div>
          <p className="font-semibold">Status</p>
          <p className="text-gray-700">{STATUS_LABELS[r.status]}</p>
        </div>
        <div>
          <p className="font-semibold">Printed</p>
          <p className="text-gray-700">{formatDateTime(new Date().toISOString())}</p>
        </div>
        <div className="col-span-2">
          <p className="font-semibold">Purpose</p>
          <p className="text-gray-700">{r.purpose}</p>
        </div>
      </section>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 px-3 py-2 text-left">#</th>
            <th className="border border-gray-400 px-3 py-2 text-left">Item</th>
            <th className="border border-gray-400 px-3 py-2 text-right">Qty requested</th>
            <th className="border border-gray-400 px-3 py-2 text-right">Qty issued</th>
            <th className="border border-gray-400 px-3 py-2 text-left">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {r.items.map((l, i) => (
            <tr key={l.item_id}>
              <td className="border border-gray-400 px-3 py-2">{i + 1}</td>
              <td className="border border-gray-400 px-3 py-2">{l.item_name}</td>
              <td className="border border-gray-400 px-3 py-2 text-right font-semibold">{l.quantity}</td>
              <td className="border border-gray-400 px-3 py-2 text-right">{released ? l.quantity : ""}</td>
              <td className="border border-gray-400 px-3 py-2" />
            </tr>
          ))}
        </tbody>
      </table>

      {r.decision_note && (
        <p className="mt-4 text-sm">
          <span className="font-semibold">{r.status === "rejected" ? "Reason for rejection: " : "Approval note: "}</span>
          {r.decision_note}
        </p>
      )}

      <section className="mt-10 grid grid-cols-2 gap-x-10 gap-y-10">
        <SignOff role="Requested by" name={r.requested_by_name} at={r.created_at} />
        {r.status === "rejected" ? (
          <SignOff role="Rejected by" name={r.rejected_by_name} at={r.rejected_at} />
        ) : (
          <SignOff role="Approved by (Super Admin)" name={r.approved_by_name} at={r.approved_at} />
        )}
        <SignOff role="Released by (Stores)" name={r.released_by_name} at={r.released_at} />
        <SignOff role="Received by" />
      </section>

      <footer className="mt-12 border-t border-gray-300 pt-3 text-center text-xs text-gray-500">
        Generated by the KNH Hall Management System · Leadership by Example
      </footer>
    </div>
  )
}
