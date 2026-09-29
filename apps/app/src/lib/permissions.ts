import type { AdminRole } from "@knh/db";

// The admin role matrix — the single source of truth for who can see and
// change each part of the admin system. The API guards
// (requirePermission in server/api/middleware/require-auth.ts), the sidebar,
// the page guards and the edit controls all read from here.
//
//   "view"   — can open the pages and read the records
//   "manage" — can also create, edit and delete
//
// Roles without an entry for a module can't reach it at all.

export type AdminModule =
  | "overview"
  | "reports"
  | "rooms"
  | "students"
  | "repairs"
  | "orders"
  | "suggestions"
  | "hub"
  | "freshmen"
  | "yellowPages"
  | "market"
  | "sellers"
  | "inventory"
  | "users";

export type Access = "view" | "manage";

const ALL_MODULES: Array<AdminModule> = [
  "overview",
  "reports",
  "rooms",
  "students",
  "repairs",
  "orders",
  "suggestions",
  "hub",
  "freshmen",
  "yellowPages",
  "market",
  "sellers",
  "inventory",
  "users",
];

const PERMISSIONS: Record<AdminRole, Partial<Record<AdminModule, Access>>> = {
  super_admin: Object.fromEntries(ALL_MODULES.map((m) => [m, "manage"])),
  admin: {
    overview: "view",
    reports: "view",
    students: "manage",
    repairs: "manage",
    suggestions: "view",
    hub: "manage",
    freshmen: "manage",
    yellowPages: "view",
    inventory: "view", // plus raising their own stock requests (see below)
  },
  supervisor: {
    overview: "view",
    reports: "view",
    repairs: "view",
    rooms: "view",
    students: "view",
    hub: "manage",
    freshmen: "manage",
  },
  editor: {
    hub: "manage",
    yellowPages: "manage",
  },
  manager: {
    hub: "manage",
    market: "manage",
    sellers: "manage",
    yellowPages: "manage",
  },
  stores: {
    inventory: "view", // plus releasing approved requests (see below)
  },
  technician: {
    repairs: "view", // only requests assigned to them
  },
  // Access for these roles is still to be decided; they can sign in and
  // manage their own account only.
  staff: {},
  tutor: {},
};

export function accessTo(role: AdminRole, module: AdminModule): Access | null {
  return PERMISSIONS[role][module] ?? null;
}

export const canView = (role: AdminRole, module: AdminModule) => accessTo(role, module) !== null;
export const canManage = (role: AdminRole, module: AdminModule) => accessTo(role, module) === "manage";

// Every role with at least the given access to a module (for API guards).
export function rolesWith(module: AdminModule, level: Access): Array<AdminRole> {
  return (Object.keys(PERMISSIONS) as Array<AdminRole>).filter((role) =>
    level === "view" ? canView(role, module) : canManage(role, module),
  );
}

// ---- Inventory actions beyond view/manage --------------------------------------

// Raise stock requests (and cancel their own while pending).
export const STOCK_REQUESTERS: Array<AdminRole> = ["super_admin", "admin"];
// Approve or reject pending requests.
export const STOCK_APPROVERS: Array<AdminRole> = ["super_admin"];
// Mark approved requests as released.
export const STOCK_RELEASERS: Array<AdminRole> = ["super_admin", "stores"];

// ---- Students -------------------------------------------------------------------------

// Editing a student's record is narrower than managing students: admins can
// open the Manage view and reset PINs, but only these roles can edit.
export const STUDENT_EDITORS: Array<AdminRole> = ["super_admin"];

// ---- Repairs -----------------------------------------------------------------------

// Technicians only see repair requests assigned to them.
export const seesOnlyAssignedRepairs = (role: AdminRole) => role === "technician";

// ---- Landing page -----------------------------------------------------------------

// Where each module lives, in sidebar order. The first one a role can view
// is where they land after signing in.
export const MODULE_PATHS: Array<[AdminModule, string]> = [
  ["overview", "/admin"],
  ["reports", "/admin/reports"],
  ["rooms", "/admin/rooms"],
  ["students", "/admin/students"],
  ["repairs", "/admin/repairs"],
  ["orders", "/admin/orders"],
  ["suggestions", "/admin/suggestions"],
  ["hub", "/admin/hub"],
  ["freshmen", "/admin/freshmen"],
  ["yellowPages", "/admin/yellow-pages"],
  ["market", "/admin/e-market"],
  ["sellers", "/admin/sellers"],
  ["inventory", "/admin/inventory"],
  ["users", "/admin/staff"],
];

export function homePathFor(role: AdminRole): string {
  return MODULE_PATHS.find(([module]) => canView(role, module))?.[1] ?? "/admin/account";
}
