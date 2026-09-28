import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ADMIN_ONLY, ANY_ADMIN, requireAdminRole } from "../../middleware/require-auth.js";
import { getBillingSettings } from "./billing.js";
import { recordPaymentSchema, updateBillingSettingsSchema, updateSellerStatusSchema } from "./schema.js";
import * as service from "./service.js";

// Admin management of seller accounts. Reads are open to any admin role;
// approvals, payments, and fees are admin/super-admin only.
export const sellersRoute = new Hono()
  .get("/", requireAdminRole(ANY_ADMIN), async (c) => c.json({ sellers: await service.listSellers() }))
  .get("/settings", requireAdminRole(ANY_ADMIN), async (c) => c.json({ settings: await getBillingSettings() }))
  .get("/:id", requireAdminRole(ANY_ADMIN), async (c) => c.json(await service.getSellerDetail(Number(c.req.param("id")))))
  .use("*", requireAdminRole(ADMIN_ONLY))
  .put("/settings", zValidator("json", updateBillingSettingsSchema), async (c) =>
    c.json({ settings: await service.updateBillingSettings(c.get("admin").id, c.req.valid("json")) }),
  )
  .post("/:id/status", zValidator("json", updateSellerStatusSchema), async (c) =>
    c.json(await service.updateStatus(Number(c.req.param("id")), c.get("admin").id, c.req.valid("json"))),
  )
  .post("/:id/payments", zValidator("json", recordPaymentSchema), async (c) =>
    c.json(await service.recordPayment(Number(c.req.param("id")), c.get("admin").id, c.req.valid("json")), 201),
  )
  .post("/:id/reset-password", async (c) => c.json(await service.resetSellerPassword(Number(c.req.param("id")))));
