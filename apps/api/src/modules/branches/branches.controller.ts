import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { BranchCreateSchema } from "@gymcare/shared";
import { ValidationError } from "../../lib/errors.js";

export async function branchRoutes(app: FastifyInstance) {
  // List branches for current organization
  app.get("/", { preHandler: [authenticate] }, async (request) => {
    const tenant = request.tenant!;

    const { data, error } = await supabaseAdmin
      .from("branches")
      .select("*")
      .eq("organization_id", tenant.organizationId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;

    return {
      success: true,
      data: data || []
    };
  });

  // Create new branch
  app.post("/", { preHandler: [authenticate, requirePermission("branches.manage")] }, async (request, reply) => {
    const tenant = request.tenant!;
    const parseResult = BranchCreateSchema.safeParse(request.body);

    if (!parseResult.success) {
      throw new ValidationError("Invalid branch creation data", parseResult.error.format());
    }

    const branchData = parseResult.data;

    const { data, error } = await supabaseAdmin
      .from("branches")
      .insert({
        organization_id: tenant.organizationId,
        ...branchData
      })
      .select()
      .single();

    if (error) throw error;

    return reply.status(201).send({
      success: true,
      data
    });
  });
}
