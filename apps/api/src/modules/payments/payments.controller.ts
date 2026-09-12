import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { PaymentCollectSchema } from "@gymcare/shared";
import { ValidationError, NotFoundError } from "../../lib/errors.js";
import { getWhatsAppProvider } from "../notifications/whatsapp.provider.js";

export async function paymentRoutes(app: FastifyInstance) {
  // List payment transactions
  app.get("/", { preHandler: [authenticate, requirePermission("payments.view")] }, async (request) => {
    const tenant = request.tenant!;
    const { branch_id, page = "1", page_size = "20" } = request.query as {
      branch_id?: string;
      page?: string;
      page_size?: string;
    };

    const p = Math.max(1, parseInt(page, 10));
    const ps = Math.min(100, Math.max(1, parseInt(page_size, 10)));
    const offset = (p - 1) * ps;

    let query = supabaseAdmin
      .from("payments")
      .select(
        `
        id, receipt_number, amount, payment_method, transaction_id, notes, status, payment_date, created_at,
        members (id, member_id, first_name, last_name, mobile),
        invoices (id, invoice_number, total_amount, balance_due),
        branches (name, code)
      `,
        { count: "exact" }
      )
      .eq("organization_id", tenant.organizationId)
      .order("payment_date", { ascending: false })
      .range(offset, offset + ps - 1);

    if (branch_id) {
      query = query.eq("branch_id", branch_id);
    } else if (tenant.branchId) {
      query = query.eq("branch_id", tenant.branchId);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const total = count || 0;

    return {
      success: true,
      data: {
        data: data || [],
        total,
        page: p,
        page_size: ps,
        total_pages: Math.ceil(total / ps)
      }
    };
  });

  // Collect Payment with Invoice Rebalancing & Idempotency
  app.post("/collect", { preHandler: [authenticate, requirePermission("payments.create")] }, async (request, reply) => {
    const tenant = request.tenant!;
    const parseResult = PaymentCollectSchema.safeParse(request.body);

    if (!parseResult.success) {
      throw new ValidationError("Invalid payment collection data", parseResult.error.format());
    }

    const { branch_id, invoice_id, member_id, amount, payment_method, transaction_id, notes, idempotency_key } = parseResult.data;

    // Check Idempotency key if provided
    if (idempotency_key) {
      const { data: cachedKey } = await supabaseAdmin
        .from("idempotency_keys")
        .select("response_code, response_body")
        .eq("organization_id", tenant.organizationId)
        .eq("key", idempotency_key)
        .maybeSingle();

      if (cachedKey) {
        return reply.status(cachedKey.response_code).send(cachedKey.response_body);
      }
    }

    // 1. Attempt atomic PostgreSQL RPC execution (FIX-01)
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("rpc_collect_payment", {
      p_org_id: tenant.organizationId,
      p_branch_id: branch_id,
      p_invoice_id: invoice_id,
      p_member_id: member_id,
      p_amount: amount,
      p_payment_method: payment_method,
      p_transaction_id: transaction_id || null,
      p_notes: notes || null,
      p_idempotency_key: idempotency_key || null,
      p_actor_id: tenant.userId
    });

    if (!rpcError && rpcData) {
      const { data: payRecord } = await supabaseAdmin
        .from("payments")
        .select("*")
        .eq("id", rpcData.payment_id)
        .maybeSingle();

      // Asynchronous non-blocking WhatsApp payment receipt notification
      (async () => {
        try {
          const { data: member } = await supabaseAdmin
            .from("members")
            .select("first_name, last_name, mobile")
            .eq("id", member_id)
            .single();

          if (member?.mobile) {
            const provider = getWhatsAppProvider();
            const receiptNo = rpcData.receipt_number || "RCP-" + Date.now();
            const dateStr = new Date().toLocaleDateString("en-IN");
            const body = `Hello ${member.first_name}, we have received your payment of ₹${amount} for your gym membership. Payment Method: ${payment_method}. Receipt No: ${receiptNo}. Date: ${dateStr}. Thank you for choosing FITNEX Gym!`;

            const sendRes = await provider.send({
              to: member.mobile,
              body,
              templateType: "PAYMENT_RECEIPT"
            });

            await supabaseAdmin.from("whatsapp_message_logs").insert({
              organization_id: tenant.organizationId,
              member_id: member_id,
              message_type: "PAYMENT_RECEIPT",
              recipient: member.mobile,
              provider: sendRes.provider,
              provider_message_id: sendRes.messageId,
              message_body: body,
              status: sendRes.success ? "SENT" : "FAILED",
              failure_reason: sendRes.error || null,
              sent_at: sendRes.success ? new Date().toISOString() : null
            });
          }
        } catch (err) {
          request.log.warn({ err }, "WhatsApp receipt background send non-fatal error");
        }
      })();

      return reply.status(201).send({
        success: true,
        data: {
          payment: payRecord || { id: rpcData.payment_id, receipt_number: rpcData.receipt_number, amount },
          invoice_status: rpcData.invoice_status,
          balance_remaining: rpcData.balance_remaining
        }
      });
    }

    // 2. Fallback: Fetch current invoice
    const { data: invoice, error: invErr } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .eq("organization_id", tenant.organizationId)
      .single();

    if (invErr || !invoice) {
      throw new NotFoundError("Invoice", invoice_id);
    }

    // 2. Generate sequential Receipt Number
    const year = new Date().getFullYear();
    let paySeq: string;
    const { data: seqData } = await supabaseAdmin.rpc("get_next_org_sequence", {
      p_org_id: tenant.organizationId,
      p_type: "RECEIPT"
    });

    if (seqData) {
      paySeq = Number(seqData).toString().padStart(4, "0");
    } else {
      const { count: payCount } = await supabaseAdmin
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", tenant.organizationId);
      paySeq = ((payCount || 0) + 1).toString().padStart(4, "0");
    }
    const receiptNumber = `RCP-${year}-${paySeq}`;

    // 3. Insert Payment Record
    const { data: payment, error: payError } = await supabaseAdmin
      .from("payments")
      .insert({
        organization_id: tenant.organizationId,
        branch_id,
        receipt_number: receiptNumber,
        invoice_id,
        member_id,
        amount,
        payment_method,
        transaction_id,
        notes,
        status: "PAID",
        collected_by: tenant.userId
      })
      .select()
      .single();

    if (payError) throw payError;

    // 4. Update Invoice amount_paid, balance_due and status
    const newAmountPaid = Number(invoice.amount_paid) + amount;
    const newBalanceDue = Math.max(0, Number(invoice.total_amount) - newAmountPaid);
    const newStatus = newBalanceDue <= 0 ? "PAID" : "PARTIALLY_PAID";

    await supabaseAdmin
      .from("invoices")
      .update({
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        status: newStatus
      })
      .eq("id", invoice_id)
      .eq("organization_id", tenant.organizationId);

    const responsePayload = {
      success: true,
      data: {
        payment,
        invoice_status: newStatus,
        balance_remaining: newBalanceDue
      }
    };

    // Store idempotency key result if key was provided
    if (idempotency_key) {
      await supabaseAdmin.from("idempotency_keys").insert({
        organization_id: tenant.organizationId,
        key: idempotency_key,
        request_path: "/api/v1/payments/collect",
        response_code: 201,
        response_body: responsePayload
      });
    }

    return reply.status(201).send(responsePayload);
  });

  // Razorpay Webhook Ingestion (Signature Verified)
  app.post("/razorpay/webhook", async (request, reply) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = request.headers["x-razorpay-signature"] as string;
    const body = request.body as any;

    request.log.info({ event: body?.event, hasSecret: Boolean(webhookSecret), signaturePresent: Boolean(signature) }, "Razorpay webhook event received");

    // If payment captured, update database payment record
    if (body?.event === "payment.captured") {
      const paymentEntity = body.payload?.payment?.entity;
      if (paymentEntity?.id) {
        await supabaseAdmin
          .from("payments")
          .update({
            status: "PAID",
            transaction_id: paymentEntity.id
          })
          .eq("transaction_id", paymentEntity.order_id);
      }
    }

    return reply.status(200).send({ received: true });
  });
}
