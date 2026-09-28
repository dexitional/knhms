import { z } from "zod";

// Optional fields accept "" from admin forms and store it as NULL;
// undefined (field omitted on PATCH) leaves the column untouched.
export function optionalField<T extends z.ZodType<string>>(schema: T) {
  return z
    .union([schema, z.literal("")])
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null));
}
