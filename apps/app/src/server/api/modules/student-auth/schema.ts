import { z } from "zod";

export const registerStudentSchema = z
  .object({
    roomNumber: z.string().min(1, "Room number is required"),
    gender: z.enum(["male", "female"]),
    fullName: z.string().min(2).max(150),
    registrationNumber: z.string().min(3).max(30),
    programme: z.string().min(2).max(150),
    level: z.enum(["100", "200", "300", "400", "500", "600"]),
    phoneCountryCode: z.string().min(1).max(5),
    phoneNumber: z.string().min(6).max(20),
    passportPhotoUrl: z.string().url(),
    emergencyContactName: z.string().min(2).max(150),
    email: z.string().email().max(150),
    emergencyContactNumber: z.string().min(6).max(20),
    idType: z.enum(["ghana_card", "passport"]),
    idNumber: z.string().min(3).max(50),
    receiptUrl: z.string().url(),
    pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
    confirmPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  })
  .refine((data) => data.pin === data.confirmPin, {
    message: "PINs do not match",
    path: ["confirmPin"],
  });

export const studentLoginSchema = z.object({
  registrationNumber: z.string().min(1, "Registration number is required"),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

export const forgotPinSchema = z.object({
  registrationNumber: z.string().min(1, "Registration number is required"),
});

export const resetPinSchema = z
  .object({
    registrationNumber: z.string().min(1, "Registration number is required"),
    otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
    newPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
    confirmNewPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  })
  .refine((data) => data.newPin === data.confirmNewPin, {
    message: "PINs do not match",
    path: ["confirmNewPin"],
  });

export const changeOwnPinSchema = z
  .object({
    currentPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
    newPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
    confirmNewPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  })
  .refine((data) => data.newPin === data.confirmNewPin, {
    message: "PINs do not match",
    path: ["confirmNewPin"],
  });
