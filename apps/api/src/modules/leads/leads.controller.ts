import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { LeadCreateSchema } from "@gymcare/shared";
import { ValidationError, NotFoundError } from "../../lib/errors.js";

export async function leadRoutes(app: FastifyInstance) {
  // List Leads
  app.get("/", { preHandler: [authenticate, requirePermission("leads.view")] }, async (request) => {
    const tenant = request.tenant!;
    const { branch_id, status, search } = request.query as {
      branch_id?: string;
      status?: string;
      search?: string;
    };

    let query = supabaseAdmin
      .from("leads")
      .select("*, membership_plans (name), branches (name, code)")
      .eq("organization_id", tenant.organizationId)
      .order("created_at", { ascending: false });

    if (branch_id) {
      query = query.eq("branch_id", branch_id);
    } else if (tenant.branchId) {
      query = query.eq("branch_id", tenant.branchId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,mobile.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return {
      success: true,
      data: data || []
    };
  });

  // Create Lead
  app.post("/", { preHandler: [authenticate, requirePermission("leads.manage")] }, async (request, reply) => {
    const tenant = request.tenant!;
    const parseResult = LeadCreateSchema.safeParse(request.body);

    if (!parseResult.success) {
      throw new ValidationError("Invalid lead data", parseResult.error.format());
    }

    const { data, error } = await supabaseAdmin
      .from("leads")
      .insert({
        organization_id: tenant.organizationId,
        status: "NEW",
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

  // 1-Click Convert Lead to Member
  app.post("/:id/convert", { preHandler: [authenticate, requirePermission("leads.manage")] }, async (request, reply) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };

    const { data: lead, error: leadErr } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", id)
      .eq("organization_id", tenant.organizationId)
      .single();

    if (leadErr || !lead) {
      throw new NotFoundError("Lead", id);
    }

    // Split name into first and last
    const nameParts = lead.name.trim().split(" ");
    const firstName = nameParts[0] || lead.name;
    const lastName = nameParts.slice(1).join(" ") || "Member";

    // Generate Member ID
    const { count } = await supabaseAdmin
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", tenant.organizationId);

    const seq = ((count || 0) + 1).toString().padStart(4, "0");
    const memberId = `MEM-${seq}`;

    // Create Member
    const { data: newMember, error: memberErr } = await supabaseAdmin
      .from("members")
      .insert({
        organization_id: tenant.organizationId,
        branch_id: lead.branch_id,
        member_id: memberId,
        first_name: firstName,
        last_name: lastName,
        mobile: lead.mobile,
        email: lead.email,
        gender: "MALE",
        source: lead.source || "LEAD_CONVERSION",
        status: "ACTIVE"
      })
      .select()
      .single();

    if (memberErr) throw memberErr;

    // Update Lead to CONVERTED
    await supabaseAdmin
      .from("leads")
      .update({
        status: "CONVERTED",
        converted_member_id: newMember.id
      })
      .eq("id", id)
      .eq("organization_id", tenant.organizationId);

    return reply.status(200).send({
      success: true,
      message: "Lead converted to Member successfully",
      data: newMember
    });
  });
}
