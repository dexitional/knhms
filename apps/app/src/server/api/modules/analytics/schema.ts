import { z } from "zod";

// Sent by the public E-Market page. A view names the listing opened; an
// order click also says which contact button was used.
export const marketEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("product_view"), productId: z.number().int().positive() }),
  z.object({ type: z.literal("vendor_view"), vendorId: z.number().int().positive() }),
  z.object({
    type: z.literal("order_click"),
    channel: z.enum(["whatsapp", "call"]),
    productId: z.number().int().positive().optional(),
    vendorId: z.number().int().positive().optional(),
  }).refine((e) => (e.productId === undefined) !== (e.vendorId === undefined), {
    message: "Give either a productId or a vendorId.",
  }),
]);

export const analyticsQuerySchema = z.object({
  days: z.coerce.number().pipe(z.union([z.literal(7), z.literal(30), z.literal(90)])).default(30),
});
