export type AdminRole = "super_admin" | "admin" | "staff" | "tutor" | "technician" | "stores" | "supervisor" | "editor" | "manager";

export interface AdminRow {
  id: number;
  full_name: string;
  staff_number: string;
  role: AdminRole;
  position: string | null;
  phone_number: string | null;
  photo_url: string | null;
  institutional_email: string;
  password_hash: string;
  failed_login_attempts: number;
  locked_until: string | null;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;
}

export type RoomGenderType = "male" | "female" | "mixed";

export interface RoomRow {
  id: number;
  room_number: string;
  block: string | null;
  floor: string | null;
  capacity: number;
  gender_type: RoomGenderType;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface RoomWithOccupancyRow extends RoomRow {
  occupied: number;
}

export type StudentGender = "male" | "female";
export type StudentLevel = "100" | "200" | "300" | "400" | "500" | "600";
export type IdType = "ghana_card" | "passport";

export interface StudentRow {
  id: number;
  room_id: number;
  gender: StudentGender;
  full_name: string;
  registration_number: string;
  programme: string;
  level: StudentLevel;
  phone_country_code: string;
  phone_number: string;
  passport_photo_url: string;
  emergency_contact_name: string;
  email: string;
  emergency_contact_number: string;
  id_type: IdType;
  id_number: string;
  receipt_url: string;
  pin_hash: string;
  failed_pin_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

export type RepairStatus = "pending" | "approved" | "assigned" | "completed";

export interface RepairRequestRow {
  id: number;
  student_id: number;
  room_id: number;
  category: string | null;
  description: string;
  status: RepairStatus;
  assigned_admin_id: number | null;
  student_remarks: string | null;
  admin_remarks: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = "pending" | "processing" | "completed" | "cancelled";

export interface OrderRow {
  id: number;
  student_id: number;
  service_type: string;
  details: string | null;
  quantity: number;
  status: OrderStatus;
  admin_remarks: string | null;
  created_at: string;
  updated_at: string;
}

export type SuggestionStatus = "new" | "reviewed";

export interface SuggestionRow {
  id: number;
  student_id: number;
  subject: string | null;
  message: string;
  is_anonymous: 0 | 1;
  status: SuggestionStatus;
  created_at: string;
}

export interface PinResetOtpRow {
  id: number;
  student_id: number;
  otp_hash: string;
  expires_at: string;
  attempts: number;
  consumed_at: string | null;
  created_at: string;
}

export interface AdminPasswordResetOtpRow {
  id: number;
  admin_id: number;
  otp_hash: string;
  expires_at: string;
  attempts: number;
  consumed_at: string | null;
  created_at: string;
}

// "page_personnel" is admin-only — never returned to the public Yellow Pages.
export type DirectoryCategory = "personnel" | "business" | "executive" | "page_personnel";

export interface DirectoryEntryRow {
  id: number;
  category: DirectoryCategory;
  name: string;
  title: string;
  subtitle: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  hours: string | null;
  photo_url: string | null;
  map_query: string | null;
  website_url: string | null;
  sort_order: number;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;
}

export type MarketAudience = "all" | "students" | "staff";
export type MarketCondition = "new" | "used";

export interface MarketCategoryRow {
  id: number;
  name: string;
  icon: string;
  description: string | null;
  sort_order: number;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;
}

// price/old_price/rating are DECIMAL columns — the service converts them to
// numbers before they leave the server.
export interface MarketProductRow {
  id: number;
  category_id: number;
  seller_id: number | null;
  name: string;
  description: string | null;
  price: number;
  old_price: number | null;
  image_url: string | null;
  item_condition: MarketCondition;
  audience: MarketAudience;
  rating: number | null;
  seller_name: string;
  seller_phone: string | null;
  seller_location: string | null;
  is_featured: 0 | 1;
  sort_order: number;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface FoodVendorRow {
  id: number;
  seller_id: number | null;
  name: string;
  cuisine: string | null;
  description: string | null;
  logo_url: string | null;
  phone: string | null;
  location: string | null;
  opening_hours: string | null;
  delivers: 0 | 1;
  is_open: 0 | 1;
  sort_order: number;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;
}

// price is a DECIMAL column — the service converts it to a number.
export interface FoodMenuItemRow {
  id: number;
  vendor_id: number;
  section: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: 0 | 1;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type SellerType = "business" | "food_vendor";
export type SellerStatus = "pending" | "approved" | "rejected" | "suspended";
export type SellerPaymentKind = "registration" | "monthly";
export type SellerPaymentMethod = "momo" | "cash" | "bank" | "other";

export interface SellerRow {
  id: number;
  seller_type: SellerType;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  location: string | null;
  description: string | null;
  logo_url: string | null;
  password_hash: string;
  status: SellerStatus;
  status_reason: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  registration_paid_at: string | null;
  paid_until: string | null;
  registration_fee_waived: 0 | 1;
  monthly_fee_waived: 0 | 1;
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

// amount is a DECIMAL column — services convert it to a number.
export interface SellerPaymentRow {
  id: number;
  seller_id: number;
  kind: SellerPaymentKind;
  amount: number;
  months: number | null;
  covers_from: string | null;
  covers_to: string | null;
  method: SellerPaymentMethod;
  reference: string | null;
  note: string | null;
  recorded_by: number | null;
  created_at: string;
}

export type HubPostType = "spotlight" | "announcement" | "news" | "event";

// One table for everything on the KNH Hub page; each type uses a subset of
// the columns (see server/api/modules/hub/schema.ts).
export interface HubPostRow {
  id: number;
  type: HubPostType;
  title: string;
  excerpt: string | null;
  body: string | null;
  category: string | null;
  category_url: string | null;
  link_url: string | null;
  image_url: string | null;
  published_on: string;
  event_start: string | null;
  event_end: string | null;
  event_time: string | null;
  location: string | null;
  is_featured: 0 | 1;
  is_published: 0 | 1;
  sort_order: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export type FreshmenTopicLayout = "text" | "steps" | "cards";

// One entry in a topic's steps timeline or icon-card grid.
export interface FreshmenTopicItem {
  title: string;
  note?: string | null;
  icon?: string | null;
}

export interface FreshmenGuideRow {
  id: number;
  title: string;
  summary: string | null;
  icon: string;
  image_url: string | null;
  sort_order: number;
  is_published: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface FreshmenSectionRow {
  id: number;
  guide_id: number;
  title: string;
  intro: string | null;
  image_url: string | null;
  is_mandatory: 0 | 1;
  sort_order: number;
  is_published: 0 | 1;
  created_at: string;
  updated_at: string;
}

// items is a JSON column; mysql2 parses it into an array.
export interface FreshmenTopicRow {
  id: number;
  section_id: number;
  title: string;
  body: string | null;
  layout: FreshmenTopicLayout;
  items: FreshmenTopicItem[] | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FreshmenFaqRow {
  id: number;
  question: string;
  answer: string;
  sort_order: number;
  is_published: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface InventoryCategoryRow {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItemRow {
  id: number;
  name: string;
  description: string | null;
  category_id: number | null;
  quantity: number;
  min_quantity: number;
  is_active: 0 | 1;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export type InventoryRequestStatus = "pending" | "approved" | "rejected" | "released" | "cancelled";

export interface InventoryRequestRow {
  id: number;
  requested_by: number | null;
  purpose: string;
  status: InventoryRequestStatus;
  decision_note: string | null;
  approved_by: number | null;
  approved_at: string | null;
  rejected_by: number | null;
  rejected_at: string | null;
  released_by: number | null;
  released_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryRequestItemRow {
  id: number;
  request_id: number;
  item_id: number;
  quantity: number;
}

export type InventoryMovementReason = "opening" | "restock" | "adjustment" | "release";

export interface InventoryMovementRow {
  id: number;
  item_id: number;
  quantity_change: number;
  quantity_after: number;
  reason: InventoryMovementReason;
  note: string | null;
  request_id: number | null;
  admin_id: number | null;
  created_at: string;
}
