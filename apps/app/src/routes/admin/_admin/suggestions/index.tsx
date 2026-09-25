import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "#/lib/api-client";
import { Card, CardContent } from "#/components/ui/card.tsx";
import { Button } from "#/components/ui/button.tsx";
import { StatusBadge } from "#/components/status-badge";

export const Route = createFileRoute("/admin/_admin/suggestions/")({
  component: AdminSuggestionsPage,
});

interface SuggestionRow {
  id: number;
  subject: string | null;
  message: string;
  is_anonymous: 0 | 1;
  status: string;
  created_at: string;
  student_name?: string;
  registration_number?: string;
}

function AdminSuggestionsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-suggestions"],
    queryFn: () => api.get<{ items: SuggestionRow[]; total: number }>("/suggestions", { pageSize: 100 }),
  });

  const reviewMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/suggestions/${id}/review`),
    onSuccess: () => {
      toast.success("Marked as reviewed.");
      queryClient.invalidateQueries({ queryKey: ["admin-suggestions"] });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">Suggestions</h1>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}

      <div className="flex flex-col gap-3">
        {data?.items.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">{s.subject ?? "Suggestion"}</p>
                <p className="text-sm text-muted-foreground">{s.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.student_name ? `${s.student_name} (${s.registration_number})` : "Anonymous"} &middot;{" "}
                  {new Date(s.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={s.status} />
                {s.status === "new" && (
                  <Button size="sm" variant="outline" onClick={() => reviewMutation.mutate(s.id)}>
                    Mark Reviewed
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
