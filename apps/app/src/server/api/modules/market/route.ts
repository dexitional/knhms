import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ADMIN_ONLY, ANY_ADMIN, requireAdminRole } from "../../middleware/require-auth.js";
import {
  createCategorySchema,
  createProductSchema,
  updateCategorySchema,
  updateProductSchema,
} from "./schema.js";
import * as service from "./service.js";

export const marketRoute = new Hono()
  // Public: the E-Market page lists active categories and products.
  .get("/public", async (c) => c.json(await service.getPublicCatalog()))
  .get("/categories", requireAdminRole(ANY_ADMIN), async (c) =>
    c.json({ categories: await service.listCategories() }),
  )
  .get("/products", requireAdminRole(ANY_ADMIN), async (c) =>
    c.json({ products: await service.listProducts() }),
  )
  .use("*", requireAdminRole(ADMIN_ONLY))
  .post("/categories", zValidator("json", createCategorySchema), async (c) =>
    c.json({ category: await service.createCategory(c.req.valid("json")) }, 201),
  )
  .patch("/categories/:id", zValidator("json", updateCategorySchema), async (c) =>
    c.json({ category: await service.updateCategory(Number(c.req.param("id")), c.req.valid("json")) }),
  )
  .delete("/categories/:id", async (c) => {
    await service.deleteCategory(Number(c.req.param("id")));
    return c.body(null, 204);
  })
  .post("/products", zValidator("json", createProductSchema), async (c) =>
    c.json({ product: await service.createProduct(c.req.valid("json")) }, 201),
  )
  .patch("/products/:id", zValidator("json", updateProductSchema), async (c) =>
    c.json({ product: await service.updateProduct(Number(c.req.param("id")), c.req.valid("json")) }),
  )
  .delete("/products/:id", async (c) => {
    await service.deleteProduct(Number(c.req.param("id")));
    return c.body(null, 204);
  });
