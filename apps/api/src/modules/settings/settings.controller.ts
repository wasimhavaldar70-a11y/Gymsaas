import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { z } from "zod";
import { ValidationError } from "../../lib/errors.js";

const SettingsUpdateSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  legal_name: z.string().max(200).optional(),
  gstin: z.string().max(15).optional(),
  pan: z.string().max(10).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  invoice_prefix: z.string().max(10).optional()
});

export async function settingsRoutes(app: FastifyInstance) {
  // Get Gym Settings (FIX-06)
  app.get("/", { preHandler: [authenticate, requirePermission("settings.manage")] }, async (request) => {
    const tenant = request.tenant!;

    const { data: org, error } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .eq("id", tenant.organizationId)
      .single();

    if (error) throw error;

    return {
      success: true,
      data: org
    };
  });

  // Update Gym Settings
  app.put("/", { preHandler: [authenticate, requirePermission("settings.manage")] }, async (request) => {
    const tenant = request.tenant!;
    const parseResult = SettingsUpdateSchema.safeParse(request.body);

    if (!parseResult.success) {
      throw new ValidationError("Invalid settings payload", parseResult.error.format());
    }

    const { data: updatedOrg, error } = await supabaseAdmin
      .from("organizations")
      .update(parseResult.data)
      .eq("id", tenant.organizationId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: updatedOrg
    };
  });
}
