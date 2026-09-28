import { z } from "zod";
import { optionalField } from "../../lib/optional-field.js";

// Ghana numbers: "024 123 4567", "0241234567", "+233 24 123 4567",
// "+233 (0) 24 123 4567".
export const ghanaPhoneSchema = z
  .string()
  .trim()
  .max(30)
  .refine(
    (v) => {
      const digits = v.replace(/\(0\)/g, "").replace(/[\s()-]/g, "");
      return /^0\d{9}$/.test(digits) || /^\+?233\d{9}$/.test(digits);
    },
    { message: "Enter a valid Ghana phone number, e.g. 024 123 4567" },
  );

export const sellerRegisterSchema = z
  .object({
    sellerType: z.enum(["business", "food_vendor"]),
    businessName: z.string().trim().min(2).max(150),
    ownerName: z.string().trim().min(2).max(150),
    email: z.string().trim().toLowerCase().email().max(150),
    phone: ghanaPhoneSchema,
    location: optionalField(z.string().trim().max(255)),
    description: optionalField(z.string().trim().max(500)),
    password: z.string().min(8, "Password must be at least 8 characters").max(100),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const sellerLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Password is required"),
});

export const sellerChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(100),
});
