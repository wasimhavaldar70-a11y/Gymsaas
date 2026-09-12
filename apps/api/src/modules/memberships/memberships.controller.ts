import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { MembershipAssignSchema, MembershipPlanCreateSchema, calculateGst } from "@gymcare/shared";
import { ValidationError, NotFoundError } from "../../lib/errors.js";

export async function membershipRoutes(app: FastifyInstance) {
  // List membership plans
  app.get("/plans", { preHandler: [authenticate] }, async (request) => {
    const tenant = request.tenant!;

    const { data, error } = await supabaseAdmin
      .from("membership_plans")
      .select("*")
      .eq("organization_id", tenant.organizationId)
      .eq("is_active", true)
      .order("duration_days", { ascending: true });

    if (error) throw error;

    return {
      success: true,
      data: data || []
    };
  });

  // Create membership plan
  app.post("/plans", { preHandler: [authenticate, requirePermission("plans.manage")] }, async (request, reply) => {
    const tenant = request.tenant!;
    const parseResult = MembershipPlanCreateSchema.safeParse(request.body);

    if (!parseResult.success) {
      throw new ValidationError("Invalid plan data", parseResult.error.format());
    }

    const { data, error } = await supabaseAdmin
      .from("membership_plans")
      .insert({
        organization_id: tenant.organizationId,
        ...parseResult.data
      })
      .select()
      .single();

    if (error) throw error;

    return reply.status(201).send({
      success: true,
      data
    });
  });

  // Assign or Renew membership with GST invoice generation
  app.post("/assign", { preHandler: [authenticate, requirePermission("memberships.create")] }, async (request, reply) => {
    const tenant = request.tenant!;
    const parseResult = MembershipAssignSchema.safeParse(request.body);

    if (!parseResult.success) {
      throw new ValidationError("Invalid membership assignment data", parseResult.error.format());
    }

    const { member_id, branch_id, plan_id, start_date, discount_amount, payment_method, amount_paid, transaction_id, notes } = parseResult.data;

    // 1. Fetch Plan and Member
    const [planRes, memberRes, orgRes] = await Promise.all([
      supabaseAdmin.from("membership_plans").select("*").eq("id", plan_id).eq("organization_id", tenant.organizationId).single(),
      supabaseAdmin.from("members").select("*").eq("id", member_id).eq("organization_id", tenant.organizationId).single(),
      supabaseAdmin.from("organizations").select("state_code, invoice_prefix").eq("id", tenant.organizationId).single()
    ]);

    if (!planRes.data) throw new NotFoundError("Membership Plan", plan_id);
    if (!memberRes.data) throw new NotFoundError("Member", member_id);

    const plan = planRes.data;
    const org = orgRes.data || { state_code: "27", invoice_prefix: "INV" };

    // 2. Calculate End Date
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(endDateObj.getDate() + plan.duration_days);
    const endDateStr = endDateObj.toISOString().split("T")[0];

    // 3. Calculate GST Tax breakdown (default intra-state Maharashtra '27')
    const finalPrice = Math.max(0, plan.price - discount_amount);
    const gstCalc = calculateGst({
      amount: finalPrice,
      taxRate: plan.tax_rate,
      isInclusive: plan.is_tax_inclusive,
      supplierStateCode: org.state_code || "27",
      recipientStateCode: org.state_code || "27"
    });

    // 4. Generate sequential Invoice Number (e.g. INV-2026-0001)
    const year = new Date().getFullYear();
    const { count: invoiceCount } = await supabaseAdmin
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", tenant.organizationId);

    const invSeq = ((invoiceCount || 0) + 1).toString().padStart(4, "0");
    const invoiceNumber = `${org.invoice_prefix || "INV"}-${year}-${invSeq}`;

    // 5. Create Invoice
    const invoiceStatus = amount_paid >= gstCalc.totalAmount ? "PAID" : amount_paid > 0 ? "PARTIALLY_PAID" : "ISSUED";
    const balanceDue = Math.max(0, gstCalc.totalAmount - amount_paid);

    const { data: invoice, error: invError } = await supabaseAdmin
      .from("invoices")
      .insert({
        organization_id: tenant.organizationId,
        branch_id,
        invoice_number: invoiceNumber,
        member_id,
        subtotal: plan.price,
        discount: discount_amount,
        taxable_amount: gstCalc.taxableAmount,
        cgst: gstCalc.cgstAmount,
        sgst: gstCalc.sgstAmount,
        igst: gstCalc.igstAmount,
        total_tax: gstCalc.totalTax,
        total_amount: gstCalc.totalAmount,
        amount_paid,
        balance_due: balanceDue,
        status: invoiceStatus,
        issue_date: start_date,
        due_date: start_date,
        notes: notes || `Membership: ${plan.name}`,
        created_by: tenant.userId
      })
      .select()
      .single();

    if (invError) throw invError;

    // 6. Create Invoice Item
    await supabaseAdmin.from("invoice_items").insert({
      invoice_id: invoice.id,
      description: `${plan.name} (${plan.duration_days} Days)`,
      hsn_sac: "999723", // Gymnasium Services
      quantity: 1,
      unit_price: plan.price,
      discount: discount_amount,
      taxable_amount: gstCalc.taxableAmount,
      tax_rate: plan.tax_rate,
      cgst: gstCalc.cgstAmount,
      sgst: gstCalc.sgstAmount,
      igst: gstCalc.igstAmount,
      total_amount: gstCalc.totalAmount
    });

    // 7. Create Membership Record
    const { data: newMembership, error: membError } = await supabaseAdmin
      .from("memberships")
      .insert({
        organization_id: tenant.organizationId,
        branch_id,
        member_id,
        plan_id: plan.id,
        plan_name: plan.name,
        start_date,
        end_date: endDateStr,
        base_price: gstCalc.taxableAmount,
        discount_amount,
        tax_amount: gstCalc.totalTax,
        total_amount: gstCalc.totalAmount,
        status: "ACTIVE"
      })
      .select()
      .single();

    if (membError) throw membError;

    // 8. If amount was paid, create payment record
    let paymentRecord = null;
    if (amount_paid > 0) {
      const { count: payCount } = await supabaseAdmin
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", tenant.organizationId);

      const paySeq = ((payCount || 0) + 1).toString().padStart(4, "0");
      const receiptNumber = `RCP-${year}-${paySeq}`;

      const { data: payData, error: payError } = await supabaseAdmin
        .from("payments")
        .insert({
          organization_id: tenant.organizationId,
          branch_id,
          receipt_number: receiptNumber,
          invoice_id: invoice.id,
          member_id,
          amount: amount_paid,
          payment_method,
          transaction_id,
          notes,
          status: "PAID",
          collected_by: tenant.userId
        })
        .select()
        .single();

      if (payError) throw payError;
      paymentRecord = payData;
    }

    // 9. Update Member status to ACTIVE
    await supabaseAdmin
      .from("members")
      .update({ status: "ACTIVE" })
      .eq("id", member_id)
      .eq("organization_id", tenant.organizationId);

    return reply.status(201).send({
      success: true,
      data: {
        membership: newMembership,
        invoice,
        payment: paymentRecord
      }
    });
  });
}
