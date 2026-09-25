import { z } from "zod";

export const orderStatusSchema = z.enum(["pending", "processing", "completed", "cancelled"]);

export const createOrderSchema = z.object({
  serviceType: z.string().min(2).max(100),
  details: z.string().max(2000).optional(),
  quantity: z.number().int().min(1).max(100).default(1),
});

export const listOrdersQuerySchema = z.object({
  status: orderStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateOrderAdminSchema = z.object({
  status: orderStatusSchema.optional(),
  adminRemarks: z.string().max(2000).optional(),
});
