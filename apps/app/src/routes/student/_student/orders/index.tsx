import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "#/lib/api-client";
import { Card, CardContent } from "#/components/ui/card.tsx";
import { Button } from "#/components/ui/button.tsx";
import { StatusBadge } from "#/components/status-badge";

export const Route = createFileRoute("/student/_student/orders/")({
  component: MyOrdersPage,
});

interface Order {
  id: number;
  service_type: string;
  details: string | null;
  quantity: number;
  status: string;
  admin_remarks: string | null;
  created_at: string;
}

function MyOrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["orders", "mine"],
    queryFn: () => api.get<{ orders: Order[] }>("/orders/mine"),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">My Orders</h1>
        <Button asChild>
          <Link to="/student/orders/new">Place an Order</Link>
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}
      {data?.orders.length === 0 && <p className="text-muted-foreground">You haven't placed any orders yet.</p>}

      <div className="flex flex-col gap-3">
        {data?.orders.map((order) => (
          <Card key={order.id}>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-foreground">
                    {order.service_type} &times; {order.quantity}
                  </p>
                  {order.details && <p className="text-sm text-muted-foreground">{order.details}</p>}
                </div>
                <StatusBadge status={order.status} />
              </div>
              {order.admin_remarks && (
                <p className="rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Hall response: </span>
                  {order.admin_remarks}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Placed {new Date(order.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
