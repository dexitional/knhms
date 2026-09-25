import { Hono } from "hono";
import { ANY_ADMIN, requireAdminRole } from "../../middleware/require-auth.js";
import * as service from "./service.js";

export const reportsRoute = new Hono()
  .use("*", requireAdminRole(ANY_ADMIN))
  .get("/students", async (c) => {
    const students = await service.getStudentsReport();
    return c.json({ students });
  })
  .get("/repairs", async (c) => {
    const report = await service.getRepairsReport();
    return c.json(report);
  })
  .get("/overview", async (c) => {
    const overview = await service.getOverview();
    return c.json(overview);
  });
