import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ADMIN_ONLY, ANY_ADMIN, requireAdminRole } from "../../middleware/require-auth.js";
import { createDirectoryEntrySchema, updateDirectoryEntrySchema } from "./schema.js";
import * as service from "./service.js";

export const directoryRoute = new Hono()
  // Public: the Yellow Pages page lists active entries without a session.
  .get("/public", async (c) => {
    const entries = await service.listActiveEntries();
    return c.json({ entries });
  })
  .get("/", requireAdminRole(ANY_ADMIN), async (c) => {
    const entries = await service.listEntries();
    return c.json({ entries });
  })
  .get("/:id", requireAdminRole(ANY_ADMIN), async (c) => {
    const entry = await service.getEntry(Number(c.req.param("id")));
    return c.json({ entry });
  })
  .use("*", requireAdminRole(ADMIN_ONLY))
  .post("/", zValidator("json", createDirectoryEntrySchema), async (c) => {
    const entry = await service.createEntry(c.req.valid("json"));
    return c.json({ entry }, 201);
  })
  .patch("/:id", zValidator("json", updateDirectoryEntrySchema), async (c) => {
    const entry = await service.updateEntry(Number(c.req.param("id")), c.req.valid("json"));
    return c.json({ entry });
  })
  .delete("/:id", async (c) => {
    await service.deleteEntry(Number(c.req.param("id")));
    return c.body(null, 204);
  });
