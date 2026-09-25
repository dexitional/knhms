import { z } from "zod";

export const adminLoginSchema = z.object({
  institutionalEmail: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export const adminForgotPasswordSchema = z.object({
  institutionalEmail: z.string().email("Enter a valid email"),
});

export const adminResetPasswordSchema = z
  .object({
    institutionalEmail: z.string().email("Enter a valid email"),
    otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmNewPassword: z.string().min(8, "New password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });
