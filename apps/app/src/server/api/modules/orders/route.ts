import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requirePermission, requireStudent } from "../../middleware/require-auth.js";
import { createOrderSchema, listOrdersQuerySchema, updateOrderAdminSchema } from "./schema.js";
import * as service from "./service.js";

export const ordersRoute = new Hono()
  .post("/", requireStudent, zValidator("json", createOrderSchema), async (c) => {
    const order = await service.createOrder(c.get("student").id, c.req.valid("json"));
    return c.json({ order }, 201);
  })
  .get("/mine", requireStudent, async (c) => {
    const orders = await service.listMyOrders(c.get("student").id);
    return c.json({ orders });
  })

  .get("/", requirePermission("orders", "view"), zValidator("query", listOrdersQuerySchema), async (c) => {
    const result = await service.listOrders(c.req.valid("query"));
    return c.json(result);
  })
  .patch(
    "/:id",
    requirePermission("orders", "manage"),
    zValidator("json", updateOrderAdminSchema),
    async (c) => {
      const order = await service.updateOrder(Number(c.req.param("id")), c.req.valid("json"));
      return c.json({ order });
    },
  );
