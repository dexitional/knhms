import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requirePermission, requireStudent } from "../../middleware/require-auth.js";
import { seesOnlyAssignedRepairs } from "#/lib/permissions";
import {
  createRepairRequestSchema,
  listRepairsQuerySchema,
  updateRepairAdminSchema,
  updateStudentRemarksSchema,
} from "./schema.js";
import * as service from "./service.js";

export const repairsRoute = new Hono()
  .post("/", requireStudent, zValidator("json", createRepairRequestSchema), async (c) => {
    const student = c.get("student");
    const request = await service.createRepairRequest(student.id, student.roomId, c.req.valid("json"));
    return c.json({ request }, 201);
  })
  .get("/mine", requireStudent, async (c) => {
    const requests = await service.listMyRepairRequests(c.get("student").id);
    return c.json({ requests });
  })
  .patch(
    "/:id/remarks",
    requireStudent,
    zValidator("json", updateStudentRemarksSchema),
    async (c) => {
      const request = await service.updateStudentRemarks(
        Number(c.req.param("id")),
        c.get("student").id,
        c.req.valid("json"),
      );
      return c.json({ request });
    },
  )

  // Technicians only ever see the requests assigned to them.
  .get("/", requirePermission("repairs", "view"), zValidator("query", listRepairsQuerySchema), async (c) => {
    const admin = c.get("admin");
    const result = await service.listRepairRequests(c.req.valid("query"), {
      assignedTo: seesOnlyAssignedRepairs(admin.role) ? admin.id : undefined,
    });
    return c.json(result);
  })
  .get("/:id", requirePermission("repairs", "view"), async (c) => {
    const admin = c.get("admin");
    const request = await service.getRepairRequest(Number(c.req.param("id")), {
      assignedTo: seesOnlyAssignedRepairs(admin.role) ? admin.id : undefined,
    });
    return c.json({ request });
  })
  .patch(
    "/:id",
    requirePermission("repairs", "manage"),
    zValidator("json", updateRepairAdminSchema),
    async (c) => {
      const request = await service.updateRepairRequest(Number(c.req.param("id")), c.req.valid("json"));
      return c.json({ request });
    },
  );
