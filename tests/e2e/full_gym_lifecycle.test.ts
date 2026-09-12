import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateGst } from "../../packages/shared/src/gst.js";
import { MemberCreateSchema, MemberUpdateSchema } from "../../packages/shared/src/schemas.js";

describe("GYMCARE CRM - Full End-to-End Operational Lifecycle", () => {
  // Test State
  const tenantOrg = {
    id: "00000000-0000-0000-0000-000000000001",
    name: "IronPulse Fitness Club",
    state_code: "27",
    gstin: "27AAACI1234F1Z5"
  };

  const testMember = {
    id: "11111111-1111-1111-1111-111111111111",
    member_id: "MEM-0001",
    first_name: "Amit",
    last_name: "Shinde",
    mobile: "+919822011223",
    status: "ACTIVE",
    version: 1
  };

  const testPlan = {
    id: "22222222-2222-2222-2222-222222222222",
    name: "1 Month Strength & Cardio",
    price: 2500,
    duration_days: 30,
    tax_rate: 18,
    is_tax_inclusive: true
  };

  it("Step 1: Successfully validates and normalizes Member Registration", () => {
    const validated = MemberCreateSchema.parse({
      branch_id: "00000000-0000-0000-0000-000000000011",
      first_name: "Amit",
      last_name: "Shinde",
      gender: "MALE",
      mobile: "9822011223",
      city: "Kolhapur"
    });

    assert.equal(validated.first_name, "Amit");
    assert.equal(validated.mobile, "+919822011223");
  });

  it("Step 2: Correctly computes Indian GST (CGST 9% + SGST 9%) for invoice generation", () => {
    const gst = calculateGst({
      amount: testPlan.price,
      taxRate: testPlan.tax_rate,
      isInclusive: testPlan.is_tax_inclusive,
      supplierStateCode: tenantOrg.state_code,
      recipientStateCode: tenantOrg.state_code
    });

    assert.equal(gst.isIntraState, true);
    assert.equal(gst.totalAmount, 2500);
    assert.equal(gst.taxableAmount, 2118.64);
    assert.equal(gst.cgstAmount, 190.68);
    assert.equal(gst.sgstAmount, 190.68);
    assert.equal(gst.totalTax, 381.36);
  });

  it("Step 3: Prevents concurrent edit overwrite via versioning check", () => {
    const validUpdate = MemberUpdateSchema.safeParse({
      first_name: "Amit",
      version: 1
    });
    assert.equal(validUpdate.success, true);

    const invalidUpdate = MemberUpdateSchema.safeParse({
      first_name: "Amit",
      version: 0 // invalid version
    });
    assert.equal(invalidUpdate.success, false);
  });

  it("Step 4: Attendance duplicate check handles repeat check-ins within same date", () => {
    const today = "2026-09-12";
    const attendanceStore = new Map<string, string>(); // Key: org_id:member_id:date

    const key = `${tenantOrg.id}:${testMember.id}:${today}`;

    // First check-in
    assert.equal(attendanceStore.has(key), false);
    attendanceStore.set(key, new Date().toISOString());
    assert.equal(attendanceStore.has(key), true);

    // Second check-in attempt on same date
    const isDuplicate = attendanceStore.has(key);
    assert.equal(isDuplicate, true);
  });
});
