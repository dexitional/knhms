import { Hono  } from "hono";
import type {Context} from "hono";
import { zValidator } from "@hono/zod-validator";
import { deleteCookie, setCookie } from "hono/cookie";
import { STUDENT_SESSION_COOKIE, STUDENT_SESSION_TTL_SECONDS } from "#/server/session";
import { requireStudent } from "../../middleware/require-auth.js";
import {
  changeOwnPinSchema,
  forgotPinSchema,
  registerStudentSchema,
  resetPinSchema,
  studentLoginSchema,
} from "./schema.js";
import * as service from "./service.js";

function setStudentCookie(c: Context, token: string) {
  setCookie(c, STUDENT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: STUDENT_SESSION_TTL_SECONDS,
  });
}

export const studentAuthRoute = new Hono()
  .post("/register", zValidator("json", registerStudentSchema), async (c) => {
    const { studentId, token } = await service.registerStudent(c.req.valid("json"));
    setStudentCookie(c, token);
    return c.json({ studentId }, 201);
  })
  .post("/login", zValidator("json", studentLoginSchema), async (c) => {
    const { studentId, token } = await service.loginStudent(c.req.valid("json"));
    setStudentCookie(c, token);
    return c.json({ studentId });
  })
  .post("/logout", (c) => {
    deleteCookie(c, STUDENT_SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  })
  .get("/me", requireStudent, (c) => {
    return c.json({ student: c.get("student") });
  })
  .post("/forgot-pin", zValidator("json", forgotPinSchema), async (c) => {
    const result = await service.requestPinReset(c.req.valid("json"));
    return c.json(result);
  })
  .post("/reset-pin", zValidator("json", resetPinSchema), async (c) => {
    await service.resetPin(c.req.valid("json"));
    return c.json({ ok: true });
  })
  .post("/me/pin", requireStudent, zValidator("json", changeOwnPinSchema), async (c) => {
    await service.changeOwnPin(c.get("student").id, c.req.valid("json"));
    return c.json({ ok: true });
  });
