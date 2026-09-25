import bcrypt from "bcryptjs";
import { getPool } from "@knh/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
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
import { signStudentToken } from "#/server/session-core";
import type {
  changeOwnPinSchema,
  forgotPinSchema,
  registerStudentSchema,
  resetPinSchema,
  studentLoginSchema,
} from "./schema.js";

type RegisterInput = z.infer<typeof registerStudentSchema>;
type LoginInput = z.infer<typeof studentLoginSchema>;
type ForgotPinInput = z.infer<typeof forgotPinSchema>;
type ResetPinInput = z.infer<typeof resetPinSchema>;
type ChangeOwnPinInput = z.infer<typeof changeOwnPinSchema>;

interface MysqlError extends Error {
  code?: string;
}

export async function registerStudent(input: RegisterInput) {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Row lock on the room, not a maintained occupancy counter, is what
    // prevents two concurrent registrations from both reading "2 of 4
    // occupied" and both inserting into the same last slot.
    const [roomRows] = await connection.execute<RowDataPacket[]>(
      "SELECT id, capacity FROM rooms WHERE room_number = ? AND is_active = 1 FOR UPDATE",
      [input.roomNumber],
    );
    const room = roomRows[0];
    if (!room) throw new AppError("Room number not found.", 400);

    const [countRows] = await connection.execute<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM students WHERE room_id = ?",
      [room.id],
    );
    const occupied = Number(countRows[0]?.count ?? 0);
    if (occupied >= room.capacity) {
      throw new AppError("This room is already at full capacity.", 409);
    }

    const pinHash = await bcrypt.hash(input.pin, 12);

    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO students (
         room_id, gender, full_name, registration_number, programme, level,
         phone_country_code, phone_number, passport_photo_url,
         emergency_contact_name, email, emergency_contact_number,
         id_type, id_number, receipt_url, pin_hash
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        room.id,
        input.gender,
        input.fullName,
        input.registrationNumber,
        input.programme,
        input.level,
        input.phoneCountryCode,
        input.phoneNumber,
        input.passportPhotoUrl,
        input.emergencyContactName,
        input.email,
        input.emergencyContactNumber,
        input.idType,
        input.idNumber,
        input.receiptUrl,
        pinHash,
      ],
    );

    await connection.commit();

    const studentId = result.insertId;
    const token = await signStudentToken(studentId);
    return { studentId, token };
  } catch (err) {
    await connection.rollback();
    if (err instanceof AppError) throw err;
    if ((err as MysqlError).code === "ER_DUP_ENTRY") {
      throw new AppError("Registration number or email is already registered.", 409);
    }
    throw err;
  } finally {
    connection.release();
  }
}

export async function loginStudent(input: LoginInput) {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT id, pin_hash, failed_pin_attempts, locked_until FROM students WHERE registration_number = ?",
    [input.registrationNumber],
  );
  const student = rows[0];

  if (!student) {
    // Timing-safe: run a real bcrypt compare even when no row was found, so
    // response timing doesn't reveal whether a registration number exists.
    await bcrypt.compare(input.pin, DUMMY_BCRYPT_HASH);
    throw new AppError("Invalid registration number or PIN.", 401);
  }

  if (isLockedOut(student.locked_until)) {
    throw new AppError(
      `This account is temporarily locked. Try again after ${formatLockedUntil(student.locked_until)}.`,
      429,
    );
  }

  const valid = await bcrypt.compare(input.pin, student.pin_hash);
  if (!valid) {
    const failedAttempts = student.failed_pin_attempts + 1;
    const lockedUntil = computeLockoutUntil(failedAttempts);
    await pool.execute("UPDATE students SET failed_pin_attempts = ?, locked_until = ? WHERE id = ?", [
      failedAttempts,
      lockedUntil,
      student.id,
    ]);
    throw new AppError("Invalid registration number or PIN.", 401);
  }

  await pool.execute("UPDATE students SET failed_pin_attempts = 0, locked_until = NULL WHERE id = ?", [
    student.id,
  ]);

  const token = await signStudentToken(student.id);
  return { studentId: student.id, token };
}

// Unlike login, a wrong registration number here gets a clear "not found"
// error rather than a generic message — registration numbers aren't secret
// in a hall context (they're printed on ID cards and room lists), and a
// student who mistyped one needs to know that, not be left wondering
// whether an OTP is coming. What genuinely must stay protected is the PIN
// itself, via the OTP step below.
export async function requestPinReset(input: ForgotPinInput) {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT id, phone_country_code, phone_number FROM students WHERE registration_number = ?",
    [input.registrationNumber],
  );
  const student = rows[0];
  if (!student) throw new AppError("No account found with that registration number.", 404);

  const [recentRows] = await pool.execute<RowDataPacket[]>(
    "SELECT created_at FROM pin_reset_otps WHERE student_id = ? ORDER BY created_at DESC LIMIT 1",
    [student.id],
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

  await pool.execute("INSERT INTO pin_reset_otps (student_id, otp_hash, expires_at) VALUES (?, ?, ?)", [
    student.id,
    otpHash,
    expiresAt,
  ]);

  const phone = toE164(student.phone_country_code, student.phone_number);
  // Fire-and-forget: the request shouldn't hang on (or fail because of) the
  // SMS provider's own latency/downtime — the OTP row already exists, and a
  // provider error is logged rather than surfaced to the student.
  void sendSms(
    phone,
    `Your Kwame Nkrumah Hall PIN reset code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes. Do not share this code.`,
  ).catch((err: unknown) => console.error("Failed to send PIN reset SMS:", err));

  return { maskedPhone: maskPhone(phone) };
}

export async function resetPin(input: ResetPinInput) {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT id FROM students WHERE registration_number = ?",
    [input.registrationNumber],
  );
  const student = rows[0];
  if (!student) throw new AppError("No account found with that registration number.", 404);

  const [otpRows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, otp_hash, expires_at, attempts FROM pin_reset_otps
     WHERE student_id = ? AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [student.id],
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
    await pool.execute("UPDATE pin_reset_otps SET attempts = attempts + 1 WHERE id = ?", [otpRow.id]);
    throw new AppError("Incorrect code. Please try again.", 400);
  }

  const newPinHash = await bcrypt.hash(input.newPin, 12);
  await pool.execute(
    "UPDATE students SET pin_hash = ?, failed_pin_attempts = 0, locked_until = NULL WHERE id = ?",
    [newPinHash, student.id],
  );
  await pool.execute("UPDATE pin_reset_otps SET consumed_at = NOW() WHERE id = ?", [otpRow.id]);
}

// A logged-in student changing their own PIN — distinct from resetPin above
// (which is for a locked-out student who can't log in at all): this path
// requires knowing the CURRENT PIN, no OTP involved.
export async function changeOwnPin(studentId: number, input: ChangeOwnPinInput) {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>("SELECT pin_hash FROM students WHERE id = ?", [
    studentId,
  ]);
  const student = rows[0];
  if (!student) throw new AppError("Not found.", 404);

  const valid = await bcrypt.compare(input.currentPin, student.pin_hash);
  if (!valid) throw new AppError("Current PIN is incorrect.", 401);

  const newHash = await bcrypt.hash(input.newPin, 12);
  await pool.execute("UPDATE students SET pin_hash = ? WHERE id = ?", [newHash, studentId]);
}
