import bcrypt from "bcryptjs";
import { getPool } from "@knh/db";
import type { SellerPaymentRow, SellerRow, SellerStatus } from "@knh/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import { generateTemporaryPassword } from "../../lib/password.js";
import { ghanaPhoneToE164, maskPhone, sendSms } from "../../lib/sms.js";
import { addDays, billingSummary, getBillingSettings, monthlyCoverage, today } from "./billing.js";
import type {
  recordPaymentSchema,
  updateBillingSettingsSchema,
  updateFeeWaiversSchema,
  updateSellerStatusSchema,
} from "./schema.js";

type SettingsInput = z.infer<typeof updateBillingSettingsSchema>;
type StatusInput = z.infer<typeof updateSellerStatusSchema>;
type PaymentInput = z.infer<typeof recordPaymentSchema>;
type WaiversInput = z.infer<typeof updateFeeWaiversSchema>;

export type PublicSeller = Omit<SellerRow, "password_hash" | "failed_login_attempts" | "locked_until">;

// Never selects password_hash or lockout state.
const SELLER_COLUMNS = `
  id, seller_type, business_name, owner_name, email, phone, location, description, logo_url,
  status, status_reason, reviewed_by, reviewed_at, registration_paid_at, paid_until,
  registration_fee_waived, monthly_fee_waived, created_at, updated_at
`;

export async function getSeller(id: number): Promise<PublicSeller> {
  const [rows] = await getPool().execute<(PublicSeller & RowDataPacket)[]>(
    `SELECT ${SELLER_COLUMNS} FROM sellers WHERE id = ?`,
    [id],
  );
  if (!rows[0]) throw new AppError("Seller not found.", 404);
  return { ...rows[0] };
}

function toPayment(row: RowDataPacket): SellerPaymentRow & { recorded_by_name: string | null } {
  return { ...(row as SellerPaymentRow & { recorded_by_name: string | null }), amount: Number(row.amount) };
}

export async function listPayments(sellerId: number) {
  const [rows] = await getPool().execute<RowDataPacket[]>(
    `SELECT p.*, a.full_name AS recorded_by_name
     FROM seller_payments p LEFT JOIN admins a ON a.id = p.recorded_by
     WHERE p.seller_id = ? ORDER BY p.created_at DESC, p.id DESC`,
    [sellerId],
  );
  return rows.map(toPayment);
}

export async function listingCount(seller: Pick<SellerRow, "id" | "seller_type">) {
  const sql =
    seller.seller_type === "business"
      ? "SELECT COUNT(*) AS n FROM market_products WHERE seller_id = ?"
      : `SELECT COUNT(*) AS n FROM food_menu_items i
         JOIN food_vendors v ON v.id = i.vendor_id WHERE v.seller_id = ?`;
  const [rows] = await getPool().execute<RowDataPacket[]>(sql, [seller.id]);
  return Number(rows[0]?.n ?? 0);
}

// ---- Admin: list & detail --------------------------------------------------

export async function listSellers() {
  const [[rows], settings] = await Promise.all([
    getPool().query<(PublicSeller & RowDataPacket)[]>(
      `SELECT ${SELLER_COLUMNS} FROM sellers
       ORDER BY FIELD(status, 'pending', 'approved', 'suspended', 'rejected'), created_at DESC`,
    ),
    getBillingSettings(),
  ]);
  return rows.map((s) => ({ ...s, billing: billingSummary(s, settings) }));
}

export async function getSellerDetail(id: number) {
  const seller = await getSeller(id);
  const [settings, payments, listings, reviewer] = await Promise.all([
    getBillingSettings(),
    listPayments(id),
    listingCount(seller),
    seller.reviewed_by
      ? getPool()
          .execute<RowDataPacket[]>("SELECT full_name FROM admins WHERE id = ?", [seller.reviewed_by])
          .then(([r]) => (r[0]?.full_name as string | undefined) ?? null)
      : Promise.resolve(null),
  ]);
  return {
    seller: { ...seller, reviewed_by_name: reviewer },
    billing: billingSummary(seller, settings),
    payments,
    listingCount: listings,
  };
}

// ---- Admin: status ----------------------------------------------------------

const ALLOWED_FROM: Record<StatusInput["status"], SellerStatus[]> = {
  approved: ["pending", "rejected", "suspended"],
  rejected: ["pending"],
  suspended: ["approved"],
};

function notify(phone: string, message: string) {
  void sendSms(ghanaPhoneToE164(phone), message).catch((err: unknown) =>
    console.error("Failed to send seller SMS:", err),
  );
}

export async function updateStatus(id: number, adminId: number, input: StatusInput) {
  const seller = await getSeller(id);
  if (seller.status === input.status) throw new AppError(`This seller is already ${input.status}.`, 409);
  if (!ALLOWED_FROM[input.status].includes(seller.status)) {
    throw new AppError(`A ${seller.status} seller can't be ${input.status}.`, 409);
  }

  await getPool().execute(
    "UPDATE sellers SET status = ?, status_reason = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?",
    [input.status, input.status === "approved" ? null : input.reason!, adminId, id],
  );
  if (input.status === "approved") {
    await applyWaivers(await getSeller(id), {
      registrationFeeWaived: input.registrationFeeWaived,
      monthlyFeeWaived: input.monthlyFeeWaived,
    });
  }

  const name = seller.business_name;
  if (input.status === "approved") {
    notify(
      seller.phone,
      seller.status === "pending"
        ? `Good news! ${name} has been approved as a seller on the KNH E-Market. Log in to your seller portal to add your listings.`
        : `${name} has been reinstated on the KNH E-Market. Your listings are visible again.`,
    );
  } else if (input.status === "rejected") {
    notify(seller.phone, `Your KNH E-Market seller application for ${name} was not approved. Reason: ${input.reason}`);
  } else {
    notify(seller.phone, `${name} has been suspended on the KNH E-Market and your listings are hidden. Reason: ${input.reason}`);
  }

  return getSellerDetail(id);
}

