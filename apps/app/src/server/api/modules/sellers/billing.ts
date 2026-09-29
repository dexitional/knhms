import { getPool } from "@knh/db";
import type { SellerRow, SellerType } from "@knh/db";
import type { RowDataPacket } from "mysql2";

// Billing model: a one-time registration fee, then a monthly fee once the
// seller is approved. Payments are recorded by admins (MoMo/cash/bank);
// each monthly payment extends `paid_until`. Overdue sellers are flagged,
// never auto-suspended — admins decide. Admins may waive either fee for an
// individual seller; a waived fee is never charged.

export interface BillingSettings {
  businessRegistrationFee: number;
  businessMonthlyFee: number;
  foodVendorRegistrationFee: number;
  foodVendorMonthlyFee: number;
  paymentInstructions: string | null;
}

export async function getBillingSettings(): Promise<BillingSettings> {
  const [rows] = await getPool().query<RowDataPacket[]>("SELECT * FROM seller_billing_settings WHERE id = 1");
  const row = rows[0];
  return {
    businessRegistrationFee: Number(row?.business_registration_fee ?? 0),
    businessMonthlyFee: Number(row?.business_monthly_fee ?? 0),
    foodVendorRegistrationFee: Number(row?.food_vendor_registration_fee ?? 0),
    foodVendorMonthlyFee: Number(row?.food_vendor_monthly_fee ?? 0),
    paymentInstructions: row?.payment_instructions ?? null,
  };
}

export function feesFor(settings: BillingSettings, type: SellerType) {
  return type === "business"
    ? { registrationFee: settings.businessRegistrationFee, monthlyFee: settings.businessMonthlyFee }
    : { registrationFee: settings.foodVendorRegistrationFee, monthlyFee: settings.foodVendorMonthlyFee };
}

// ---- Dates (YYYY-MM-DD strings; Ghana is UTC+0 year-round) ---------------

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Calendar months, clamped so 31 Jan + 1 month = 28/29 Feb, not 3 Mar.
export function addMonths(date: string, months: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

// The period a new monthly payment covers: continues from the current
// paid-up date if it hasn't lapsed, otherwise starts today.
export function monthlyCoverage(paidUntil: string | null, months: number) {
  const now = today();
  const from = paidUntil && paidUntil >= now ? addDays(paidUntil, 1) : now;
  return { from, to: addDays(addMonths(from, months), -1) };
}

// ---- Status ---------------------------------------------------------------

export type BillingState = "not_applicable" | "registration_due" | "overdue" | "due_soon" | "active";

const DUE_SOON_DAYS = 7;

export interface BillingSummary {
  registrationFee: number;
  monthlyFee: number;
  registrationPaid: boolean;
  registrationWaived: boolean;
  monthlyWaived: boolean;
  paidUntil: string | null;
  state: BillingState;
  daysOverdue: number;
  amountDue: number;
}

type BillableSeller = Pick<
  SellerRow,
  | "seller_type"
  | "status"
  | "registration_paid_at"
  | "paid_until"
  | "reviewed_at"
  | "registration_fee_waived"
  | "monthly_fee_waived"
>;

export function billingSummary(seller: BillableSeller, settings: BillingSettings): BillingSummary {
  const fees = feesFor(settings, seller.seller_type);
  // A per-seller waiver, or a zero fee in settings, means nothing is charged.
  const registrationWaived = seller.registration_fee_waived === 1 || fees.registrationFee === 0;
  const monthlyWaived = seller.monthly_fee_waived === 1 || fees.monthlyFee === 0;
  const registrationFee = registrationWaived ? 0 : fees.registrationFee;
  const monthlyFee = monthlyWaived ? 0 : fees.monthlyFee;
  const registrationPaid = seller.registration_paid_at != null || registrationWaived;
  const base = {
    registrationFee,
    monthlyFee,
    registrationPaid,
    registrationWaived,
    monthlyWaived,
    paidUntil: seller.paid_until,
  };

  if (seller.status === "rejected") {
    return { ...base, state: "not_applicable", daysOverdue: 0, amountDue: 0 };
  }

  const registrationDue = registrationPaid ? 0 : registrationFee;

  // Monthly billing starts at approval.
  const billsMonthly = (seller.status === "approved" || seller.status === "suspended") && monthlyFee > 0;
  const now = today();
  // The next month is due the day after `paid_until` (or on approval day if
  // nothing has been paid yet), and overdue from the day after that.
  const dueDate = seller.paid_until
    ? addDays(seller.paid_until, 1)
    : (seller.reviewed_at?.slice(0, 10) ?? now);
  const monthlyDue = billsMonthly && dueDate <= now;
  const daysOverdue = monthlyDue ? daysBetween(dueDate, now) : 0;

  let state: BillingState = "active";
  if (daysOverdue > 0) state = "overdue";
  else if (!registrationPaid) state = "registration_due";
  else if (monthlyDue || (billsMonthly && daysBetween(now, dueDate) <= DUE_SOON_DAYS)) state = "due_soon";

  return { ...base, state, daysOverdue, amountDue: registrationDue + (monthlyDue ? monthlyFee : 0) };
}
