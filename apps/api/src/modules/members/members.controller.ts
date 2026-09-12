import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { MemberCreateSchema, MemberUpdateSchema } from "@gymcare/shared";
import { ValidationError, NotFoundError, ConflictError } from "../../lib/errors.js";

export async function memberRoutes(app: FastifyInstance) {
  // List members with pagination & search
  app.get("/", { preHandler: [authenticate, requirePermission("members.view")] }, async (request) => {
    const tenant = request.tenant!;
    const query = request.query as {
      page?: string;
      page_size?: string;
      search?: string;
      status?: string;
      branch_id?: string;
    };

    const page = Math.max(1, parseInt(query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(query.page_size || "20", 10)));
    const offset = (page - 1) * pageSize;

    let dbQuery = supabaseAdmin
      .from("members")
      .select(
        `
        id, organization_id, branch_id, member_id, first_name, last_name, gender,
        mobile, email, photo_url, status, joining_date, qr_token, version, created_at,
        branches (name, code),
        memberships (id, plan_name, start_date, end_date, status)
      `,
        { count: "exact" }
      )
      .eq("organization_id", tenant.organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (query.branch_id) {
      dbQuery = dbQuery.eq("branch_id", query.branch_id);
    } else if (tenant.branchId) {
      dbQuery = dbQuery.eq("branch_id", tenant.branchId);
    }

    if (query.status) {
      dbQuery = dbQuery.eq("status", query.status);
    }

    if (query.search) {
      const searchTerm = query.search.trim();
      dbQuery = dbQuery.or(
        `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,mobile.ilike.%${searchTerm}%,member_id.ilike.%${searchTerm}%`
      );
    }

    const { data, count, error } = await dbQuery;
    if (error) throw error;

    const total = count || 0;

    return {
      success: true,
      data: {
        data: data || [],
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize)
      }
    };
  });

  // Create new member
  app.post("/", { preHandler: [authenticate, requirePermission("members.create")] }, async (request, reply) => {
    const tenant = request.tenant!;
    const parseResult = MemberCreateSchema.safeParse(request.body);

    if (!parseResult.success) {
      throw new ValidationError("Invalid member data", parseResult.error.format());
    }

    const memberData = parseResult.data;

    // Check for duplicate active mobile number within the same organization
    const { data: existingMobile } = await supabaseAdmin
      .from("members")
      .select("id, member_id")
      .eq("organization_id", tenant.organizationId)
      .eq("mobile", memberData.mobile)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingMobile) {
      throw new ConflictError(`A member with mobile '${memberData.mobile}' already exists (${existingMobile.member_id})`);
    }

    // Generate unique sequential member ID (e.g. MEM-0001)
    const { count } = await supabaseAdmin
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", tenant.organizationId);

    const sequenceNum = (count || 0) + 1;
    const generatedMemberId = `MEM-${sequenceNum.toString().padStart(4, "0")}`;

    const { data: newMember, error: insertError } = await supabaseAdmin
      .from("members")
      .insert({
        organization_id: tenant.organizationId,
        member_id: generatedMemberId,
        ...memberData,
        status: "ACTIVE",
        version: 1
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Record audit log
    await supabaseAdmin.from("audit_logs").insert({
      organization_id: tenant.organizationId,
      branch_id: memberData.branch_id,
      actor_id: tenant.userId,
      action: "MEMBER_CREATE",
      entity_type: "MEMBER",
      entity_id: newMember.id,
      new_data: newMember
    });

    return reply.status(201).send({
      success: true,
      data: newMember
    });
  });

  // Get single member 360 view
  app.get("/:id", { preHandler: [authenticate, requirePermission("members.view")] }, async (request) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };

    const { data: member, error } = await supabaseAdmin
      .from("members")
      .select(
        `
        *,
        branches (id, name, code),
        memberships (*),
        attendance (id, check_in, check_out, date, method)
      `
      )
      .eq("id", id)
      .eq("organization_id", tenant.organizationId)
      .is("deleted_at", null)
      .order("check_in", { referencedTable: "attendance", ascending: false })
      .limit(10, { referencedTable: "attendance" })
      .single();

    if (error || !member) {
      throw new NotFoundError("Member", id);
    }

    return {
      success: true,
      data: member
    };
  });

  // Update member with optimistic concurrency
  app.put("/:id", { preHandler: [authenticate, requirePermission("members.update")] }, async (request) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };
    const parseResult = MemberUpdateSchema.safeParse(request.body);

    if (!parseResult.success) {
      throw new ValidationError("Invalid member update data", parseResult.error.format());
    }

    const { version, ...updateFields } = parseResult.data;

    // Concurrency check: Ensure record version matches
    const { data: currentMember, error: fetchError } = await supabaseAdmin
      .from("members")
      .select("id, version")
      .eq("id", id)
      .eq("organization_id", tenant.organizationId)
      .single();

    if (fetchError || !currentMember) {
      throw new NotFoundError("Member", id);
    }

    if (currentMember.version !== version) {
      throw new ConflictError(
        "This member was updated on another device. Please refresh and review the latest details."
      );
    }

    const { data: updatedMember, error: updateError } = await supabaseAdmin
      .from("members")
      .update({
        ...updateFields,
        version: currentMember.version + 1
      })
      .eq("id", id)
      .eq("organization_id", tenant.organizationId)
      .select()
      .single();

    if (updateError) throw updateError;

    return {
      success: true,
      data: updatedMember
    };
  });

  // Soft delete member
  app.delete("/:id", { preHandler: [authenticate, requirePermission("members.delete")] }, async (request) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };

    const { error } = await supabaseAdmin
      .from("members")
      .update({ deleted_at: new Date().toISOString(), status: "CANCELLED" })
      .eq("id", id)
      .eq("organization_id", tenant.organizationId);

    if (error) throw error;

    return {
      success: true,
      message: "Member successfully archived"
    };
  });
}
