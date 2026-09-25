import { z } from "zod";

export const createSuggestionSchema = z.object({
  subject: z.string().max(150).optional(),
  message: z.string().min(5).max(2000),
  isAnonymous: z.boolean().default(false),
});

export const listSuggestionsQuerySchema = z.object({
  status: z.enum(["new", "reviewed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
