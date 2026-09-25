import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 401 | 403 | 404 | 409 | 422 | 429 = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  if (err instanceof AppError) {
    return c.json({ error: err.message }, err.status);
  }

  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
};
