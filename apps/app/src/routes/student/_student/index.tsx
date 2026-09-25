import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareHeart, ShoppingBag, Wrench } from "lucide-react";
import { api } from "#/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card.tsx";
import { Button } from "#/components/ui/button.tsx";

export const Route = createFileRoute("/student/_student/")({
  component: StudentDashboardHome,
});

interface StudentProfile {
  full_name: string;
  registration_number: string;
  room_number: string;
  programme: string;
  level: string;
  passport_photo_url: string;
}

function StudentDashboardHome() {
  const { student } = Route.useRouteContext();

  const { data: repairs } = useQuery({
    queryKey: ["repairs", "mine"],
    queryFn: () => api.get<{ requests: { status: string }[] }>("/repairs/mine"),
  });
  const { data: orders } = useQuery({
    queryKey: ["orders", "mine"],
    queryFn: () => api.get<{ orders: { status: string }[] }>("/orders/mine"),
  });
  const { data: profileData } = useQuery({
    queryKey: ["students", "me"],
    queryFn: () => api.get<{ student: StudentProfile }>("/students/me"),
  });

  const pendingRepairs = repairs?.requests.filter((r) => r.status !== "completed").length ?? 0;
  const activeOrders = orders?.orders.filter((o) => o.status === "pending" || o.status === "processing").length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-md">
        <CardContent className="flex items-center gap-5">
          {profileData?.student.passport_photo_url && (
            <img
              src={profileData.student.passport_photo_url}
              alt={student.fullName}
              className="size-20 rounded-2xl border-2 border-white object-cover shadow-md sm:size-24"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome, {student.fullName.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground">
              Room {student.roomNumber} &middot; {profileData?.student.programme}{" "}
              {profileData?.student.level && `(Level ${profileData.student.level})`}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wrench className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingRepairs}</p>
              <p className="text-sm text-muted-foreground">Active repair requests</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShoppingBag className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeOrders}</p>
              <p className="text-sm text-muted-foreground">Active orders</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageSquareHeart className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Have feedback for the hall?</p>
              <Link to="/student/suggestions" className="text-sm font-medium text-primary hover:underline">
                Send a suggestion
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Report a repair</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Something broken in your room? Let hall maintenance know.
            </p>
            <Button asChild>
              <Link to="/student/repairs/new">New Repair Request</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Need a hall service?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Place an order for laundry, cleaning, and more.
            </p>
            <Button asChild variant="outline">
              <Link to="/student/orders/new">Place an Order</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
