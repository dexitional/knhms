import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAdminRole, requirePermission } from "../../middleware/require-auth.js";
import { STOCK_APPROVERS, STOCK_RELEASERS, STOCK_REQUESTERS } from "#/lib/permissions";
import {
  adjustStockSchema,
  categorySchema,
  createItemSchema,
  createRequestSchema,
  decisionSchema,
  importSchema,
  rejectSchema,
  reportQuerySchema,
  updateItemSchema,
} from "./schema.js";
import * as reports from "./reports.js";
import * as service from "./service.js";

const statusQuery = z.object({
  status: z.enum(["pending", "approved", "rejected", "released", "cancelled"]).optional(),
});

// Hall inventory. Access follows lib/permissions.ts: the super admin
// manages stock and approves requests, admins raise requests, and the
// stores (or the super admin) release them.
export const inventoryRoute = new Hono()
  // ---- Stock
  .get("/items", requirePermission("inventory", "view"), async (c) => c.json({ items: await service.listItems() }))
  .post("/items", requirePermission("inventory", "manage"), zValidator("json", createItemSchema), async (c) =>
    c.json({ item: await service.createItem(c.get("admin").id, c.req.valid("json")) }, 201),
  )
  .patch("/items/:id", requirePermission("inventory", "manage"), zValidator("json", updateItemSchema), async (c) =>
    c.json({ item: await service.updateItem(Number(c.req.param("id")), c.req.valid("json")) }),
  )
  .post("/items/:id/adjust", requirePermission("inventory", "manage"), zValidator("json", adjustStockSchema), async (c) =>
    c.json({ item: await service.adjustStock(c.get("admin").id, Number(c.req.param("id")), c.req.valid("json")) }),
  )
  .delete("/items/:id", requirePermission("inventory", "manage"), async (c) => {
    await service.deleteItem(Number(c.req.param("id")));
    return c.body(null, 204);
  })
  .post("/items/import", requirePermission("inventory", "manage"), zValidator("json", importSchema), async (c) =>
    c.json(await service.importItems(c.get("admin").id, c.req.valid("json"))),
  )
  // ---- Categories
  .get("/categories", requirePermission("inventory", "view"), async (c) =>
    c.json({ categories: await service.listCategories() }),
  )
  .post("/categories", requirePermission("inventory", "manage"), zValidator("json", categorySchema), async (c) =>
    c.json(await service.createCategory(c.req.valid("json")), 201),
  )
  .patch("/categories/:id", requirePermission("inventory", "manage"), zValidator("json", categorySchema), async (c) => {
    await service.updateCategory(Number(c.req.param("id")), c.req.valid("json"));
    return c.body(null, 204);
  })
  .delete("/categories/:id", requirePermission("inventory", "manage"), async (c) => {
    await service.deleteCategory(Number(c.req.param("id")));
    return c.body(null, 204);
  })
  .get("/movements", requirePermission("inventory", "view"), async (c) =>
    c.json({ movements: await service.listMovements() }),
  )
  // ---- Requests
  .get("/requests", requirePermission("inventory", "view"), zValidator("query", statusQuery), async (c) =>
    c.json({ requests: await service.listRequests(c.get("admin"), c.req.valid("query").status) }),
  )
  .get("/requests/:id", requirePermission("inventory", "view"), async (c) =>
    c.json({ request: await service.getRequest(c.get("admin"), Number(c.req.param("id"))) }),
  )
  .post("/requests", requireAdminRole(STOCK_REQUESTERS), zValidator("json", createRequestSchema), async (c) =>
    c.json({ request: await service.createRequest(c.get("admin"), c.req.valid("json")) }, 201),
  )
  .post("/requests/:id/approve", requireAdminRole(STOCK_APPROVERS), zValidator("json", decisionSchema), async (c) =>
    c.json({ request: await service.approveRequest(c.get("admin"), Number(c.req.param("id")), c.req.valid("json").note) }),
  )
  .post("/requests/:id/reject", requireAdminRole(STOCK_APPROVERS), zValidator("json", rejectSchema), async (c) =>
    c.json({ request: await service.rejectRequest(c.get("admin"), Number(c.req.param("id")), c.req.valid("json").note) }),
  )
  .post("/requests/:id/release", requireAdminRole(STOCK_RELEASERS), async (c) =>
    c.json({ request: await service.releaseRequest(c.get("admin"), Number(c.req.param("id"))) }),
  )
  .post("/requests/:id/cancel", requireAdminRole(STOCK_REQUESTERS), async (c) =>
    c.json({ request: await service.cancelRequest(c.get("admin"), Number(c.req.param("id"))) }),
  )
  // ---- Reports
  .get("/reports", requirePermission("inventory", "view"), zValidator("query", reportQuerySchema), async (c) =>
    c.json(await reports.getReport(c.req.valid("query").period, c.req.valid("query").categoryId)),
  )
  .get("/reports/export", requirePermission("inventory", "view"), zValidator("query", reportQuerySchema), async (c) => {
    const { period, categoryId } = c.req.valid("query");
    const { buffer, filename } = await reports.exportWorkbook(period, categoryId);
    return c.body(new Uint8Array(buffer), 200, {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    });
  });
