import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requirePermission } from "../../middleware/require-auth.js";
import { analyticsQuerySchema, marketEventSchema } from "./schema.js";
import * as service from "./service.js";

export const analyticsRoute = new Hono()
  // Public: the E-Market page reports views and order clicks here. Always
  // answers 204 so tracking never affects the shopper.
  .post("/events", zValidator("json", marketEventSchema), async (c) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
    await service
      .recordEvent(c.req.valid("json"), { ip, userAgent: c.req.header("user-agent") ?? "" })
      .catch((err: unknown) => console.error("Failed to record market event:", err));
    return c.body(null, 204);
  })
  // Admin E-Market page: whole-market and per-listing stats.
  .get("/market", requirePermission("market", "view"), zValidator("query", analyticsQuerySchema), async (c) =>
    c.json(await service.getMarketAnalytics(c.req.valid("query").days)),
  );
