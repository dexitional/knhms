import { getPool } from "@knh/db";
import type { FoodVendorRow } from "@knh/db";
import type { RowDataPacket } from "mysql2";
import type { z } from "zod";
import type { SellerSessionUser } from "#/server/session-core";
import { toColumns, updateSql } from "../../lib/columns.js";
import { AppError } from "../../middleware/error-handler.js";
import * as market from "../market/service.js";
import * as food from "../food/service.js";
import type { createMenuItemSchema, updateMenuItemSchema } from "../food/schema.js";
import { billingSummary, getBillingSettings } from "../sellers/billing.js";
import { getSeller, listPayments, listingCount } from "../sellers/service.js";
import type {
  createSellerProductSchema,
  updateSellerProductSchema,
  updateSellerProfileSchema,
  updateSellerVendorSchema,
} from "./schema.js";

type ProfileInput = z.infer<typeof updateSellerProfileSchema>;
type CreateProductInput = z.infer<typeof createSellerProductSchema>;
type UpdateProductInput = z.infer<typeof updateSellerProductSchema>;
type VendorInput = z.infer<typeof updateSellerVendorSchema>;
type MenuItemInput = z.infer<typeof createMenuItemSchema> | z.infer<typeof updateMenuItemSchema>;

// Pending sellers can prepare listings before approval; rejected and
// suspended sellers are read-only.
function assertCanManage(seller: SellerSessionUser) {
  if (seller.status === "rejected") {
    throw new AppError("Your application was not approved, so listings can't be changed.", 403);
  }
  if (seller.status === "suspended") {
    throw new AppError("Your account is suspended. Contact the hall office to be reinstated.", 403);
  }
}

function assertType(seller: SellerSessionUser, type: SellerSessionUser["sellerType"]) {
  if (seller.sellerType !== type) throw new AppError("Not available for your account type.", 403);
}

// ---- Overview & profile ----------------------------------------------------

export async function getOverview(sellerId: number) {
  const seller = await getSeller(sellerId);
  const [settings, payments, listings] = await Promise.all([
    getBillingSettings(),
    listPayments(sellerId),
    listingCount(seller),
  ]);
  return {
    seller,
    billing: billingSummary(seller, settings),
    paymentInstructions: settings.paymentInstructions,
    // Admin names stay internal.
    payments: payments.map(({ recorded_by: _r, recorded_by_name: _n, ...p }) => p),
    listingCount: listings,
  };
}

const PROFILE_FIELDS: Record<string, string> = {
  businessName: "business_name",
  ownerName: "owner_name",
  phone: "phone",
  location: "location",
  description: "description",
  logoUrl: "logo_url",
};

// Keeps the seller's copies in listings (product seller details, vendor
// name/contact/logo) in step with the profile.
export async function updateProfile(seller: SellerSessionUser, input: ProfileInput) {
  const { columns, params } = toColumns(input, PROFILE_FIELDS);
  if (columns.length > 0) {
    await getPool().execute(updateSql("sellers", columns), [...params, seller.id]);
  }
  const updated = await getSeller(seller.id);
  if (seller.sellerType === "business") {
    await getPool().execute(
      "UPDATE market_products SET seller_name = ?, seller_phone = ?, seller_location = ? WHERE seller_id = ?",
      [updated.business_name, updated.phone, updated.location, seller.id],
    );
  } else {
    await getPool().execute("UPDATE food_vendors SET name = ?, phone = ?, location = ?, logo_url = ? WHERE seller_id = ?", [
      updated.business_name,
      updated.phone,
      updated.location,
      updated.logo_url,
      seller.id,
    ]);
  }
  return updated;
}

// ---- Business: products -----------------------------------------------------

export async function listCategories() {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT id, name, icon FROM market_categories WHERE is_active = 1 ORDER BY sort_order, name",
  );
  return rows;
}

export async function listProducts(seller: SellerSessionUser) {
  assertType(seller, "business");
  return (await market.listProducts()).filter((p) => p.seller_id === seller.id);
}

async function ownProduct(seller: SellerSessionUser, id: number) {
  const product = await market.getProduct(id);
  if (product.seller_id !== seller.id) throw new AppError("Product not found.", 404);
  return product;
}

export async function createProduct(seller: SellerSessionUser, input: CreateProductInput) {
  assertType(seller, "business");
  assertCanManage(seller);
  const profile = await getSeller(seller.id);
  return market.createProduct({
    ...input,
    sellerId: seller.id,
    sellerName: profile.business_name,
    sellerPhone: profile.phone,
    sellerLocation: profile.location,
  });
}

export async function updateProduct(seller: SellerSessionUser, id: number, input: UpdateProductInput) {
  assertType(seller, "business");
  assertCanManage(seller);
  await ownProduct(seller, id);
  return market.updateProduct(id, input);
}

export async function deleteProduct(seller: SellerSessionUser, id: number) {
  assertType(seller, "business");
  assertCanManage(seller);
  await ownProduct(seller, id);
  await market.deleteProduct(id);
}

// ---- Food vendor: profile & menu ----------------------------------------------

async function ownVendorId(seller: SellerSessionUser) {
  assertType(seller, "food_vendor");
  const [rows] = await getPool().execute<(FoodVendorRow & RowDataPacket)[]>(
    "SELECT id FROM food_vendors WHERE seller_id = ?",
    [seller.id],
  );
  if (!rows[0]) throw new AppError("Vendor profile not found. Contact the hall office.", 404);
  return rows[0].id;
}

export async function getVendor(seller: SellerSessionUser) {
  const vendorId = await ownVendorId(seller);
  return (await food.listVendors()).find((v) => v.id === vendorId)!;
}

export async function updateVendor(seller: SellerSessionUser, input: VendorInput) {
  assertCanManage(seller);
  await food.updateVendor(await ownVendorId(seller), input);
  return getVendor(seller);
}

export async function createMenuItem(seller: SellerSessionUser, input: MenuItemInput) {
  assertCanManage(seller);
  return food.createMenuItem(await ownVendorId(seller), input);
}

export async function updateMenuItem(seller: SellerSessionUser, itemId: number, input: MenuItemInput) {
  assertCanManage(seller);
  return food.updateMenuItem(await ownVendorId(seller), itemId, input);
}

export async function deleteMenuItem(seller: SellerSessionUser, itemId: number) {
  assertCanManage(seller);
  await food.deleteMenuItem(await ownVendorId(seller), itemId);
}
