import { z } from "zod";
import {
  MEMBER_STATUSES,
  ATTENDANCE_METHODS,
  PAYMENT_METHODS
} from "./constants.js";

// Indian Mobile regex: allows 10 digits starting with 6, 7, 8, or 9, optional +91 or 91 prefix
export const indianMobileRegex = /^(?:(?:\+|0{0,2})91[\s-]?)?[6-9]\d{9}$/;

// Indian GSTIN regex: 15 alphanumeric characters
export const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Indian PAN regex: 10 alphanumeric characters
export const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export const IndianMobileSchema = z
  .string()
  .trim()
  .regex(indianMobileRegex, "Invalid Indian mobile number (e.g. 9876543210 or +919876543210)")
  .transform((val) => {
    const cleaned = val.replace(/[\s-]/g, "");
    if (cleaned.startsWith("+91")) return cleaned;
    if (cleaned.startsWith("91") && cleaned.length === 12) return `+${cleaned}`;
    return `+91${cleaned}`;
  });

export const OptionalGstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(gstinRegex, "Invalid Indian GSTIN format (15 alphanumeric characters)")
  .optional()
  .or(z.literal(""));

export const MemberCreateSchema = z.object({
  branch_id: z.string().uuid("Invalid branch ID"),
  first_name: z.string().min(2, "First name must be at least 2 characters").max(50),
  last_name: z.string().min(1, "Last name is required").max(50),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dob: z.string().date("Invalid date of birth").optional(),
  mobile: IndianMobileSchema,
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  pincode: z.string().regex(/^\d{6}$/, "Invalid 6-digit Indian PIN code").optional().or(z.literal("")),
  emergency_contact_name: z.string().max(100).optional(),
  emergency_contact_phone: z.string().optional(),
  joining_date: z.string().default(() => new Date().toISOString().split("T")[0]),
  source: z.string().max(50).optional(),
  assigned_trainer_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(1000).optional()
});

export const MemberUpdateSchema = MemberCreateSchema.partial().extend({
  status: z.enum(MEMBER_STATUSES).optional(),
  version: z.number().int().positive("Version is required for concurrency check")
});

export const MembershipPlanCreateSchema = z.object({
  branch_id: z.string().uuid().optional().nullable(),
  name: z.string().min(2).max(100),
  duration_days: z.number().int().positive("Duration must be at least 1 day"),
  price: z.number().nonnegative("Price cannot be negative"),
  tax_rate: z.number().nonnegative().default(18), // 18% GST default for gym services
  is_tax_inclusive: z.boolean().default(true),
  description: z.string().max(500).optional()
});

export const MembershipAssignSchema = z.object({
  member_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  start_date: z.string(),
  discount_amount: z.number().nonnegative().default(0),
  payment_method: z.enum(PAYMENT_METHODS).default("CASH"),
  amount_paid: z.number().nonnegative(),
  transaction_id: z.string().optional(),
  notes: z.string().optional()
});

export const AttendanceMarkSchema = z.object({
  branch_id: z.string().uuid("Invalid branch ID"),
  member_identifier: z.string().min(1, "Member ID, QR code, or Mobile is required"),
  method: z.enum(ATTENDANCE_METHODS).default("SEARCH"),
  device_id: z.string().optional(),
  idempotency_key: z.string().optional()
});

export const PaymentCollectSchema = z.object({
  branch_id: z.string().uuid(),
  invoice_id: z.string().uuid(),
  member_id: z.string().uuid(),
  amount: z.number().positive("Payment amount must be greater than zero"),
  payment_method: z.enum(PAYMENT_METHODS),
  transaction_id: z.string().optional(),
  notes: z.string().optional(),
  idempotency_key: z.string().optional()
});

export const LeadCreateSchema = z.object({
  branch_id: z.string().uuid(),
  name: z.string().min(2).max(100),
  mobile: IndianMobileSchema,
  email: z.string().email().optional().or(z.literal("")),
  source: z.string().max(50).optional(),
  interested_plan_id: z.string().uuid().optional().nullable(),
  assigned_staff_id: z.string().uuid().optional().nullable(),
  expected_joining_date: z.string().optional(),
  notes: z.string().optional()
});

export const OrganizationSetupSchema = z.object({
  name: z.string().min(2).max(100),
  legal_name: z.string().max(150).optional(),
  gstin: OptionalGstinSchema,
  pan: z.string().regex(panRegex).optional().or(z.literal("")),
  phone: IndianMobileSchema,
  email: z.string().email(),
  address: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/).optional()
});

export const BranchCreateSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(10).toUpperCase(),
  phone: IndianMobileSchema.optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/).optional()
});
