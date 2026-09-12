import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateGst } from "../../packages/shared/src/gst.js";
import { MemberCreateSchema, indianMobileRegex, gstinRegex } from "../../packages/shared/src/schemas.js";
import { ROLE_PERMISSIONS, hasPermission } from "../../packages/shared/src/permissions.js";

describe("GYMCARE CRM - Multi-Tenant Security & Business Logic Verification", () => {
  // 1. RBAC & TENANT PERMISSION ISOLATION
  it("Receptionist must NOT possess financial refund or platform management privileges", () => {
    const receptionistPerms = ROLE_PERMISSIONS["RECEPTIONIST"];
    assert.equal(hasPermission(receptionistPerms, "payments.refund"), false);
    assert.equal(hasPermission(receptionistPerms, "platform.manage"), false);
    assert.equal(hasPermission(receptionistPerms, "members.delete"), false);
  });

  it("Trainer must only access workouts, diets, measurements and attendance", () => {
    const trainerPerms = ROLE_PERMISSIONS["TRAINER"];
    assert.equal(hasPermission(trainerPerms, "workouts.manage"), true);
    assert.equal(hasPermission(trainerPerms, "diets.manage"), true);
    assert.equal(hasPermission(trainerPerms, "payments.create"), false);
    assert.equal(hasPermission(trainerPerms, "invoices.view"), false);
  });

  it("Gym Owner has full operational authority over tenant", () => {
    const ownerPerms = ROLE_PERMISSIONS["GYM_OWNER"];
    assert.equal(hasPermission(ownerPerms, "members.create"), true);
    assert.equal(hasPermission(ownerPerms, "payments.create"), true);
    assert.equal(hasPermission(ownerPerms, "reports.financial"), true);
    assert.equal(hasPermission(ownerPerms, "platform.manage"), false); // Super admin only
  });

  // 2. INDIAN GST TAX CALCULATOR VALIDATION
  it("Calculates intra-state 18% GST (CGST 9% + SGST 9%) on tax-inclusive ₹2500 gym plan", () => {
    const result = calculateGst({
      amount: 2500,
      taxRate: 18,
      isInclusive: true,
      supplierStateCode: "27", // Maharashtra
      recipientStateCode: "27"  // Maharashtra (Intra-state)
    });

    assert.equal(result.isIntraState, true);
    assert.equal(result.totalAmount, 2500);
    assert.equal(result.taxableAmount, 2118.64);
    assert.equal(result.cgstAmount, 190.68);
    assert.equal(result.sgstAmount, 190.68);
    assert.equal(result.igstAmount, 0);
    assert.equal(result.totalTax, 381.36);
    assert.equal(result.taxableAmount + result.totalTax, 2500);
  });

  it("Calculates inter-state 18% IGST on tax-exclusive ₹10000 corporate package", () => {
    const result = calculateGst({
      amount: 10000,
      taxRate: 18,
      isInclusive: false,
      supplierStateCode: "27", // Maharashtra
      recipientStateCode: "29"  // Karnataka (Inter-state)
    });

    assert.equal(result.isIntraState, false);
    assert.equal(result.taxableAmount, 10000);
    assert.equal(result.igstAmount, 1800);
    assert.equal(result.cgstAmount, 0);
    assert.equal(result.sgstAmount, 0);
    assert.equal(result.totalAmount, 11800);
  });

  // 3. INDIAN VALIDATION SCHEMAS
  it("Validates Indian 10-digit mobile numbers with optional +91 prefix", () => {
    assert.ok(indianMobileRegex.test("9822012345"));
    assert.ok(indianMobileRegex.test("+919822012345"));
    assert.ok(indianMobileRegex.test("919822012345"));
    assert.equal(indianMobileRegex.test("1234567890"), false); // Doesn't start with 6-9
    assert.equal(indianMobileRegex.test("98220"), false); // Too short
  });

  it("Validates Indian 15-character GSTIN format", () => {
    assert.ok(gstinRegex.test("27AAACI1234F1Z5"));
    assert.equal(gstinRegex.test("27AAACI1234F1Z"), false); // Too short
    assert.equal(gstinRegex.test("INVALIDGSTIN123"), false);
  });

  it("Validates Member creation payload and normalizes mobile", () => {
    const parsed = MemberCreateSchema.parse({
      branch_id: "00000000-0000-0000-0000-000000000011",
      first_name: "Vikram",
      last_name: "Deshmukh",
      gender: "MALE",
      mobile: "9822012345",
      city: "Kolhapur"
    });

    assert.equal(parsed.mobile, "+919822012345");
    assert.equal(parsed.first_name, "Vikram");
  });
});
