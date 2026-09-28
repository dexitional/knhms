import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ADMIN_ONLY, ANY_ADMIN, requireAdminRole } from "../../middleware/require-auth.js";
import {
  createMenuItemSchema,
  createVendorSchema,
  updateMenuItemSchema,
  updateVendorSchema,
} from "./schema.js";
import * as service from "./service.js";

const vendorId = (c: { req: { param: (k: string) => string } }) => Number(c.req.param("vendorId"));
const itemId = (c: { req: { param: (k: string) => string } }) => Number(c.req.param("itemId"));

export const foodRoute = new Hono()
  // Public: the E-Market page lists active vendors and their menus.
  .get("/public", async (c) => c.json({ vendors: await service.listPublicVendors() }))
  .get("/vendors", requireAdminRole(ANY_ADMIN), async (c) =>
    c.json({ vendors: await service.listVendors() }),
  )
  .use("*", requireAdminRole(ADMIN_ONLY))
  .post("/vendors", zValidator("json", createVendorSchema), async (c) =>
    c.json({ vendor: await service.createVendor(c.req.valid("json")) }, 201),
  )
  .patch("/vendors/:vendorId", zValidator("json", updateVendorSchema), async (c) =>
    c.json({ vendor: await service.updateVendor(vendorId(c), c.req.valid("json")) }),
  )
  .delete("/vendors/:vendorId", async (c) => {
    await service.deleteVendor(vendorId(c));
    return c.body(null, 204);
  })
  .post("/vendors/:vendorId/items", zValidator("json", createMenuItemSchema), async (c) =>
    c.json({ item: await service.createMenuItem(vendorId(c), c.req.valid("json")) }, 201),
  )
  .patch("/vendors/:vendorId/items/:itemId", zValidator("json", updateMenuItemSchema), async (c) =>
    c.json({ item: await service.updateMenuItem(vendorId(c), itemId(c), c.req.valid("json")) }),
  )
  .delete("/vendors/:vendorId/items/:itemId", async (c) => {
    await service.deleteMenuItem(vendorId(c), itemId(c));
    return c.body(null, 204);
  });
