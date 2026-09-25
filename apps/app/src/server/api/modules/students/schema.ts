import { z } from "zod";

export const listStudentsQuerySchema = z.object({
  search: z.string().optional(),
  roomId: z.coerce.number().int().optional(),
  level: z.enum(["100", "200", "300", "400", "500", "600"]).optional(),
  gender: z.enum(["male", "female"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateStudentSchema = z.object({
  roomId: z.number().int().optional(),
  gender: z.enum(["male", "female"]).optional(),
  fullName: z.string().min(2).max(150).optional(),
  programme: z.string().min(2).max(150).optional(),
  level: z.enum(["100", "200", "300", "400", "500", "600"]).optional(),
  phoneCountryCode: z.string().max(5).optional(),
  phoneNumber: z.string().max(20).optional(),
  emergencyContactName: z.string().max(150).optional(),
  emergencyContactNumber: z.string().max(20).optional(),
});

export const updateOwnProfileSchema = z.object({
  phoneCountryCode: z.string().min(1).max(5).optional(),
  phoneNumber: z.string().min(6).max(20).optional(),
  emergencyContactName: z.string().min(2).max(150).optional(),
  emergencyContactNumber: z.string().min(6).max(20).optional(),
  passportPhotoUrl: z.string().url().optional(),
});
