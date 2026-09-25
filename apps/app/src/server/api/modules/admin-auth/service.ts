import bcrypt from "bcryptjs";
import { getPool } from "@knh/db";
import type { RowDataPacket } from "mysql2";
import type { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import {
  DUMMY_BCRYPT_HASH,
  computeLockoutUntil,
  formatLockedUntil,
  isLockedOut,
} from "../../lib/lockout.js";
import { OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_SECONDS, OTP_TTL_MINUTES, generateOtp } from "../../lib/otp.js";
import { maskPhone, sendSms, toE164 } from "../../lib/sms.js";
import { signAdminToken } from "#/server/session-core";
import type {
  adminForgotPasswordSchema,
  adminLoginSchema,
  adminResetPasswordSchema,
  changeOwnPasswordSchema,
} from "./schema.js";

type LoginInput = z.infer<typeof adminLoginSchema>;
type ChangePasswordInput = z.infer<typeof changeOwnPasswordSchema>;
type ForgotPasswordInput = z.infer<typeof adminForgotPasswordSchema>;
type ResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;

export async function loginAdmin(input: LoginInput) {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, role, password_hash, failed_login_attempts, locked_until
     FROM admins WHERE institutional_email = ? AND is_active = 1`,
    [input.institutionalEmail],
  );
  const admin = rows[0];

  if (!admin) {
    await bcrypt.compare(input.password, DUMMY_BCRYPT_HASH);
    throw new AppError("Invalid email or password.", 401);
  }

  if (isLockedOut(admin.locked_until)) {
    throw new AppError(
      `This account is temporarily locked. Try again after ${formatLockedUntil(admin.locked_until)}.`,
      429,
    );
  }

  const valid = await bcrypt.compare(input.password, admin.password_hash);
  if (!valid) {
    const failedAttempts = admin.failed_login_attempts + 1;
    const lockedUntil = computeLockoutUntil(failedAttempts);
    await pool.execute("UPDATE admins SET failed_login_attempts = ?, locked_until = ? WHERE id = ?", [
      failedAttempts,
      lockedUntil,
      admin.id,
    ]);
    throw new AppError("Invalid email or password.", 401);
  }

  await pool.execute("UPDATE admins SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?", [
    admin.id,
  ]);

  const token = await signAdminToken(admin.id, admin.role);
  return { adminId: admin.id, token };
}

export async function changeOwnPassword(adminId: number, input: ChangePasswordInput) {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>("SELECT password_hash FROM admins WHERE id = ?", [
    adminId,
  ]);
  const admin = rows[0];
  if (!admin) throw new AppError("Not found.", 404);

  const valid = await bcrypt.compare(input.currentPassword, admin.password_hash);
  if (!valid) throw new AppError("Current password is incorrect.", 401);

  const newHash = await bcrypt.hash(input.newPassword, 12);
  await pool.execute("UPDATE admins SET password_hash = ? WHERE id = ?", [newHash, adminId]);
}

// Mirrors student-auth's requestPinReset/resetPin — same OTP-via-phone
// mechanism, own table (admin_password_reset_otps) since it FKs to admins
// rather than students. Institutional email is treated as not-secret for
// the same reason as a student registration number (already discoverable —
// staff directories, guessable name.surname@ format), so a wrong email gets
// a clear "not found" error rather than a generic non-committal one.
export async function requestPasswordReset(input: ForgotPasswordInput) {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT id, phone_number FROM admins WHERE institutional_email = ? AND is_active = 1",
    [input.institutionalEmail],
  );
  const admin = rows[0];
  if (!admin) throw new AppError("No account found with that email.", 404);
  if (!admin.phone_number) {
    throw new AppError(
      "No phone number on file for this account. Ask a super admin to add one before resetting your password this way.",
      400,
    );
  }

  const [recentRows] = await pool.execute<RowDataPacket[]>(
    "SELECT created_at FROM admin_password_reset_otps WHERE admin_id = ? ORDER BY created_at DESC LIMIT 1",
    [admin.id],
  );
  const mostRecent = recentRows[0];
  if (mostRecent) {
    const secondsSinceLast = (Date.now() - new Date(mostRecent.created_at).getTime()) / 1000;
    if (secondsSinceLast < OTP_RESEND_COOLDOWN_SECONDS) {
      throw new AppError(
        `Please wait ${Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast)}s before requesting another code.`,
        429,
      );
    }
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 12);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

  await pool.execute(
    "INSERT INTO admin_password_reset_otps (admin_id, otp_hash, expires_at) VALUES (?, ?, ?)",
    [admin.id, otpHash, expiresAt],
  );

  // Admins store one phone_number field (no separate country code column,
  // unlike students) — this hall's admins are all Ghana-based, so the same
  // default-country-code convention applies.
  const phone = toE164("+233", admin.phone_number);
  void sendSms(
    phone,
    `Your Kwame Nkrumah Hall admin password reset code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes. Do not share this code.`,
  ).catch((err: unknown) => console.error("Failed to send admin password reset SMS:", err));

  return { maskedPhone: maskPhone(phone) };
}

export async function resetPassword(input: ResetPasswordInput) {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT id FROM admins WHERE institutional_email = ? AND is_active = 1",
    [input.institutionalEmail],
  );
  const admin = rows[0];
  if (!admin) throw new AppError("No account found with that email.", 404);

  const [otpRows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, otp_hash, expires_at, attempts FROM admin_password_reset_otps
     WHERE admin_id = ? AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [admin.id],
  );
  const otpRow = otpRows[0];
  if (!otpRow) {
    await bcrypt.compare(input.otp, DUMMY_BCRYPT_HASH);
    throw new AppError("Invalid or expired code. Please request a new one.", 400);
  }

  if (new Date(otpRow.expires_at).getTime() < Date.now()) {
    throw new AppError("This code has expired. Please request a new one.", 400);
  }
  if (otpRow.attempts >= OTP_MAX_ATTEMPTS) {
    throw new AppError("Too many incorrect attempts. Please request a new code.", 429);
  }

  const valid = await bcrypt.compare(input.otp, otpRow.otp_hash);
  if (!valid) {
    await pool.execute("UPDATE admin_password_reset_otps SET attempts = attempts + 1 WHERE id = ?", [
      otpRow.id,
    ]);
    throw new AppError("Incorrect code. Please try again.", 400);
  }

  const newPasswordHash = await bcrypt.hash(input.newPassword, 12);
  await pool.execute(
    "UPDATE admins SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL WHERE id = ?",
    [newPasswordHash, admin.id],
  );
  await pool.execute("UPDATE admin_password_reset_otps SET consumed_at = NOW() WHERE id = ?", [otpRow.id]);
}
