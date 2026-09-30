import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { z } from "zod";
import { requirePermission } from "../../middleware/require-auth.js";
import {
  createChannelSchema,
  createDonationSchema,
  createExecutiveSchema,
  createGallerySchema,
  createProjectSchema,
  membershipSchema,
  pledgeSchema,
  updateChannelSchema,
  updateDonationSchema,
  updateExecutiveSchema,
  updateGallerySchema,
  updateMembershipSchema,
  updateProjectSchema,
} from "./schema.js";
import * as service from "./service.js";
import type { CollectionName } from "./service.js";

const view = requirePermission("alumni", "view");
const manage = requirePermission("alumni", "manage");

// CRUD for one admin-managed collection (projects, executives, gallery,
// donation channels): list, create, update, delete.
function collectionRoutes(name: CollectionName, create: z.ZodType<object>, update: z.ZodType<object>) {
  return new Hono()
    .get("/", view, async (c) => c.json({ items: await service.listCollection(name) }))
    .post("/", manage, zValidator("json", create), async (c) =>
      c.json(await service.createInCollection(name, c.req.valid("json")), 201),
    )
    .patch("/:id", manage, zValidator("json", update), async (c) => {
      await service.updateInCollection(name, Number(c.req.param("id")), c.req.valid("json"));
      return c.body(null, 204);
    })
    .delete("/:id", manage, async (c) => {
      await service.deleteFromCollection(name, Number(c.req.param("id")));
      return c.body(null, 204);
    });
}

export const alumniRoute = new Hono()
  // ---- Public
  .get("/public", async (c) => c.json(await service.getPublicContent()))
  .post("/memberships", zValidator("json", membershipSchema), async (c) =>
    c.json(await service.createMembership(c.req.valid("json")), 201),
  )
  .post("/pledges", zValidator("json", pledgeSchema), async (c) =>
    c.json(await service.createPledge(c.req.valid("json")), 201),
  )
  // ---- Admin
  .route("/projects", collectionRoutes("projects", createProjectSchema, updateProjectSchema))
  .route("/executives", collectionRoutes("executives", createExecutiveSchema, updateExecutiveSchema))
  .route("/gallery", collectionRoutes("gallery", createGallerySchema, updateGallerySchema))
  .route("/channels", collectionRoutes("channels", createChannelSchema, updateChannelSchema))
  .get("/donations", view, async (c) => c.json({ items: await service.listDonations() }))
  .post("/donations", manage, zValidator("json", createDonationSchema), async (c) =>
    c.json(await service.createDonation(c.get("admin").id, c.req.valid("json")), 201),
  )
  .patch("/donations/:id", manage, zValidator("json", updateDonationSchema), async (c) => {
    await service.updateDonation(c.get("admin").id, Number(c.req.param("id")), c.req.valid("json"));
    return c.body(null, 204);
  })
  .delete("/donations/:id", manage, async (c) => {
    await service.deleteDonation(Number(c.req.param("id")));
    return c.body(null, 204);
  })
  .get("/memberships", view, async (c) => c.json({ items: await service.listMemberships() }))
  .patch("/memberships/:id", manage, zValidator("json", updateMembershipSchema), async (c) => {
    await service.updateMembership(Number(c.req.param("id")), c.req.valid("json"));
    return c.body(null, 204);
  })
  .delete("/memberships/:id", manage, async (c) => {
    await service.deleteMembership(Number(c.req.param("id")));
    return c.body(null, 204);
  });
