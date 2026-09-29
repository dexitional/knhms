import { z } from "zod";

export const adminRoleSchema = z.enum(["super_admin", "admin", "staff", "tutor", "technician", "stores", "supervisor", "editor"]);

export const createAdminSchema = z.object({
  fullName: z.string().min(2).max(150),
  staffNumber: z.string().min(1).max(50),
  role: adminRoleSchema,
  position: z.string().max(100).optional(),
  phoneNumber: z.string().max(20).optional(),
  photoUrl: z.string().url().optional(),
  institutionalEmail: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const updateAdminSchema = z.object({
  fullName: z.string().min(2).max(150).optional(),
  role: adminRoleSchema.optional(),
  position: z.string().max(100).nullable().optional(),
  phoneNumber: z.string().max(20).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const resetAdminPasswordSchema = z.object({
  id: z.number().int(),
});
