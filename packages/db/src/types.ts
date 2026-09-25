export type AdminRole = "super_admin" | "admin" | "staff";

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
