import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { getWhatsAppProvider } from "./whatsapp.provider.js";
import { WhatsAppSendSchema, WhatsAppTemplateUpdateSchema } from "@gymcare/shared";
import { BadRequestError } from "../../lib/errors.js";

export async function whatsappRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // ============================================================================
  // 1. WHATSAPP METRICS DASHBOARD
  // ============================================================================
  app.get("/dashboard", async (request) => {
    const tenant = request.tenant!;
    const today = new Date().toISOString().split("T")[0];

    const { data: logs, error } = await supabaseAdmin
      .from("whatsapp_message_logs")
      .select("id, status, message_type, created_at")
      .eq("organization_id", tenant.organizationId);

    if (error) {
      throw new BadRequestError("Failed to fetch WhatsApp metrics", error);
    }

    const todayLogs = (logs || []).filter(l => l.created_at?.startsWith(today));

    const sentToday = todayLogs.filter(l => l.status === "SENT" || l.status === "DELIVERED" || l.status === "READ").length;
    const pendingToday = todayLogs.filter(l => l.status === "QUEUED" || l.status === "SENDING").length;
    const failedToday = todayLogs.filter(l => l.status === "FAILED").length;

    // Category breakdown
    const categoryCounts = {
      payment_receipts: (logs || []).filter(l => l.message_type === "PAYMENT_RECEIPT").length,
      payment_dues: (logs || []).filter(l => l.message_type === "PAYMENT_DUE").length,
      expiry_reminders: (logs || []).filter(l => l.message_type?.includes("EXPIRY")).length,
      renewals: (logs || []).filter(l => l.message_type === "RENEWAL").length,
      birthdays: (logs || []).filter(l => l.message_type === "BIRTHDAY").length,
      custom: (logs || []).filter(l => l.message_type === "CUSTOM").length
    };

    return {
      success: true,
      data: {
        messages_sent_today: sentToday,
        messages_pending_today: pendingToday,
        messages_failed_today: failedToday,
        total_messages_all_time: logs?.length || 0,
        categories: categoryCounts
      }
    };
  });

  // ============================================================================
  // 2. WHATSAPP DELIVERY LOGS
  // ============================================================================
  app.get("/logs", async (request) => {
    const tenant = request.tenant!;
    const { status, limit = "50" } = request.query as { status?: string; limit?: string };

    let query = supabaseAdmin
      .from("whatsapp_message_logs")
      .select(`
        id, member_id, message_type, recipient, provider, provider_message_id, 
        message_body, status, failure_reason, sent_at, created_at,
        members (first_name, last_name)
      `)
      .eq("organization_id", tenant.organizationId)
      .order("created_at", { ascending: false })
      .limit(parseInt(limit, 10));

    if (status && status !== "ALL") {
      query = query.eq("status", status);
    }

    const { data: logs, error } = await query;
    if (error) {
      throw new BadRequestError("Failed to fetch message logs", error);
    }

    return {
      success: true,
      data: logs || []
    };
  });

  // ============================================================================
  // 3. NOTIFICATION TEMPLATES
  // ============================================================================
  app.get("/templates", async (request) => {
    const tenant = request.tenant!;

    const { data: templates, error } = await supabaseAdmin
      .from("notification_templates")
      .select("id, event_type, template_body, variables, is_active, created_at")
      .eq("organization_id", tenant.organizationId)
      .eq("channel", "WHATSAPP");

    if (error) {
      throw new BadRequestError("Failed to fetch notification templates", error);
    }

    return {
      success: true,
      data: templates || []
    };
  });

  app.put("/templates/:id", async (request) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };
    const payload = WhatsAppTemplateUpdateSchema.parse(request.body);

    const { data: updated, error } = await supabaseAdmin
      .from("notification_templates")
      .update({
        template_body: payload.template_body,
        variables: payload.variables ? JSON.stringify(payload.variables) : undefined,
        is_active: payload.is_active
      })
      .eq("id", id)
      .eq("organization_id", tenant.organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestError("Failed to update template", error);
    }

    return {
      success: true,
      data: updated
    };
  });

  // ============================================================================
  // 4. MANUAL / INSTANT WHATSAPP SEND
  // ============================================================================
  app.post("/send", async (request, reply) => {
    const tenant = request.tenant!;
    const payload = WhatsAppSendSchema.parse(request.body);

    // Fetch gym organization details for branding
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name, phone")
      .eq("id", tenant.organizationId)
      .single();

    const gymName = org?.name || "FITNEX Fitness Club";

    // Resolve template or custom message
    let messageBody = payload.custom_message || "";
    if (!messageBody && payload.event_type) {
      const { data: template } = await supabaseAdmin
        .from("notification_templates")
        .select("template_body")
        .eq("organization_id", tenant.organizationId)
        .eq("event_type", payload.event_type)
        .eq("channel", "WHATSAPP")
        .maybeSingle();

      if (template?.template_body) {
        messageBody = template.template_body;
        // Interpolate variables
        const vars = { ...payload.variables, gym_name: gymName };
        Object.entries(vars).forEach(([key, val]) => {
          messageBody = messageBody.replace(new RegExp(`{{${key}}}`, "g"), String(val));
        });
      }
    }

    if (!messageBody) {
      messageBody = `Hello from ${gymName}! Thank you for your membership.`;
    }

    // Call WhatsApp Provider (Non-blocking execution)
    const provider = getWhatsAppProvider();
    const sendResult = await provider.send({
      to: payload.recipient_phone,
      body: messageBody,
      templateType: payload.event_type,
      variables: payload.variables
    });

    // Record delivery log
    const { data: logEntry, error: logError } = await supabaseAdmin
      .from("whatsapp_message_logs")
      .insert({
        organization_id: tenant.organizationId,
        member_id: payload.member_id || null,
        message_type: payload.event_type || "CUSTOM",
        recipient: payload.recipient_phone,
        provider: sendResult.provider,
        provider_message_id: sendResult.messageId,
        message_body: messageBody,
        status: sendResult.success ? "SENT" : "FAILED",
        failure_reason: sendResult.error || null,
        sent_at: sendResult.success ? new Date().toISOString() : null,
        failed_at: sendResult.success ? null : new Date().toISOString()
      })
      .select()
      .single();

    if (logError) {
      request.log.error({ err: logError }, "Failed to persist WhatsApp message log");
    }

    return reply.status(sendResult.success ? 200 : 502).send({
      success: sendResult.success,
      message: sendResult.success ? "WhatsApp notification sent successfully" : `Provider error: ${sendResult.error}`,
      data: logEntry
    });
  });

  // ============================================================================
  // 5. SERVER-SIDE AUTOMATION ENGINE (IDEMPOTENT RUNNER)
  // ============================================================================
  app.post("/run-automation", async (request) => {
    const tenant = request.tenant!;

    // Find memberships expiring in 7 days or 1 day
    const targetDate7 = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    const targetDate1 = new Date(Date.now() + 1 * 86400000).toISOString().split("T")[0];

    const { data: expiringMemberships } = await supabaseAdmin
      .from("memberships")
      .select(`
        id, end_date,
        members (id, first_name, last_name, mobile),
        membership_plans (name)
      `)
      .eq("organization_id", tenant.organizationId)
      .eq("status", "ACTIVE")
      .in("end_date", [targetDate7, targetDate1]);

    const provider = getWhatsAppProvider();
    let sentCount = 0;
    let skippedCount = 0;

    for (const item of (expiringMemberships || [])) {
      const member = item.members as any;
      if (!member || !member.mobile) continue;

      // Check Idempotency Key to ensure we NEVER send duplicate reminders
      const idempotencyKey = `EXPIRY-${item.id}-${item.end_date}`;

      const { error: insertKeyErr } = await supabaseAdmin
        .from("idempotency_keys")
        .insert({
          organization_id: tenant.organizationId,
          key: idempotencyKey,
          response_data: { membership_id: item.id, end_date: item.end_date }
        });

      if (insertKeyErr) {
        // Key collision = reminder already sent for this event today!
        skippedCount++;
        continue;
      }

      // Format reminder body
      const planName = (item as any).membership_plans?.name || "Gym Membership";
      const body = `Hello ${member.first_name}, your gym membership for ${planName} expires on ${item.end_date}. Renew today to continue workouts without interruption! - FITNEX Gym`;

      const sendRes = await provider.send({
        to: member.mobile,
        body,
        templateType: "EXPIRY_REMINDER"
      });

      await supabaseAdmin.from("whatsapp_message_logs").insert({
        organization_id: tenant.organizationId,
        member_id: member.id,
        message_type: "EXPIRY_REMINDER",
        recipient: member.mobile,
        provider: sendRes.provider,
        provider_message_id: sendRes.messageId,
        message_body: body,
        status: sendRes.success ? "SENT" : "FAILED",
        idempotency_key: idempotencyKey,
        sent_at: sendRes.success ? new Date().toISOString() : null
      });

      sentCount++;
    }

    return {
      success: true,
      message: `Automation executed: ${sentCount} reminders sent, ${skippedCount} duplicate events skipped`,
      data: {
        sent_count: sentCount,
        skipped_count: skippedCount,
        timestamp: new Date().toISOString()
      }
    };
  });
}
