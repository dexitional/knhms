// Shapes for the admin Overview (GET /api/reports/overview), shared by the
// page and the API.

export type OverviewPeriod = "week" | "month" | "quarter" | "year";

export interface OverviewBucket {
  label: string;
  registrations: number;
  repairs: number;
  orders: number;
  suggestions: number;
}

export interface AdminOverview {
  period: OverviewPeriod;
  range: { from: string; to: string; label: string };
  // All-time / right-now figures.
  totalStudents: number;
  totalRooms: number;
  totalCapacity: number;
  occupied: number;
  occupancyRate: number;
  bedsFree: number;
  fullRooms: number;
  pendingRepairs: number;
  pendingOrders: number;
  newSuggestions: number;
  repairStatusCounts: Array<{ status: string; count: number }>;
  blocks: Array<{ block: string; capacity: number; occupied: number }>;
  // Activity in the chosen period.
  inPeriod: { registrations: number; repairs: number; orders: number; suggestions: number };
  trend: Array<OverviewBucket>;
}
