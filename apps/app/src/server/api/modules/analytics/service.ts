import { createHash } from "node:crypto";
import { getPool } from "@knh/db";
import type { RowDataPacket } from "mysql2";
import type { z } from "zod";
import type { AnalyticsRange, AnalyticsTotals, SellerAnalytics } from "#/lib/sellers";
import type { ListingStats, MarketAnalytics } from "#/lib/market";
import type { SellerSessionUser } from "#/server/session-core";
import type { marketEventSchema } from "./schema.js";

// E-Market analytics: product/menu views and order clicks (WhatsApp or
// Call), recorded anonymously. Visitors are identified only by a daily
// one-way key (hash of IP + browser + date + a server secret), so no IP or
// personal data is stored, and each visitor counts once per listing per day.

type MarketEvent = z.infer<typeof marketEventSchema>;

const ymd = (d: Date) => d.toISOString().slice(0, 10);

function visitorKey(ip: string, userAgent: string, date: string) {
  const salt = process.env.ANALYTICS_SALT ?? process.env.SELLER_SESSION_SECRET ?? "knh-analytics";
  return createHash("sha256").update(`${ip}|${userAgent}|${date}|${salt}`).digest("hex").slice(0, 32);
}

// Silently ignores unknown or hidden listings — the page shouldn't care.
export async function recordEvent(event: MarketEvent, visitor: { ip: string; userAgent: string }) {
  const pool = getPool();
  const productId = "productId" in event ? event.productId : undefined;
  const vendorId = "vendorId" in event ? event.vendorId : undefined;

  const [rows] = productId
    ? await pool.execute<RowDataPacket[]>("SELECT seller_id FROM market_products WHERE id = ? AND is_active = 1", [productId])
    : vendorId
      ? await pool.execute<RowDataPacket[]>("SELECT seller_id FROM food_vendors WHERE id = ?", [vendorId])
      : [[]];
  if (!rows[0]) return;

  const date = ymd(new Date());
  const channel = event.type === "order_click" ? event.channel : null;
  const targetKey = `${productId ? `p${productId}` : `v${vendorId}`}${channel ? `:${channel}` : ""}`;
  // INSERT IGNORE + the daily unique key: repeats from the same visitor on
  // the same day are dropped.
  await pool.execute(
    `INSERT IGNORE INTO market_events
       (event_type, channel, product_id, vendor_id, seller_id, target_key, visitor_key, event_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.type,
      channel,
      productId ?? null,
      vendorId ?? null,
      rows[0].seller_id ?? null,
      targetKey,
      visitorKey(visitor.ip, visitor.userAgent, date),
      date,
    ],
  );
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return ymd(d);
}

function emptyTotals(): AnalyticsTotals {
  return { views: 0, clicks: 0, whatsapp: 0, calls: 0 };
}

function totalsFrom(rows: RowDataPacket[]): AnalyticsTotals {
  const t = emptyTotals();
  for (const r of rows) {
    const n = Number(r.n);
    if (r.event_type === "order_click") {
      t.clicks += n;
      if (r.channel === "whatsapp") t.whatsapp += n;
      else t.calls += n;
    } else t.views += n;
  }
  return t;
}

export async function getSellerAnalytics(seller: SellerSessionUser, days: AnalyticsRange): Promise<SellerAnalytics> {
  const pool = getPool();
  const to = ymd(new Date());
  const from = addDays(to, -(days - 1));
  const prevFrom = addDays(from, -days);

  const [[current], [previous], [daily], [listings]] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `SELECT event_type, channel, COUNT(*) AS n FROM market_events
       WHERE seller_id = ? AND event_date BETWEEN ? AND ? GROUP BY event_type, channel`,
      [seller.id, from, to],
    ),
    pool.query<RowDataPacket[]>(
      `SELECT event_type, channel, COUNT(*) AS n FROM market_events
       WHERE seller_id = ? AND event_date >= ? AND event_date < ? GROUP BY event_type, channel`,
      [seller.id, prevFrom, from],
    ),
    pool.query<RowDataPacket[]>(
      `SELECT DATE_FORMAT(event_date, '%Y-%m-%d') AS date,
              SUM(event_type <> 'order_click') AS views, SUM(event_type = 'order_click') AS clicks
       FROM market_events WHERE seller_id = ? AND event_date BETWEEN ? AND ? GROUP BY event_date`,
      [seller.id, from, to],
    ),
    // Every listing the seller has, including ones nobody has opened yet.
    seller.sellerType === "business"
      ? pool.query<RowDataPacket[]>(
          `SELECT p.id, p.name, p.image_url,
             COALESCE(SUM(e.event_type = 'product_view'), 0) AS views,
             COALESCE(SUM(e.event_type = 'order_click' AND e.channel = 'whatsapp'), 0) AS whatsapp,
             COALESCE(SUM(e.event_type = 'order_click' AND e.channel = 'call'), 0) AS calls
           FROM market_products p
           LEFT JOIN market_events e ON e.product_id = p.id AND e.event_date BETWEEN ? AND ?
           WHERE p.seller_id = ? GROUP BY p.id ORDER BY views DESC, p.name`,
          [from, to, seller.id],
        )
      : pool.query<RowDataPacket[]>(
          `SELECT v.id, v.name, v.logo_url AS image_url,
             COALESCE(SUM(e.event_type = 'vendor_view'), 0) AS views,
             COALESCE(SUM(e.event_type = 'order_click' AND e.channel = 'whatsapp'), 0) AS whatsapp,
             COALESCE(SUM(e.event_type = 'order_click' AND e.channel = 'call'), 0) AS calls
           FROM food_vendors v
           LEFT JOIN market_events e ON e.vendor_id = v.id AND e.event_date BETWEEN ? AND ?
           WHERE v.seller_id = ? GROUP BY v.id`,
          [from, to, seller.id],
        ),
  ]);

  // Fill in days with no activity so the chart has a point for every day.
  const byDate = new Map(daily.map((d) => [d.date as string, d]));
  const series: SellerAnalytics["daily"] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const row = byDate.get(d);
    series.push({ date: d, views: Number(row?.views ?? 0), clicks: Number(row?.clicks ?? 0) });
  }

  return {
    range: { days, from, to },
    totals: totalsFrom(current),
    previous: totalsFrom(previous),
    daily: series,
    listings: listings.map((l) => ({
      id: l.id,
      name: l.name,
      image_url: l.image_url,
      views: Number(l.views),
      whatsapp: Number(l.whatsapp),
      calls: Number(l.calls),
    })),
  };
}

// Whole-market figures for the admin E-Market page: totals (with the
// previous period for comparison) and per-product / per-vendor stats.
export async function getMarketAnalytics(days: AnalyticsRange): Promise<MarketAnalytics> {
  const pool = getPool();
  const to = ymd(new Date());
  const from = addDays(to, -(days - 1));
  const prevFrom = addDays(from, -days);

  const [[current], [previous], [perListing]] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `SELECT event_type, channel, COUNT(*) AS n FROM market_events
       WHERE event_date BETWEEN ? AND ? GROUP BY event_type, channel`,
      [from, to],
    ),
    pool.query<RowDataPacket[]>(
      `SELECT event_type, channel, COUNT(*) AS n FROM market_events
       WHERE event_date >= ? AND event_date < ? GROUP BY event_type, channel`,
      [prevFrom, from],
    ),
    pool.query<RowDataPacket[]>(
      `SELECT product_id, vendor_id,
         SUM(event_type <> 'order_click') AS views,
         SUM(event_type = 'order_click' AND channel = 'whatsapp') AS whatsapp,
         SUM(event_type = 'order_click' AND channel = 'call') AS calls
       FROM market_events WHERE event_date BETWEEN ? AND ?
       GROUP BY product_id, vendor_id`,
      [from, to],
    ),
  ]);

  const products: Record<string, ListingStats> = {};
  const vendors: Record<string, ListingStats> = {};
  for (const r of perListing) {
    const stats = { views: Number(r.views), whatsapp: Number(r.whatsapp), calls: Number(r.calls) };
    if (r.product_id) products[String(r.product_id)] = stats;
    else if (r.vendor_id) vendors[String(r.vendor_id)] = stats;
  }

  return { range: { days, from, to }, totals: totalsFrom(current), previous: totalsFrom(previous), products, vendors };
}
