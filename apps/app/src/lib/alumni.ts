// Client-safe shapes and labels for the Alumni network: the public page
// (routes/_web/alumni.tsx), the admin area (routes/admin/_admin/alumni) and
// the API (server/api/modules/alumni).

export type ProjectStatus = "planned" | "ongoing" | "completed";
export type DonationStatus = "pledged" | "confirmed" | "declined";
export type DonationMethod = "momo" | "bank" | "card" | "cash" | "other";
export type ChannelType = "momo" | "bank" | "card" | "other";
export type MembershipStatus = "new" | "contacted" | "archived";

export interface AlumniProject {
  id: number;
  title: string;
  summary: string | null;
  category: string | null;
  status: ProjectStatus;
  goal_amount: number | null;
  raised_amount: number; // sum of confirmed donations to the project
  donor_count: number;
  image_url: string | null;
  led_by: string | null;
  year_label: string | null;
  sort_order: number;
  is_published: 0 | 1;
}

export interface AlumniExecutive {
  id: number;
  name: string;
  position: string;
  class_year: string | null;
  bio: string | null;
  photo_url: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  sort_order: number;
  is_active: 0 | 1;
}

export interface AlumniDonation {
  id: number;
  donor_name: string;
  email: string | null;
  phone: string | null;
  amount: number;
  project_id: number | null;
  project_title: string | null;
  method: DonationMethod;
  reference: string | null;
  message: string | null;
  is_anonymous: 0 | 1;
  status: DonationStatus;
  donated_on: string;
  confirmed_by_name?: string | null;
  confirmed_at: string | null;
  created_at: string;
}

// What the public page shows for a confirmed donation.
export interface PublicDonation {
  id: number;
  donor: string; // "Anonymous" when the donor asked
  amount: number;
  project_title: string | null;
  message: string | null;
  donated_on: string;
}

export interface GalleryImage {
  id: number;
  image_url: string;
  caption: string | null;
  album: string | null;
  taken_on: string | null;
  sort_order: number;
  is_published: 0 | 1;
}

export interface DonationChannel {
  id: number;
  type: ChannelType;
  label: string;
  account_name: string | null;
  account_number: string | null;
  provider: string | null;
  branch: string | null;
  link_url: string | null;
  instructions: string | null;
  sort_order: number;
  is_active: 0 | 1;
}

export interface MembershipApplication {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  class_year: string;
  programme: string | null;
  occupation: string | null;
  employer: string | null;
  location: string | null;
  linkedin_url: string | null;
  interests: Array<string>;
  wants_updates: 0 | 1;
  status: MembershipStatus;
  notes: string | null;
  created_at: string;
  // Their automatic Alumni directory profile (Yellow Pages), if it still exists.
  directory_entry_id: number | null;
  show_phone: 0 | 1 | null;
  listed: 0 | 1 | null;
}

export interface AlumniPublicContent {
  projects: Array<AlumniProject>;
  executives: Array<AlumniExecutive>;
  donations: Array<PublicDonation>;
  donationTotals: { amount: number; donors: number; count: number; projectsFunded: number };
  gallery: Array<GalleryImage>;
  channels: Array<DonationChannel>;
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: "Planned",
  ongoing: "Ongoing",
  completed: "Completed",
};

export const DONATION_STATUS_LABELS: Record<DonationStatus, string> = {
  pledged: "Pledged",
  confirmed: "Confirmed",
  declined: "Declined",
};

export const DONATION_METHOD_LABELS: Record<DonationMethod, string> = {
  momo: "Mobile Money",
  bank: "Bank transfer",
  card: "Card / online",
  cash: "Cash",
  other: "Other",
};

export const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  momo: "Mobile Money",
  bank: "Bank account",
  card: "Card / online",
  other: "Other",
};

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  new: "New",
  contacted: "Contacted",
  archived: "Archived",
};

// Ways a member can get involved (stored as keys, shown with labels).
export const MEMBERSHIP_INTERESTS: Array<{ key: string; label: string; hint: string }> = [
  { key: "mentoring", label: "Mentoring", hint: "Guide current residents" },
  { key: "donating", label: "Giving", hint: "Support hall projects" },
  { key: "volunteering", label: "Volunteering", hint: "Events and outreach" },
  { key: "networking", label: "Networking", hint: "Meet fellow alumni" },
  { key: "careers", label: "Careers", hint: "Share jobs and internships" },
  { key: "speaking", label: "Speaking", hint: "Talks and panels" },
];

export const formatCedis = (amount: number) =>
  `GH₵ ${amount.toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

// KNH Hub posts with this category belong to the Alumni page rather than the
// KNH Hub (announcements and events; matched case-insensitively).
export const ALUMNI_HUB_CATEGORY = "Alumni";
export const isAlumniHubPost = (category: string | null | undefined) =>
  (category ?? "").trim().toLowerCase() === ALUMNI_HUB_CATEGORY.toLowerCase();
