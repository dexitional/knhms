import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireSeller } from "../../middleware/require-auth.js";
import { createMenuItemSchema, updateMenuItemSchema } from "../food/schema.js";
import {
  createSellerProductSchema,
  updateSellerProductSchema,
  updateSellerProfileSchema,
  updateSellerVendorSchema,
} from "./schema.js";
import * as service from "./service.js";

// Everything a signed-in seller manages about their own account. Ownership
// and account-type checks live in the service.
export const sellerPortalRoute = new Hono()
  .use("*", requireSeller)
  .get("/overview", async (c) => c.json(await service.getOverview(c.get("seller").id)))
  .patch("/profile", zValidator("json", updateSellerProfileSchema), async (c) =>
    c.json({ seller: await service.updateProfile(c.get("seller"), c.req.valid("json")) }),
  )
  .get("/categories", async (c) => c.json({ categories: await service.listCategories() }))
  .get("/products", async (c) => c.json({ products: await service.listProducts(c.get("seller")) }))
  .post("/products", zValidator("json", createSellerProductSchema), async (c) =>
    c.json({ product: await service.createProduct(c.get("seller"), c.req.valid("json")) }, 201),
  )
  .patch("/products/:id", zValidator("json", updateSellerProductSchema), async (c) =>
    c.json({ product: await service.updateProduct(c.get("seller"), Number(c.req.param("id")), c.req.valid("json")) }),
  )
  .delete("/products/:id", async (c) => {
    await service.deleteProduct(c.get("seller"), Number(c.req.param("id")));
    return c.body(null, 204);
  })
  .get("/vendor", async (c) => c.json({ vendor: await service.getVendor(c.get("seller")) }))
  .patch("/vendor", zValidator("json", updateSellerVendorSchema), async (c) =>
    c.json({ vendor: await service.updateVendor(c.get("seller"), c.req.valid("json")) }),
  )
  .post("/vendor/items", zValidator("json", createMenuItemSchema), async (c) =>
    c.json({ item: await service.createMenuItem(c.get("seller"), c.req.valid("json")) }, 201),
  )
  .patch("/vendor/items/:itemId", zValidator("json", updateMenuItemSchema), async (c) =>
    c.json({ item: await service.updateMenuItem(c.get("seller"), Number(c.req.param("itemId")), c.req.valid("json")) }),
  )
  .delete("/vendor/items/:itemId", async (c) => {
    await service.deleteMenuItem(c.get("seller"), Number(c.req.param("itemId")));
    return c.body(null, 204);
  });
