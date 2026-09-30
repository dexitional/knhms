// Report periods shared by the Inventories reports and the admin Overview:
// the current week/month/quarter/year and a trend over recent periods.
// Dates are compared as "YYYY-MM-DD HH:MM:SS" strings (Ghana is UTC+0 and the
// pool returns dateStrings).

export type ReportPeriod = "week" | "month" | "quarter" | "year";

export const TREND_LENGTH: Record<ReportPeriod, number> = { week: 12, month: 12, quarter: 8, year: 5 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const ymd = (d: Date) => d.toISOString().slice(0, 10);

export function startOf(period: ReportPeriod, date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (period === "week") d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // Monday
  if (period === "month") d.setUTCDate(1);
  if (period === "quarter") d.setUTCMonth(Math.floor(d.getUTCMonth() / 3) * 3, 1);
  if (period === "year") d.setUTCMonth(0, 1);
  return d;
}

export function shift(period: ReportPeriod, date: Date, n: number): Date {
  const d = new Date(date);
  if (period === "week") d.setUTCDate(d.getUTCDate() + 7 * n);
  if (period === "month") d.setUTCMonth(d.getUTCMonth() + n);
  if (period === "quarter") d.setUTCMonth(d.getUTCMonth() + 3 * n);
  if (period === "year") d.setUTCFullYear(d.getUTCFullYear() + n);
  return d;
}

export function bucketLabel(period: ReportPeriod, start: Date): string {
  const month = MONTHS[start.getUTCMonth()]!;
  const year = start.getUTCFullYear();
  if (period === "week") return `${start.getUTCDate()} ${month}`;
  if (period === "month") return `${month} ${String(year).slice(2)}`;
  if (period === "quarter") return `Q${Math.floor(start.getUTCMonth() / 3) + 1} ${year}`;
  return String(year);
}

function rangeLabel(period: ReportPeriod, start: Date): string {
  if (period === "week") return `Week of ${start.getUTCDate()} ${MONTHS[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
  if (period === "month") return `${MONTHS[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
  return bucketLabel(period, start);
}

export function periodRange(period: ReportPeriod, now = new Date()) {
  const from = startOf(period, now);
  const to = shift(period, from, 1);
  return { from: `${ymd(from)} 00:00:00`, to: `${ymd(to)} 00:00:00`, label: rangeLabel(period, from), start: from };
}

export const within = (value: string | null | undefined, from: string, to: string) =>
  !!value && value >= from && value < to;

// The buckets for the trend chart ending with the current period, and the
// first moment they cover.
export function trendBuckets(period: ReportPeriod) {
  const current = periodRange(period);
  const first = shift(period, current.start, -(TREND_LENGTH[period] - 1));
  const buckets = Array.from({ length: TREND_LENGTH[period] }, (_, i) => {
    const start = shift(period, first, i);
    return {
      label: bucketLabel(period, start),
      from: `${ymd(start)} 00:00:00`,
      to: `${ymd(shift(period, start, 1))} 00:00:00`,
    };
  });
  return { current, trendFrom: `${ymd(first)} 00:00:00`, buckets };
}
