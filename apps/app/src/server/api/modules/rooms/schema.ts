import { z } from "zod";

export const roomGenderTypeSchema = z.enum(["male", "female", "mixed"]);

export const createRoomSchema = z.object({
  roomNumber: z.string().min(1).max(20),
  block: z.string().max(20).optional(),
  floor: z.string().max(10).optional(),
  capacity: z.number().int().min(1).max(10).default(4),
  genderType: roomGenderTypeSchema.default("mixed"),
});

export const updateRoomSchema = z.object({
  roomNumber: z.string().min(1).max(20).optional(),
  block: z.string().max(20).nullable().optional(),
  floor: z.string().max(10).nullable().optional(),
  capacity: z.number().int().min(1).max(10).optional(),
  genderType: roomGenderTypeSchema.optional(),
  isActive: z.boolean().optional(),
});

export const listRoomsQuerySchema = z.object({
  search: z.string().optional(),
  genderType: roomGenderTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
