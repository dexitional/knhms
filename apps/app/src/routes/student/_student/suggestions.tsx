import { createFileRoute } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "#/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Checkbox } from "#/components/ui/checkbox.tsx";
import { StatusBadge } from "#/components/status-badge";

export const Route = createFileRoute("/student/_student/suggestions")({
  component: SuggestionsPage,
});

const schema = z.object({
  subject: z.string().max(150).optional(),
  message: z.string().min(5, "Please share your suggestion").max(2000),
  isAnonymous: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

interface Suggestion {
  id: number;
  subject: string | null;
  message: string;
  is_anonymous: 0 | 1;
  status: string;
  created_at: string;
}

function SuggestionsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["suggestions", "mine"],
    queryFn: () => api.get<{ suggestions: Suggestion[] }>("/suggestions/mine"),
  });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isAnonymous: false },
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => api.post("/suggestions", values),
    onSuccess: () => {
      toast.success("Suggestion sent — thank you!");
      reset({ subject: "", message: "", isAnonymous: false });
      queryClient.invalidateQueries({ queryKey: ["suggestions", "mine"] });
    },
    onError: () => toast.error("Couldn't send your suggestion. Please try again."),
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">Suggestions</h1>

      <Card>
        <CardHeader>
          <CardTitle>Share feedback with hall management</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((values) => createMutation.mutate(values))}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label>Subject (optional)</Label>
              <Input placeholder="What's this about?" {...register("subject")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Message</Label>
              <Textarea rows={4} placeholder="Share your suggestion" {...register("message")} />
              {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
            </div>
            <Controller
              control={control}
              name="isAnonymous"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} />
                  Submit anonymously (hall admins won't see your identity)
                </label>
              )}
            />
            <Button type="submit" disabled={createMutation.isPending} className="w-fit">
              {createMutation.isPending ? "Sending..." : "Send Suggestion"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {data?.suggestions.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">{s.subject ?? "Suggestion"}</p>
                <p className="text-sm text-muted-foreground">{s.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString()}
                  {s.is_anonymous ? " · Sent anonymously" : ""}
                </p>
              </div>
              <StatusBadge status={s.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
