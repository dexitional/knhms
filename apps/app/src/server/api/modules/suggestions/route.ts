import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ANY_ADMIN, requireAdminRole, requireStudent } from "../../middleware/require-auth.js";
import { createSuggestionSchema, listSuggestionsQuerySchema } from "./schema.js";
import * as service from "./service.js";

export const suggestionsRoute = new Hono()
  .post("/", requireStudent, zValidator("json", createSuggestionSchema), async (c) => {
    const suggestion = await service.createSuggestion(c.get("student").id, c.req.valid("json"));
    return c.json({ suggestion }, 201);
  })
  .get("/mine", requireStudent, async (c) => {
    const suggestions = await service.listMySuggestions(c.get("student").id);
    return c.json({ suggestions });
  })

  .get("/", requireAdminRole(ANY_ADMIN), zValidator("query", listSuggestionsQuerySchema), async (c) => {
    const result = await service.listSuggestions(c.req.valid("query"));
    return c.json(result);
  })
  .patch("/:id/review", requireAdminRole(ANY_ADMIN), async (c) => {
    await service.markReviewed(Number(c.req.param("id")));
    return c.json({ ok: true });
  });
