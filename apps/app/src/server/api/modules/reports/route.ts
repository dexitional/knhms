import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requirePermission } from "../../middleware/require-auth.js";
import * as service from "./service.js";
import { z } from "zod";

const listStudentsReportQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const listRepairsReportQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pending", "approved", "assigned", "completed"]).optional(),
});

export const reportsRoute = new Hono()
  .get("/students", requirePermission("reports", "view"), zValidator("query", listStudentsReportQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const result = await service.getStudentsReport(query);
    return c.json(result);
  })
  .get("/repairs", requirePermission("reports", "view"), zValidator("query", listRepairsReportQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const report = await service.getRepairsReport(query);
    return c.json(report);
  })
  .get("/overview", requirePermission("overview", "view"), async (c) => {
    const overview = await service.getOverview();
    return c.json(overview);
  });
