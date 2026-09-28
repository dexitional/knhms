import { z } from "zod";
import { optionalField } from "../../lib/optional-field.js";

export const createVendorSchema = z.object({
  name: z.string().trim().min(2).max(150),
  cuisine: optionalField(z.string().trim().max(100)),
  description: optionalField(z.string().trim().max(500)),
  logoUrl: optionalField(z.string().url().max(500)),
  phone: optionalField(z.string().trim().max(30)),
  location: optionalField(z.string().trim().max(255)),
  openingHours: optionalField(z.string().trim().max(150)),
  delivers: z.boolean().optional(),
  isOpen: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export const updateVendorSchema = createVendorSchema.partial();

export const createMenuItemSchema = z.object({
  section: z.string().trim().min(1).max(60),
  name: z.string().trim().min(2).max(150),
  description: optionalField(z.string().trim().max(500)),
  price: z.number().positive().max(99_999),
  imageUrl: optionalField(z.string().url().max(500)),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();
