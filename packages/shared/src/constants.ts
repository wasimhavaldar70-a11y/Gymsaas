export const APP_NAME = "GYMCARE CRM";
export const DEFAULT_TIMEZONE = "Asia/Kolkata";
export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_CURRENCY_SYMBOL = "₹";
export const DEFAULT_COUNTRY_CODE = "+91";

export const USER_ROLES = [
  "SUPER_ADMIN",
  "GYM_OWNER",
  "GYM_MANAGER",
  "BRANCH_MANAGER",
  "RECEPTIONIST",
  "TRAINER",
  "ACCOUNTANT",
  "STAFF"
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ORGANIZATION_STATUSES = [
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "EXPIRED",
  "SUSPENDED",
  "CANCELLED"
] as const;
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export const MEMBER_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "EXPIRED",
  "FREEZED",
  "CANCELLED",
  "LEAD"
] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const MEMBERSHIP_STATUSES = [
  "ACTIVE",
  "EXPIRING_SOON",
  "EXPIRED",
  "FROZEN",
  "CANCELLED",
  "PENDING"
] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const ATTENDANCE_METHODS = [
  "QR",
  "MANUAL",
  "SEARCH",
  "BIOMETRIC"
] as const;
export type AttendanceMethod = (typeof ATTENDANCE_METHODS)[number];

export const PAYMENT_METHODS = [
  "CASH",
  "UPI",
  "CARD",
  "BANK_TRANSFER",
  "CHEQUE",
  "RAZORPAY"
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const WHATSAPP_MESSAGE_STATUSES = [
  "QUEUED",
  "SENDING",
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED"
] as const;
export type WhatsAppMessageStatus = (typeof WHATSAPP_MESSAGE_STATUSES)[number];

export const WHATSAPP_EVENT_TYPES = [
  "PAYMENT_RECEIPT",
  "PAYMENT_DUE",
  "EXPIRY_REMINDER",
  "EXPIRY_REMINDER_30",
  "EXPIRY_REMINDER_15",
  "EXPIRY_REMINDER_7",
  "EXPIRY_REMINDER_3",
  "EXPIRY_REMINDER_1",
  "EXPIRY_DAY",
  "BIRTHDAY",
  "WELCOME",
  "CUSTOM"
] as const;
export type WhatsAppEventType = (typeof WHATSAPP_EVENT_TYPES)[number];

export const PAYMENT_STATUSES = [
  "PENDING",
  "PAID",
  "PARTIAL",
  "FAILED",
  "REFUNDED",
  "CANCELLED"
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "FOLLOW_UP",
  "TRIAL",
  "CONVERTED",
  "LOST"
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const STANDARD_GST_RATES = [0, 5, 12, 18, 28] as const;

export const INDIAN_STATES = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" }
] as const;
