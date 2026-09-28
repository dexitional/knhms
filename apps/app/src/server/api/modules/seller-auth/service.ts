import bcrypt from "bcryptjs";
import { getPool } from "@knh/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import { DUMMY_BCRYPT_HASH, computeLockoutUntil, formatLockedUntil, isLockedOut } from "../../lib/lockout.js";
import { signSellerToken } from "#/server/session-core";
import type { sellerChangePasswordSchema, sellerLoginSchema, sellerRegisterSchema } from "./schema.js";

type RegisterInput = z.infer<typeof sellerRegisterSchema>;
type LoginInput = z.infer<typeof sellerLoginSchema>;
type ChangePasswordInput = z.infer<typeof sellerChangePasswordSchema>;

interface MysqlError extends Error {
  code?: string;
}

// Creates a pending seller and signs them straight in, so they can set up
// their listings while the application is reviewed. Food vendors also get
// their (initially hidden-until-approved) vendor profile.
export async function registerSeller(input: RegisterInput) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const connection = await getPool().getConnection();
  let sellerId: number;
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO sellers (seller_type, business_name, owner_name, email, phone, location, description, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.sellerType,
        input.businessName,
        input.ownerName,
        input.email,
        input.phone,
        input.location ?? null,
        input.description ?? null,
        passwordHash,
      ],
    );
    sellerId = result.insertId;
    if (input.sellerType === "food_vendor") {
      await connection.execute(
        "INSERT INTO food_vendors (seller_id, name, description, phone, location) VALUES (?, ?, ?, ?, ?)",
        [sellerId, input.businessName, input.description ?? null, input.phone, input.location ?? null],
      );
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    if ((err as MysqlError).code === "ER_DUP_ENTRY") {
      throw new AppError("An account with that email already exists. Try logging in instead.", 409);
    }
    throw err;
  } finally {
    connection.release();
  }
  return { sellerId, token: await signSellerToken(sellerId) };
}

export async function loginSeller(input: LoginInput) {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT id, password_hash, failed_login_attempts, locked_until FROM sellers WHERE email = ?",
    [input.email],
  );
  const seller = rows[0];

  if (!seller) {
    await bcrypt.compare(input.password, DUMMY_BCRYPT_HASH);
    throw new AppError("Invalid email or password.", 401);
  }

  if (isLockedOut(seller.locked_until)) {
    throw new AppError(
      `This account is temporarily locked. Try again after ${formatLockedUntil(seller.locked_until)}.`,
      429,
    );
  }

  if (!(await bcrypt.compare(input.password, seller.password_hash))) {
    const failedAttempts = seller.failed_login_attempts + 1;
    await pool.execute("UPDATE sellers SET failed_login_attempts = ?, locked_until = ? WHERE id = ?", [
      failedAttempts,
      computeLockoutUntil(failedAttempts),
      seller.id,
    ]);
    throw new AppError("Invalid email or password.", 401);
  }

  await pool.execute("UPDATE sellers SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?", [seller.id]);
  return { sellerId: seller.id as number, token: await signSellerToken(seller.id) };
}

export async function changePassword(sellerId: number, input: ChangePasswordInput) {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>("SELECT password_hash FROM sellers WHERE id = ?", [sellerId]);
  if (!rows[0]) throw new AppError("Not found.", 404);
  if (!(await bcrypt.compare(input.currentPassword, rows[0].password_hash))) {
    throw new AppError("Current password is incorrect.", 401);
  }
  await pool.execute("UPDATE sellers SET password_hash = ? WHERE id = ?", [
    await bcrypt.hash(input.newPassword, 12),
    sellerId,
  ]);
}
