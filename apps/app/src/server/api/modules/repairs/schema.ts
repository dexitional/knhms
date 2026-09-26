import { z } from "zod";

export const repairStatusSchema = z.enum(["pending", "approved", "assigned", "completed"]);

export const createRepairRequestSchema = z.object({
  category: z.string().max(50).optional(),
  description: z.string().min(5, "Please describe the issue").max(2000),
});

export const updateStudentRemarksSchema = z.object({
  studentRemarks: z.string().max(2000),
});

export const listRepairsQuerySchema = z.object({
  search: z.string().optional(),
  status: repairStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateRepairAdminSchema = z.object({
  status: repairStatusSchema.optional(),
  assignedAdminId: z.number().int().nullable().optional(),
  adminRemarks: z.string().max(2000).optional(),
});
