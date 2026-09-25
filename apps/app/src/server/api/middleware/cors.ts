import { cors } from "hono/cors";

const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim());

export const corsMiddleware = cors({
  origin: allowedOrigins,
  credentials: true,
});
