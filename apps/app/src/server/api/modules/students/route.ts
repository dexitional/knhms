import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ANY_ADMIN, requireAdminRole, requireStudent } from "../../middleware/require-auth.js";
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

  .get("/", requireAdminRole(ANY_ADMIN), zValidator("query", listStudentsQuerySchema), async (c) => {
    const result = await service.listStudents(c.req.valid("query"));
    return c.json(result);
  })
  .get("/:id", requireAdminRole(ANY_ADMIN), async (c) => {
    const student = await service.getStudent(Number(c.req.param("id")));
    return c.json({ student });
  })
  .patch(
    "/:id",
    requireAdminRole(ANY_ADMIN),
    zValidator("json", updateStudentSchema),
    async (c) => {
      const student = await service.updateStudent(Number(c.req.param("id")), c.req.valid("json"));
      return c.json({ student });
    },
  )
  .delete("/:id", requireAdminRole(ANY_ADMIN), async (c) => {
    await service.deleteStudent(Number(c.req.param("id")));
    return c.body(null, 204);
  });
