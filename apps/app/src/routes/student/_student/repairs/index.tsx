import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "#/lib/api-client";
import { Card, CardContent } from "#/components/ui/card.tsx";
import { Button } from "#/components/ui/button.tsx";
import { StatusBadge } from "#/components/status-badge";

export const Route = createFileRoute("/student/_student/repairs/")({
  component: MyRepairsPage,
});

interface RepairRequest {
  id: number;
  category: string | null;
  description: string;
  status: string;
  admin_remarks: string | null;
  created_at: string;
}

function MyRepairsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["repairs", "mine"],
    queryFn: () => api.get<{ requests: RepairRequest[] }>("/repairs/mine"),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Repair Requests</h1>
        <Button asChild>
          <Link to="/student/repairs/new">New Request</Link>
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}
      {data?.requests.length === 0 && (
        <p className="text-muted-foreground">You haven't submitted any repair requests yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {data?.requests.map((request) => (
          <Card key={request.id}>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-foreground">{request.category ?? "General repair"}</p>
                  <p className="text-sm text-muted-foreground">{request.description}</p>
                </div>
                <StatusBadge status={request.status} />
              </div>
              {request.admin_remarks && (
                <p className="rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Hall response: </span>
                  {request.admin_remarks}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Submitted {new Date(request.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
