import {
  BedDouble,
  BookOpen,
  Briefcase,
  Dumbbell,
  Laptop,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Must stay in sync with marketIconSchema in server/api/modules/market/schema.ts.
export const MARKET_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  "book-open": { icon: BookOpen, label: "Books" },
  laptop: { icon: Laptop, label: "Laptop" },
  smartphone: { icon: Smartphone, label: "Phone" },
  bed: { icon: BedDouble, label: "Bed" },
  shirt: { icon: Shirt, label: "Clothing" },
  utensils: { icon: UtensilsCrossed, label: "Food" },
  briefcase: { icon: Briefcase, label: "Office" },
  sparkles: { icon: Sparkles, label: "Beauty" },
  dumbbell: { icon: Dumbbell, label: "Sports" },
  "shopping-bag": { icon: ShoppingBag, label: "General" },
};

export function marketIcon(key: string): LucideIcon {
  return MARKET_ICONS[key]?.icon ?? ShoppingBag;
}

export const AUDIENCE_LABELS = {
  all: "Everyone",
  students: "Students",
  staff: "Staff",
} as const;

// "GH₵ 1 300" — the grouping style Ghanaian shoppers see on local stores.
export function formatCedis(amount: number) {
  const rounded = Number.isInteger(amount) ? amount : Number(amount.toFixed(2));
  const [whole, fraction] = String(rounded).split(".");
  return `GH₵ ${whole!.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}${fraction ? `.${fraction.padEnd(2, "0")}` : ""}`;
}

export function discountPercent(price: number, oldPrice: number | null) {
  if (oldPrice == null || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

// ---- Admin analytics (server/api/modules/analytics) -----------------------------

export interface ListingStats {
  views: number;
  whatsapp: number;
  calls: number;
}

export interface MarketAnalytics {
  range: { days: 7 | 30 | 90; from: string; to: string };
  totals: { views: number; clicks: number; whatsapp: number; calls: number };
  previous: { views: number; clicks: number; whatsapp: number; calls: number };
  products: Record<string, ListingStats>; // keyed by product id
  vendors: Record<string, ListingStats>; // keyed by vendor id
}
