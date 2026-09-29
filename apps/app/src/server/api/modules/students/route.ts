import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAdminRole, requirePermission, requireStudent } from "../../middleware/require-auth.js";
import { STUDENT_EDITORS } from "#/lib/permissions";
import { listStudentsQuerySchema, updateOwnProfileSchema, updateStudentSchema } from "./schema.js";
import * as service from "./service.js";

export const studentsRoute = new Hono()
  // Student-scoped self-service routes, registered before the admin-only
  // "*" guard below so they use requireStudent instead.
  .get("/me", requireStudent, async (c) => {
    const student = await service.getStudent(c.get("student").id);
    return c.json({ student });
  })
  .patch("/me", requireStudent, zValidator("json", updateOwnProfileSchema), async (c) => {
    const student = await service.updateOwnProfile(c.get("student").id, c.req.valid("json"));
    return c.json({ student });
  })

  .get("/", requirePermission("students", "view"), zValidator("query", listStudentsQuerySchema), async (c) => {
    const result = await service.listStudents(c.req.valid("query"));
    return c.json(result);
  })
  .get("/room-options", requireAdminRole(STUDENT_EDITORS), async (c) =>
    c.json({ rooms: await service.listRoomOptions() }),
  )
  .post("/:id/reset-pin", requirePermission("students", "manage"), async (c) =>
    c.json(await service.resetStudentPin(Number(c.req.param("id")))),
  )
  .get("/:id", requirePermission("students", "view"), async (c) => {
    const student = await service.getStudent(Number(c.req.param("id")));
    return c.json({ student });
  })
  .patch(
    "/:id",
    requireAdminRole(STUDENT_EDITORS),
    zValidator("json", updateStudentSchema),
    async (c) => {
      const student = await service.updateStudent(Number(c.req.param("id")), c.req.valid("json"));
      return c.json({ student });
    },
  )
  .delete("/:id", requirePermission("students", "manage"), async (c) => {
    await service.deleteStudent(Number(c.req.param("id")));
    return c.body(null, 204);
  });
