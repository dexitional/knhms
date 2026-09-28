import { z } from "zod";
import { optionalField } from "../../lib/optional-field.js";

const fee = z.number().min(0).max(1_000_000);

export const updateBillingSettingsSchema = z.object({
  businessRegistrationFee: fee,
  businessMonthlyFee: fee,
  foodVendorRegistrationFee: fee,
  foodVendorMonthlyFee: fee,
  paymentInstructions: optionalField(z.string().trim().max(1000)),
});

// approved: approve a pending application, or reinstate a rejected/suspended
// seller. rejected/suspended need a reason — it's shown to the seller.
export const updateSellerStatusSchema = z
  .object({
    status: z.enum(["approved", "rejected", "suspended"]),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.status === "approved" || (v.reason && v.reason.length >= 3), {
    message: "Give the seller a reason.",
    path: ["reason"],
  });

export const recordPaymentSchema = z
  .object({
    kind: z.enum(["registration", "monthly"]),
    months: z.number().int().min(1).max(24).optional(),
    amount: z.number().positive().max(1_000_000),
    method: z.enum(["momo", "cash", "bank", "other"]),
    reference: optionalField(z.string().trim().max(100)),
    note: optionalField(z.string().trim().max(255)),
  })
  .refine((p) => p.kind === "registration" || p.months != null, {
    message: "How many months does this payment cover?",
    path: ["months"],
  });
