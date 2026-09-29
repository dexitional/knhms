import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requirePermission } from "../../middleware/require-auth.js";
import {
  createFaqSchema,
  createGuideSchema,
  createSectionSchema,
  createTopicSchema,
  updateFaqSchema,
  updateGuideSchema,
  updateSectionSchema,
  updateTopicSchema,
} from "./schema.js";
import * as service from "./service.js";

const idParam = (c: { req: { param: (name: string) => string } }) => Number(c.req.param("id"));

// Freshmen guide content: guides → sections → topics, plus FAQs. Reads are
// open to any admin role; changes are admin/super-admin only.
export const freshmenRoute = new Hono()
  .get("/public", async (c) => c.json(await service.getPublicContent()))
  .get("/", requirePermission("freshmen", "view"), async (c) => c.json(await service.getAllContent()))
  .use("*", requirePermission("freshmen", "manage"))
  .post("/guides", zValidator("json", createGuideSchema), async (c) =>
    c.json(await service.createGuide(c.req.valid("json")), 201),
  )
  .patch("/guides/:id", zValidator("json", updateGuideSchema), async (c) => {
    await service.updateGuide(idParam(c), c.req.valid("json"));
    return c.body(null, 204);
  })
  .delete("/guides/:id", async (c) => {
    await service.deleteGuide(idParam(c));
    return c.body(null, 204);
  })
  .post("/sections", zValidator("json", createSectionSchema), async (c) =>
    c.json(await service.createSection(c.req.valid("json")), 201),
  )
  .patch("/sections/:id", zValidator("json", updateSectionSchema), async (c) => {
    await service.updateSection(idParam(c), c.req.valid("json"));
    return c.body(null, 204);
  })
  .delete("/sections/:id", async (c) => {
    await service.deleteSection(idParam(c));
    return c.body(null, 204);
  })
  .post("/topics", zValidator("json", createTopicSchema), async (c) =>
    c.json(await service.createTopic(c.req.valid("json")), 201),
  )
  .patch("/topics/:id", zValidator("json", updateTopicSchema), async (c) => {
    await service.updateTopic(idParam(c), c.req.valid("json"));
    return c.body(null, 204);
  })
  .delete("/topics/:id", async (c) => {
    await service.deleteTopic(idParam(c));
    return c.body(null, 204);
  })
  .post("/faqs", zValidator("json", createFaqSchema), async (c) =>
    c.json(await service.createFaq(c.req.valid("json")), 201),
  )
  .patch("/faqs/:id", zValidator("json", updateFaqSchema), async (c) => {
    await service.updateFaq(idParam(c), c.req.valid("json"));
    return c.body(null, 204);
  })
  .delete("/faqs/:id", async (c) => {
    await service.deleteFaq(idParam(c));
    return c.body(null, 204);
  });
