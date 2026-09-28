import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { deleteCookie, setCookie } from "hono/cookie";
import { SELLER_SESSION_COOKIE, SELLER_SESSION_TTL_SECONDS } from "#/server/session";
import { requireSeller } from "../../middleware/require-auth.js";
import { sellerChangePasswordSchema, sellerLoginSchema, sellerRegisterSchema } from "./schema.js";
import * as service from "./service.js";

function setSessionCookie(c: Context, token: string) {
  setCookie(c, SELLER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: SELLER_SESSION_TTL_SECONDS,
  });
}

export const sellerAuthRoute = new Hono()
  .post("/register", zValidator("json", sellerRegisterSchema), async (c) => {
    const { sellerId, token } = await service.registerSeller(c.req.valid("json"));
    setSessionCookie(c, token);
    return c.json({ sellerId }, 201);
  })
  .post("/login", zValidator("json", sellerLoginSchema), async (c) => {
    const { sellerId, token } = await service.loginSeller(c.req.valid("json"));
    setSessionCookie(c, token);
    return c.json({ sellerId });
  })
  .post("/logout", (c) => {
    deleteCookie(c, SELLER_SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  })
  .get("/me", requireSeller, (c) => c.json({ seller: c.get("seller") }))
  .post("/me/password", requireSeller, zValidator("json", sellerChangePasswordSchema), async (c) => {
    await service.changePassword(c.get("seller").id, c.req.valid("json"));
    return c.json({ ok: true });
  });
