import { z } from "zod";

export const uploadFolderSchema = z.enum(["student-photos", "receipts", "admin-photos"]);

export const presignSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  folder: uploadFolderSchema,
});
