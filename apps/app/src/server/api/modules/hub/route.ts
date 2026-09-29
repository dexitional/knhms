import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requirePermission } from "../../middleware/require-auth.js";
import { createHubPostSchema, hubPostTypeSchema, updateHubPostSchema } from "./schema.js";
import * as service from "./service.js";

// KNH Hub page content: spotlight slides, announcements, news, and events.
export const hubRoute = new Hono()
  .get("/public", async (c) => c.json(await service.getPublicHub()))
  .get("/posts", requirePermission("hub", "view"), async (c) => {
    const type = hubPostTypeSchema.safeParse(c.req.query("type"));
    return c.json({ posts: await service.listPosts(type.success ? type.data : undefined) });
  })
  .use("*", requirePermission("hub", "manage"))
  .post("/posts", zValidator("json", createHubPostSchema), async (c) =>
    c.json({ post: await service.createPost(c.get("admin").id, c.req.valid("json")) }, 201),
  )
  .patch("/posts/:id", zValidator("json", updateHubPostSchema), async (c) =>
    c.json({ post: await service.updatePost(Number(c.req.param("id")), c.req.valid("json")) }),
  )
  .delete("/posts/:id", async (c) => {
    await service.deletePost(Number(c.req.param("id")));
    return c.body(null, 204);
  });
