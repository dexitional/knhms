import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { deleteCookie, setCookie } from "hono/cookie";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_TTL_SECONDS } from "#/server/session";
import { ANY_ADMIN, requireAdminRole } from "../../middleware/require-auth.js";
import {
  adminForgotPasswordSchema,
  adminLoginSchema,
  adminResetPasswordSchema,
  changeOwnPasswordSchema,
} from "./schema.js";
import * as service from "./service.js";

export const adminAuthRoute = new Hono()
  .post("/login", zValidator("json", adminLoginSchema), async (c) => {
    const { adminId, token } = await service.loginAdmin(c.req.valid("json"));
    setCookie(c, ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/",
      maxAge: ADMIN_SESSION_TTL_SECONDS,
    });
    return c.json({ adminId });
  })
  .post("/logout", (c) => {
    deleteCookie(c, ADMIN_SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  })
  .get("/me", requireAdminRole(ANY_ADMIN), (c) => {
    return c.json({ admin: c.get("admin") });
  })
  .post(
    "/me/password",
    requireAdminRole(ANY_ADMIN),
    zValidator("json", changeOwnPasswordSchema),
    async (c) => {
      await service.changeOwnPassword(c.get("admin").id, c.req.valid("json"));
      return c.json({ ok: true });
    },
  )
  .post("/forgot-password", zValidator("json", adminForgotPasswordSchema), async (c) => {
    const result = await service.requestPasswordReset(c.req.valid("json"));
    return c.json(result);
  })
  .post("/reset-password", zValidator("json", adminResetPasswordSchema), async (c) => {
    await service.resetPassword(c.req.valid("json"));
    return c.json({ ok: true });
  });
