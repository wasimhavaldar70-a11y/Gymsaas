import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { z } from "zod";
import { ValidationError } from "../../lib/errors.js";

const TrainerCreateSchema = z.object({
  branch_id: z.string().uuid(),
  name: z.string().min(2).max(100),
  phone: z.string().min(10).max(20),
  email: z.string().email().optional(),
  specialization: z.string().max(150).optional(),
  salary: z.number().nonnegative().optional()
});

export async function trainerRoutes(app: FastifyInstance) {
  // List Trainers
  app.get("/", { preHandler: [authenticate, requirePermission("trainers.view")] }, async (request) => {
    const tenant = request.tenant!;
    const { branch_id } = request.query as { branch_id?: string };

    let query = supabaseAdmin
      .from("trainers")
      .select("*, branches (name, code)")
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

  // Assign Member to Trainer
  app.post("/:id/assign-member", { preHandler: [authenticate, requirePermission("trainers.manage")] }, async (request) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };
    const { member_id } = request.body as { member_id: string };

    if (!member_id) {
      throw new ValidationError("member_id is required");
    }

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
