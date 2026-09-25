import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "#/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { Button } from "#/components/ui/button.tsx";

export const Route = createFileRoute("/student/_student/repairs/new")({
  component: NewRepairRequestPage,
});

const schema = z.object({
  category: z.string().max(50).optional(),
  description: z.string().min(5, "Please describe the issue").max(2000),
});
type FormValues = z.infer<typeof schema>;

function NewRepairRequestPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => api.post("/repairs", values),
    onSuccess: () => {
      toast.success("Repair request submitted.");
      navigate({ to: "/student/repairs" });
    },
    onError: () => toast.error("Couldn't submit your request. Please try again."),
  });

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold text-foreground">New Repair Request</h1>
      <Card>
        <CardHeader>
          <CardTitle>Describe the issue</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((values) => createMutation.mutate(values))}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label>Category (optional)</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => <Input placeholder="e.g. Plumbing, Electrical" {...field} />}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Description</Label>
              <Textarea rows={5} placeholder="Describe the issue in detail" {...register("description")} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
