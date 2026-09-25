import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api } from "#/lib/api-client";
import { Button } from "#/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card.tsx";

export const Route = createFileRoute("/admin/_admin/students/$studentId")({
  component: StudentDetailPage,
});

interface StudentDetail {
  id: number;
  full_name: string;
  registration_number: string;
  room_number: string;
  programme: string;
  level: string;
  gender: string;
  email: string;
  phone_country_code: string;
  phone_number: string;
  passport_photo_url: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
  id_type: string;
  id_number: string;
  receipt_url: string;
  locked_until: string | null;
  created_at: string;
}

function StudentDetailPage() {
  const { studentId } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["students", studentId],
    queryFn: () => api.get<{ student: StudentDetail }>(`/students/${studentId}`),
  });

  if (isLoading || !data) return <p className="text-muted-foreground">Loading...</p>;
  const s = data.student;

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/admin/students">
          <ArrowLeft className="size-4" />
          Back to Students
        </Link>
      </Button>

      <div className="flex items-center gap-4">
        <img src={s.passport_photo_url} alt="" className="size-20 rounded-xl object-cover" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">{s.full_name}</h1>
          <p className="text-muted-foreground">
            {s.registration_number} &middot; Room {s.room_number}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <Field label="Programme" value={s.programme} />
          <Field label="Level" value={s.level} />
          <Field label="Gender" value={s.gender} />
          <Field label="Email" value={s.email} />
          <Field label="Phone" value={`${s.phone_country_code} ${s.phone_number}`} />
          <Field
            label="Identification"
            value={`${s.id_type === "ghana_card" ? "Ghana Card" : "Passport"} — ${s.id_number}`}
          />
          <Field label="Emergency Contact" value={s.emergency_contact_name} />
          <Field label="Emergency Contact Number" value={s.emergency_contact_number} />
          <Field label="Registered" value={new Date(s.created_at).toLocaleString()} />
          {s.locked_until && new Date(s.locked_until) > new Date() && (
            <Field label="Account Status" value={`Locked until ${new Date(s.locked_until).toLocaleString()}`} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Receipt</CardTitle>
        </CardHeader>
        <CardContent>
          <a href={s.receipt_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            View uploaded receipt
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}
