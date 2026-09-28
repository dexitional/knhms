import { z } from "zod";
import { optionalField } from "../../lib/optional-field.js";
import { OLD_PRICE_MESSAGE, productFields } from "../market/schema.js";
import { createVendorSchema } from "../food/schema.js";
import { ghanaPhoneSchema } from "../seller-auth/schema.js";

export const updateSellerProfileSchema = z
  .object({
    businessName: z.string().trim().min(2).max(150),
    ownerName: z.string().trim().min(2).max(150),
    phone: ghanaPhoneSchema,
    location: optionalField(z.string().trim().max(255)),
    description: optionalField(z.string().trim().max(500)),
  })
  .partial();

// What a seller may set on their own products. Top Deals, rating, display
// order, and seller details stay admin/profile-controlled.
const sellerProductFields = productFields.pick({
  categoryId: true,
  name: true,
  description: true,
  price: true,
  oldPrice: true,
  imageUrl: true,
  condition: true,
  audience: true,
  isActive: true,
});

export const createSellerProductSchema = sellerProductFields.refine(
  (p) => p.oldPrice == null || p.oldPrice > p.price,
  { message: OLD_PRICE_MESSAGE, path: ["oldPrice"] },
);

export const updateSellerProductSchema = sellerProductFields.partial();

// Vendor name/phone/location come from the seller profile.
export const updateSellerVendorSchema = createVendorSchema
  .pick({ cuisine: true, description: true, logoUrl: true, openingHours: true, delivers: true, isOpen: true })
  .partial();
