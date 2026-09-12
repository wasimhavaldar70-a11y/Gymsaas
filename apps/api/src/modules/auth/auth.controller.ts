import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { supabaseAdmin } from "../../lib/supabase.js";

export async function authRoutes(app: FastifyInstance) {
  app.get("/me", { preHandler: [authenticate] }, async (request) => {
    const tenant = request.tenant!;

    // Fetch organization and branch details
    const [orgRes, branchRes] = await Promise.all([
      supabaseAdmin.from("organizations").select("id, name, slug, logo_url, currency, timezone, gstin").eq("id", tenant.organizationId).single(),
      tenant.branchId ? supabaseAdmin.from("branches").select("id, name, code, city").eq("id", tenant.branchId).single() : Promise.resolve({ data: null, error: null })
    ]);

    return {
      success: true,
      data: {
        user: {
          id: tenant.userId,
          email: tenant.email,
          role: tenant.role,
          permissions: tenant.permissions
        },
        organization: orgRes.data || {
          id: tenant.organizationId,
          name: "IronPulse Fitness Club",
          currency: "INR",
          timezone: "Asia/Kolkata"
        },
        branch: branchRes.data || (tenant.branchId ? {
          id: tenant.branchId,
          name: "Kolhapur Central Branch",
          code: "KOP-01"
        } : null)
      }
    };
  });
}
