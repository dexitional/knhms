import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
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

export const Route = createFileRoute("/student/_student/orders/new")({
  component: NewOrderPage,
});

const schema = z.object({
  serviceType: z.string().min(2, "Please describe the service").max(100),
  details: z.string().max(2000).optional(),
  quantity: z.number().int().min(1).max(100),
});
type FormValues = z.infer<typeof schema>;

function NewOrderPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 1 },
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => api.post("/orders", values),
    onSuccess: () => {
      toast.success("Order placed.");
      navigate({ to: "/student/orders" });
    },
    onError: () => toast.error("Couldn't place your order. Please try again."),
  });

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Place an Order</h1>
      <Card>
        <CardHeader>
          <CardTitle>Order details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((values) => createMutation.mutate(values))}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label>Service</Label>
              <Input placeholder="e.g. Laundry, Room Cleaning" {...register("serviceType")} />
              {errors.serviceType && <p className="text-xs text-destructive">{errors.serviceType.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Quantity</Label>
              <Input type="number" min={1} max={100} {...register("quantity", { valueAsNumber: true })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Additional details (optional)</Label>
              <Textarea rows={4} placeholder="Any specifics for this order" {...register("details")} />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Placing order..." : "Place Order"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
