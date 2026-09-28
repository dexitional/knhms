import { api } from "#/lib/api-client";

// Client-safe labels and shapes shared by the seller portal and the admin
// Sellers pages. Mirrors server/api/modules/sellers (billing.ts, service.ts).

export type SellerType = "business" | "food_vendor";
export type SellerStatus = "pending" | "approved" | "rejected" | "suspended";
export type BillingState = "not_applicable" | "registration_due" | "overdue" | "due_soon" | "active";
export type PaymentMethod = "momo" | "cash" | "bank" | "other";

export interface Seller {
  id: number;
  seller_type: SellerType;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  location: string | null;
  description: string | null;
  status: SellerStatus;
  status_reason: string | null;
  reviewed_at: string | null;
  registration_paid_at: string | null;
  paid_until: string | null;
  created_at: string;
}

export interface BillingSummary {
  registrationFee: number;
  monthlyFee: number;
  registrationPaid: boolean;
  paidUntil: string | null;
  state: BillingState;
  daysOverdue: number;
  amountDue: number;
}

export interface SellerPayment {
  id: number;
  kind: "registration" | "monthly";
  amount: number;
  months: number | null;
  covers_from: string | null;
  covers_to: string | null;
  method: PaymentMethod;
  reference: string | null;
  note: string | null;
  created_at: string;
  recorded_by_name?: string | null;
}

export interface BillingSettings {
  businessRegistrationFee: number;
  businessMonthlyFee: number;
  foodVendorRegistrationFee: number;
  foodVendorMonthlyFee: number;
  paymentInstructions: string | null;
}

export const SELLER_TYPE_LABELS: Record<SellerType, string> = {
  business: "Business",
  food_vendor: "Food Vendor",
};

export const STATUS_LABELS: Record<SellerStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const STATUS_BADGE = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  suspended: "danger",
} as const;

export const BILLING_LABELS: Record<BillingState, string> = {
  not_applicable: "—",
  registration_due: "Registration due",
  overdue: "Overdue",
  due_soon: "Due soon",
  active: "Paid up",
};

export const BILLING_BADGE = {
  not_applicable: "secondary",
  registration_due: "warning",
  overdue: "danger",
  due_soon: "warning",
  active: "success",
} as const;

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  momo: "Mobile Money",
  cash: "Cash",
  bank: "Bank transfer",
  other: "Other",
};

// "2026-09-28" or "2026-09-28 10:15:00" → "28 Sep 2026"
export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export interface SellerOverview {
  seller: Seller;
  billing: BillingSummary;
  paymentInstructions: string | null;
  payments: Array<SellerPayment>;
  listingCount: number;
}

// Shared by the seller portal layout and pages (one cached fetch).
export const sellerOverviewQuery = {
  queryKey: ["seller", "overview"],
  queryFn: () => api.get<SellerOverview>("/seller/overview"),
};
