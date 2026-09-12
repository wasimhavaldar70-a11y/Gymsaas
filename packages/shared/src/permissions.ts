import { UserRole } from "./constants.js";

export const PERMISSIONS = [
  // Members
  "members.view",
  "members.create",
  "members.update",
  "members.delete",
  "members.export",
  "members.import",

  // Memberships & Plans
  "memberships.view",
  "memberships.create",
  "memberships.update",
  "memberships.cancel",
  "memberships.freeze",
  "plans.manage",

  // Attendance
  "attendance.view",
  "attendance.mark",
  "attendance.modify",

  // Payments & Financials
  "payments.view",
  "payments.create",
  "payments.refund",
  "invoices.view",
  "invoices.create",
  "expenses.view",
  "expenses.manage",

  // Trainers & Workouts
  "trainers.view",
  "trainers.manage",
  "workouts.view",
  "workouts.manage",
  "diets.view",
  "diets.manage",
  "measurements.manage",

  // Leads & CRM
  "leads.view",
  "leads.manage",
  "trials.manage",

  // Reports
  "reports.view",
  "reports.financial",
  "reports.export",

  // Branch & Organization Administration
  "branches.view",
  "branches.manage",
  "users.view",
  "users.manage",
  "settings.manage",
  "audit.view",

  // Platform (Super Admin)
  "platform.manage"
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [...PERMISSIONS],

  GYM_OWNER: [
    "members.view",
    "members.create",
    "members.update",
    "members.delete",
    "members.export",
    "members.import",
    "memberships.view",
    "memberships.create",
    "memberships.update",
    "memberships.cancel",
    "memberships.freeze",
    "plans.manage",
    "attendance.view",
    "attendance.mark",
    "attendance.modify",
    "payments.view",
    "payments.create",
    "payments.refund",
    "invoices.view",
    "invoices.create",
    "expenses.view",
    "expenses.manage",
    "trainers.view",
    "trainers.manage",
    "workouts.view",
    "workouts.manage",
    "diets.view",
    "diets.manage",
    "measurements.manage",
    "leads.view",
    "leads.manage",
    "trials.manage",
    "reports.view",
    "reports.financial",
    "reports.export",
    "branches.view",
    "branches.manage",
    "users.view",
    "users.manage",
    "settings.manage",
    "audit.view"
  ],

  BRANCH_MANAGER: [
    "members.view",
    "members.create",
    "members.update",
    "members.export",
    "memberships.view",
    "memberships.create",
    "memberships.update",
    "memberships.freeze",
    "plans.manage",
    "attendance.view",
    "attendance.mark",
    "attendance.modify",
    "payments.view",
    "payments.create",
    "invoices.view",
    "invoices.create",
    "expenses.view",
    "expenses.manage",
    "trainers.view",
    "trainers.manage",
    "workouts.view",
    "workouts.manage",
    "diets.view",
    "diets.manage",
    "measurements.manage",
    "leads.view",
    "leads.manage",
    "trials.manage",
    "reports.view",
    "branches.view",
    "users.view"
  ],

  RECEPTIONIST: [
    "members.view",
    "members.create",
    "members.update",
    "memberships.view",
    "memberships.create",
    "memberships.freeze",
    "attendance.view",
    "attendance.mark",
    "payments.view",
    "payments.create",
    "invoices.view",
    "invoices.create",
    "leads.view",
    "leads.manage",
    "trials.manage",
    "trainers.view"
  ],

  TRAINER: [
    "members.view",
    "attendance.view",
    "attendance.mark",
    "workouts.view",
    "workouts.manage",
    "diets.view",
    "diets.manage",
    "measurements.manage"
  ],

  ACCOUNTANT: [
    "members.view",
    "memberships.view",
    "payments.view",
    "payments.create",
    "payments.refund",
    "invoices.view",
    "invoices.create",
    "expenses.view",
    "expenses.manage",
    "reports.view",
    "reports.financial",
    "reports.export"
  ],

  STAFF: [
    "members.view",
    "attendance.view",
    "attendance.mark"
  ]
};

export function hasPermission(userPermissions: Permission[], requiredPermission: Permission): boolean {
  return userPermissions.includes(requiredPermission) || userPermissions.includes("platform.manage");
}
