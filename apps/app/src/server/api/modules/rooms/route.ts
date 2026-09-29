import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requirePermission } from "../../middleware/require-auth.js";
import { AppError } from "../../middleware/error-handler.js";
import { createRoomSchema, listRoomsQuerySchema, updateRoomSchema } from "./schema.js";
import * as service from "./service.js";

export const roomsRoute = new Hono()
  .get("/", requirePermission("rooms", "view"), zValidator("query", listRoomsQuerySchema), async (c) => {
    const result = await service.listRooms(c.req.valid("query"));
    return c.json(result);
  })
  .get("/:id", requirePermission("rooms", "view"), async (c) => {
    const room = await service.getRoom(Number(c.req.param("id")));
    return c.json({ room });
  })
  .use("*", requirePermission("rooms", "manage"))
  .post("/", zValidator("json", createRoomSchema), async (c) => {
    const room = await service.createRoom(c.req.valid("json"));
    return c.json({ room }, 201);
  })
  .patch("/:id", zValidator("json", updateRoomSchema), async (c) => {
    const room = await service.updateRoom(Number(c.req.param("id")), c.req.valid("json"));
    return c.json({ room });
  })
  .delete("/:id", async (c) => {
    await service.deleteRoom(Number(c.req.param("id")));
    return c.body(null, 204);
  })
  .post("/bulk-upload", async (c) => {
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) {
      throw new AppError("A .xlsx file is required (field name: file).", 400);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await service.bulkUploadRooms(buffer);
    return c.json(result);
  });
