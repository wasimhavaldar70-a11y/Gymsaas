import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { hasPermission } from "@gymcare/shared";
import { z } from "zod";
import { ValidationError, NotFoundError } from "../../lib/errors.js";

const TrainerCreateSchema = z.object({
  branch_id: z.string().uuid(),
  name: z.string().min(2).max(100),
  phone: z.string().min(10).max(20),
  email: z.string().email().optional(),
  specialization: z.string().max(150).optional(),
  salary: z.number().nonnegative().optional()
});

export async function trainerRoutes(app: FastifyInstance) {
  // List Trainers with salary masked for non-management staff (FIX-06)
  app.get("/", { preHandler: [authenticate, requirePermission("trainers.view")] }, async (request) => {
    const tenant = request.tenant!;
    const { branch_id } = request.query as { branch_id?: string };

    const canManageSalary = hasPermission(tenant.permissions, "trainers.manage");
    const selectCols = canManageSalary
      ? "id, organization_id, branch_id, name, phone, email, photo_url, specialization, salary, joining_date, is_active, branches (name, code)"
      : "id, organization_id, branch_id, name, phone, email, photo_url, specialization, joining_date, is_active, branches (name, code)";

    let query = supabaseAdmin
      .from("trainers")
      .select(selectCols)
      .eq("organization_id", tenant.organizationId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (branch_id) {
      query = query.eq("branch_id", branch_id);
    } else if (tenant.branchId) {
      query = query.eq("branch_id", tenant.branchId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return {
      success: true,
      data: data || []
    };
  });

  // Create Trainer
  app.post("/", { preHandler: [authenticate, requirePermission("trainers.manage")] }, async (request, reply) => {
    const tenant = request.tenant!;
    const parseResult = TrainerCreateSchema.safeParse(request.body);

    if (!parseResult.success) {
      throw new ValidationError("Invalid trainer data", parseResult.error.format());
    }

    // Verify branch belongs to organization (FIX-05)
    const { data: bCheck } = await supabaseAdmin
      .from("branches")
      .select("id")
      .eq("id", parseResult.data.branch_id)
      .eq("organization_id", tenant.organizationId)
      .maybeSingle();

    if (!bCheck) {
      throw new ValidationError("Branch does not exist or does not belong to your gym organization");
    }

    const { data, error } = await supabaseAdmin
      .from("trainers")
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

  // Assign Member to Trainer (FIX-05)
  app.post("/:id/assign-member", { preHandler: [authenticate, requirePermission("trainers.manage")] }, async (request) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };
    const { member_id } = request.body as { member_id: string };

    if (!member_id) {
      throw new ValidationError("member_id is required");
    }

    // Verify both trainer and member belong to tenant organization
    const [trainerRes, memberRes] = await Promise.all([
      supabaseAdmin.from("trainers").select("id").eq("id", id).eq("organization_id", tenant.organizationId).maybeSingle(),
      supabaseAdmin.from("members").select("id").eq("id", member_id).eq("organization_id", tenant.organizationId).maybeSingle()
    ]);

    if (!trainerRes.data) throw new NotFoundError("Trainer", id);
    if (!memberRes.data) throw new NotFoundError("Member", member_id);

    const { error: assignError } = await supabaseAdmin
      .from("trainer_members")
      .upsert({
        trainer_id: id,
        member_id
      });

    if (assignError) throw assignError;

    // Also update member's assigned_trainer_id
    await supabaseAdmin
      .from("members")
      .update({ assigned_trainer_id: id })
      .eq("id", member_id)
      .eq("organization_id", tenant.organizationId);

    return {
      success: true,
      message: "Trainer assigned successfully"
    };
  });
}
