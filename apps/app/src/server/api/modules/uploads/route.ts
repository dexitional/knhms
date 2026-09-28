import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getCookie } from "hono/cookie";
import { ADMIN_SESSION_COOKIE, SELLER_SESSION_COOKIE } from "#/server/session";
import {
  getAdminSessionUser,
  getSellerSessionUser,
  readAdminIdFromToken,
  readSellerIdFromToken,
} from "#/server/session-core";
import { AppError } from "../../middleware/error-handler.js";
import { presignSchema } from "./schema.js";
import * as service from "./service.js";

// Unlike every other admin-owned module, this endpoint must be reachable
// pre-authentication for "student-photos"/"receipts": a registrant uploads
// their passport photo and payment receipt *before* their account (and thus
// any session) exists. Every other folder requires an authenticated admin
// (market images also accept a signed-in seller), so the check happens
// inline per-folder instead of a blanket `.use("*", ...)` guard.
export const uploadsRoute = new Hono().post(
  "/presign",
  zValidator("json", presignSchema),
  async (c) => {
    const input = c.req.valid("json");

    if (input.folder !== "student-photos" && input.folder !== "receipts") {
      const adminId = await readAdminIdFromToken(getCookie(c, ADMIN_SESSION_COOKIE));
      const admin = adminId ? await getAdminSessionUser(adminId) : null;
      // Sellers upload their own product/menu images and logos.
      const sellerId =
        !admin && input.folder === "market-images"
          ? await readSellerIdFromToken(getCookie(c, SELLER_SESSION_COOKIE))
          : null;
      const seller = sellerId ? await getSellerSessionUser(sellerId) : null;
      if (!admin && !seller) throw new AppError("Not authenticated.", 401);
    }

    const result = await service.presignUpload(input);
    return c.json(result);
  },
);
