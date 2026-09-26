import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ANY_ADMIN, SUPER_ADMIN_ONLY, requireAdminRole } from "../../middleware/require-auth.js";
import { createAdminSchema, updateAdminSchema, resetAdminPasswordSchema } from "./schema.js";
import * as service from "./service.js";

export const adminsRoute = new Hono()
  // Reads are open to any admin role — repair/order assignment pickers need
  // staff names, and none of the listed fields are sensitive. Only mutations
  // (create/update/deactivate staff accounts) are super-admin-only.
  .get("/", requireAdminRole(ANY_ADMIN), async (c) => {
    const admins = await service.listAdmins();
    return c.json({ admins });
  })
  .get("/:id", requireAdminRole(ANY_ADMIN), async (c) => {
    const admin = await service.getAdmin(Number(c.req.param("id")));
    return c.json({ admin });
  })
  .use("*", requireAdminRole(SUPER_ADMIN_ONLY))
  .post("/", zValidator("json", createAdminSchema), async (c) => {
    const admin = await service.createAdmin(c.req.valid("json"));
    return c.json({ admin }, 201);
  })
  .patch("/:id", zValidator("json", updateAdminSchema), async (c) => {
    const admin = await service.updateAdmin(Number(c.req.param("id")), c.req.valid("json"));
    return c.json({ admin });
  })
  .post("/:id/reset-password", zValidator("json", resetAdminPasswordSchema), async (c) => {
    const result = await service.resetAdminPassword(Number(c.req.param("id")));
    return c.json(result);
  })
  .delete("/:id", async (c) => {
    await service.deactivateAdmin(Number(c.req.param("id")));
    return c.body(null, 204);
  });
