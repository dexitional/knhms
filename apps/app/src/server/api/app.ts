// The Hono app instance, mounted at /api/* by routes/api/$.ts (which strips
// that prefix before calling .fetch() here — Hono's own routes below are
// registered unprefixed, and app.basePath() can't retroactively rewrite
// routes already registered on the instance).
import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors.js";
import { loggerMiddleware } from "./middleware/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { studentAuthRoute } from "./modules/student-auth/route.js";
import { adminAuthRoute } from "./modules/admin-auth/route.js";
import { roomsRoute } from "./modules/rooms/route.js";
import { studentsRoute } from "./modules/students/route.js";
import { repairsRoute } from "./modules/repairs/route.js";
import { ordersRoute } from "./modules/orders/route.js";
import { suggestionsRoute } from "./modules/suggestions/route.js";
import { adminsRoute } from "./modules/admins/route.js";
import { uploadsRoute } from "./modules/uploads/route.js";
import { reportsRoute } from "./modules/reports/route.js";
import { directoryRoute } from "./modules/directory/route.js";
import { marketRoute } from "./modules/market/route.js";
import { foodRoute } from "./modules/food/route.js";
import { sellersRoute } from "./modules/sellers/route.js";
import { sellerAuthRoute } from "./modules/seller-auth/route.js";
import { sellerPortalRoute } from "./modules/seller-portal/route.js";
import { hubRoute } from "./modules/hub/route.js";
import { freshmenRoute } from "./modules/freshmen/route.js";
import { inventoryRoute } from "./modules/inventory/route.js";
import { analyticsRoute } from "./modules/analytics/route.js";

const app = new Hono();

app.use("*", loggerMiddleware);
app.use("*", corsMiddleware);
app.onError(errorHandler);

app.get("/health", (c) => c.json({ ok: true }));

app.route("/student-auth", studentAuthRoute);
app.route("/admin-auth", adminAuthRoute);
app.route("/rooms", roomsRoute);
app.route("/students", studentsRoute);
app.route("/repairs", repairsRoute);
app.route("/orders", ordersRoute);
app.route("/suggestions", suggestionsRoute);
app.route("/admins", adminsRoute);
app.route("/uploads", uploadsRoute);
app.route("/reports", reportsRoute);
app.route("/directory", directoryRoute);
app.route("/market", marketRoute);
app.route("/food", foodRoute);
app.route("/sellers", sellersRoute);
app.route("/seller-auth", sellerAuthRoute);
app.route("/seller", sellerPortalRoute);
app.route("/hub", hubRoute);
app.route("/freshmen", freshmenRoute);
app.route("/inventory", inventoryRoute);
app.route("/analytics", analyticsRoute);

export type AppType = typeof app;
export { app as apiApp };