// ---- Admin: fee waivers ------------------------------------------------------

async function applyWaivers(seller: Awaited<ReturnType<typeof getSeller>>, input: WaiversInput) {
  const columns: string[] = [];
  const params: Array<number | string> = [];
  if (input.registrationFeeWaived !== undefined) {
    columns.push("registration_fee_waived = ?");
    params.push(input.registrationFeeWaived ? 1 : 0);
  }
  if (input.monthlyFeeWaived !== undefined) {
    columns.push("monthly_fee_waived = ?");
    params.push(input.monthlyFeeWaived ? 1 : 0);
    // Lifting a monthly waiver starts billing from today, rather than
    // charging for the months that were waived.
    const lifting = !input.monthlyFeeWaived && seller.monthly_fee_waived === 1;
    const billing = seller.status === "approved" || seller.status === "suspended";
    const yesterday = addDays(today(), -1);
    if (lifting && billing && (!seller.paid_until || seller.paid_until < yesterday)) {
      columns.push("paid_until = ?");
      params.push(yesterday);
    }
  }
  if (columns.length === 0) return;
  await getPool().execute(`UPDATE sellers SET ${columns.join(", ")} WHERE id = ?`, [...params, seller.id]);
}

export async function updateFeeWaivers(id: number, input: WaiversInput) {
  const seller = await getSeller(id);
  if (seller.status === "rejected") throw new AppError("Can't change fees for a rejected seller.", 409);
  await applyWaivers(seller, input);
  return getSellerDetail(id);
}

// ---- Admin: payments ---------------------------------------------------------

export async function recordPayment(sellerId: number, adminId: number, input: PaymentInput) {
  const seller = await getSeller(sellerId);
  if (seller.status === "rejected") throw new AppError("Can't record payments for a rejected seller.", 409);
  if (input.kind === "registration" && seller.registration_paid_at) {
    throw new AppError("The registration fee has already been paid.", 409);
  }
  if (input.kind === "registration" && seller.registration_fee_waived) {
    throw new AppError("The registration fee is waived for this seller.", 409);
  }
  if (input.kind === "monthly" && seller.monthly_fee_waived) {
    throw new AppError("The monthly fee is waived for this seller.", 409);
  }

  const coverage = input.kind === "monthly" ? monthlyCoverage(seller.paid_until, input.months!) : null;

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute<ResultSetHeader>(
      `INSERT INTO seller_payments
         (seller_id, kind, amount, months, covers_from, covers_to, method, reference, note, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sellerId,
        input.kind,
        input.amount,
        input.kind === "monthly" ? input.months! : null,
        coverage?.from ?? null,
        coverage?.to ?? null,
        input.method,
        input.reference ?? null,
        input.note ?? null,
        adminId,
      ],
    );
    if (input.kind === "registration") {
      await connection.execute("UPDATE sellers SET registration_paid_at = NOW() WHERE id = ?", [sellerId]);
    } else {
      await connection.execute("UPDATE sellers SET paid_until = ? WHERE id = ?", [coverage!.to, sellerId]);
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  return getSellerDetail(sellerId);
}

// ---- Admin: password reset -----------------------------------------------------

export async function resetSellerPassword(id: number) {
  const seller = await getSeller(id);
  const password = generateTemporaryPassword();
  await getPool().execute(
    "UPDATE sellers SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL WHERE id = ?",
    [await bcrypt.hash(password, 12), id],
  );
  const phone = ghanaPhoneToE164(seller.phone);
  await sendSms(
    phone,
    `Your KNH E-Market seller password has been reset. New password: ${password}. Please log in and change it.`,
  );
  return { phone: maskPhone(phone) };
}

// ---- Admin: billing settings ---------------------------------------------------

export async function updateBillingSettings(adminId: number, input: SettingsInput) {
  await getPool().execute(
    `INSERT INTO seller_billing_settings
       (id, business_registration_fee, business_monthly_fee, food_vendor_registration_fee,
        food_vendor_monthly_fee, payment_instructions, updated_by)
     VALUES (1, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       business_registration_fee = VALUES(business_registration_fee),
       business_monthly_fee = VALUES(business_monthly_fee),
       food_vendor_registration_fee = VALUES(food_vendor_registration_fee),
       food_vendor_monthly_fee = VALUES(food_vendor_monthly_fee),
       payment_instructions = VALUES(payment_instructions),
       updated_by = VALUES(updated_by)`,
    [
      input.businessRegistrationFee,
      input.businessMonthlyFee,
      input.foodVendorRegistrationFee,
      input.foodVendorMonthlyFee,
      input.paymentInstructions ?? null,
      adminId,
    ],
  );
  return getBillingSettings();
}
