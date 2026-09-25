import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DoorOpen, MessageSquareHeart, ShoppingBag, Users, Wrench } from "lucide-react";
import { api } from "#/lib/api-client";
import { Card, CardContent } from "#/components/ui/card.tsx";

export const Route = createFileRoute("/admin/_admin/")({
  component: AdminOverviewPage,
});

interface Overview {
  totalStudents: number;
  totalRooms: number;
  totalCapacity: number;
  occupied: number;
  occupancyRate: number;
  repairStatusCounts: { status: string; count: number }[];
  pendingOrders: number;
  newSuggestions: number;
}

function AdminOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "overview"],
    queryFn: () => api.get<Overview>("/reports/overview"),
  });

  if (isLoading || !data) return <p className="text-muted-foreground">Loading...</p>;

  const repairCount = (status: string) =>
    data.repairStatusCounts.find((r) => r.status === status)?.count ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Registered Students" value={data.totalStudents} />
        <StatCard
          icon={DoorOpen}
          label="Occupancy"
          value={`${data.occupied} / ${data.totalCapacity}`}
          sub={`${data.occupancyRate}% of capacity across ${data.totalRooms} rooms`}
        />
        <StatCard icon={ShoppingBag} label="Pending Orders" value={data.pendingOrders} />
        <StatCard icon={MessageSquareHeart} label="New Suggestions" value={data.newSuggestions} />
      </div>

      <Card>
        <CardContent>
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
            <Wrench className="size-4" /> Repair Requests by Status
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {["pending", "approved", "assigned", "completed"].map((status) => (
              <div key={status} className="rounded-lg border border-border p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{repairCount(status)}</p>
                <p className="text-xs text-muted-foreground capitalize">{status}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
