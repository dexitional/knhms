import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getCookie } from "hono/cookie";
import { ADMIN_SESSION_COOKIE } from "#/server/session";
import { readAdminIdFromToken, getAdminSessionUser } from "#/server/session-core";
import { AppError } from "../../middleware/error-handler.js";
import { presignSchema } from "./schema.js";
import * as service from "./service.js";

// Unlike every other admin-owned module, this endpoint must be reachable
// pre-authentication for "student-photos"/"receipts": a registrant uploads
// their passport photo and payment receipt *before* their account (and thus
// any session) exists. Only "admin-photos" requires an authenticated admin,
// so the check happens inline per-folder instead of a blanket `.use("*", ...)`
// guard on the whole module.
export const uploadsRoute = new Hono().post(
  "/presign",
  zValidator("json", presignSchema),
  async (c) => {
    const input = c.req.valid("json");

    if (input.folder === "admin-photos") {
      const token = getCookie(c, ADMIN_SESSION_COOKIE);
      const adminId = await readAdminIdFromToken(token);
      const admin = adminId ? await getAdminSessionUser(adminId) : null;
      if (!admin) throw new AppError("Not authenticated.", 401);
    }

    const result = await service.presignUpload(input);
    return c.json(result);
  },
);
