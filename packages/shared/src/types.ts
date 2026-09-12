import { UserRole, MemberStatus, MembershipStatus, AttendanceMethod, PaymentMethod, PaymentStatus, LeadStatus } from "./constants.js";
import { Permission } from "./permissions.js";

export interface Lead {
  id: string;
  organization_id: string;
  branch_id: string;
  name: string;
  mobile: string;
  email?: string;
  source?: string;
  interested_plan_id?: string;
  assigned_staff_id?: string;
  status: LeadStatus;
  expected_joining_date?: string;
  notes?: string;
  converted_member_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  legal_name?: string;
  gstin?: string;
  pan?: string;
  logo_url?: string;
  phone: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  phone?: string;
  email?: string;
  address?: string;
  city: string;
  state: string;
  pincode?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string; // matches auth.users id
  organization_id: string;
  branch_id?: string;
  email: string;
  first_name: string;
  last_name: string;
  mobile: string;
  photo_url?: string;
  role: UserRole;
  permissions: Permission[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  organization_id: string;
  branch_id: string;
  member_id: string; // e.g. MEM-0001
  first_name: string;
  last_name: string;
  photo_url?: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  dob?: string;
  mobile: string; // +919876543210
  email?: string;
  address?: string;
  city?: string;
  pincode?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  joining_date: string;
  source?: string;
  assigned_trainer_id?: string;
  notes?: string;
  status: MemberStatus;
  qr_token: string;
  version: number;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  // Computed / joined fields
  active_membership?: Membership;
  assigned_trainer_name?: string;
  branch_name?: string;
}

export interface MembershipPlan {
  id: string;
  organization_id: string;
  branch_id?: string;
  name: string;
  duration_days: number;
  price: number;
  tax_rate: number; // e.g. 18 for 18% GST
  is_tax_inclusive: boolean;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  organization_id: string;
  branch_id: string;
  member_id: string;
  plan_id: string;
  plan_name: string;
  start_date: string;
  end_date: string;
  base_price: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  status: MembershipStatus;
  frozen_days_used: number;
  invoice_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  organization_id: string;
  branch_id: string;
  member_id: string;
  member_name: string;
  member_code: string;
  check_in: string; // ISO with timezone
  check_out?: string;
  date: string; // YYYY-MM-DD in Asia/Kolkata
  method: AttendanceMethod;
  device_id?: string;
  marked_by?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  organization_id: string;
  branch_id: string;
  invoice_number: string; // e.g. INV-2026-0001
  member_id: string;
  subtotal: number;
  discount: number;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_tax: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: "DRAFT" | "ISSUED" | "PAID" | "PARTIALLY_PAID" | "CANCELLED";
  issue_date: string;
  due_date: string;
  items?: InvoiceItem[];
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  hsn_sac?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  taxable_amount: number;
  tax_rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_amount: number;
}

export interface Payment {
  id: string;
  organization_id: string;
  branch_id: string;
  receipt_number: string;
  invoice_id: string;
  member_id: string;
  amount: number;
  payment_method: PaymentMethod;
  transaction_id?: string;
  notes?: string;
  status: PaymentStatus;
  collected_by: string;
  payment_date: string;
  created_at: string;
}

export interface DashboardMetrics {
  total_members: number;
  active_members: number;
  new_members_this_month: number;
  expired_members: number;
  today_attendance: number;
  today_collection: number;
  monthly_revenue: number;
  pending_payments: number;
  expiring_in_7_days: number;
  active_trainers: number;
  charts: {
    revenue_trend: { date: string; amount: number }[];
    attendance_trend: { date: string; count: number }[];
    membership_distribution: { name: string; value: number }[];
  };
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    request_id?: string;
  };
}
