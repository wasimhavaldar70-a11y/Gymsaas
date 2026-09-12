import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { NotFoundError } from "../../lib/errors.js";

export async function invoiceRoutes(app: FastifyInstance) {
  // List Invoices
  app.get("/", { preHandler: [authenticate, requirePermission("invoices.view")] }, async (request) => {
    const tenant = request.tenant!;
    const { branch_id, status, page = "1", page_size = "20" } = request.query as {
      branch_id?: string;
      status?: string;
      page?: string;
      page_size?: string;
    };

    const p = Math.max(1, parseInt(page, 10));
    const ps = Math.min(100, Math.max(1, parseInt(page_size, 10)));
    const offset = (p - 1) * ps;

    let query = supabaseAdmin
      .from("invoices")
      .select(
        `
        id, invoice_number, subtotal, discount, taxable_amount, total_tax,
        total_amount, amount_paid, balance_due, status, issue_date, due_date,
        members (id, member_id, first_name, last_name, mobile),
        branches (name, code)
      `,
        { count: "exact" }
      )
      .eq("organization_id", tenant.organizationId)
      .order("issue_date", { ascending: false })
      .range(offset, offset + ps - 1);

    if (branch_id) {
      query = query.eq("branch_id", branch_id);
    }
    if (status) {
      query = query.eq("status", status);
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

  // Get Single Invoice with Items & Tax Details (Ready for Print / PDF)
  app.get("/:id", { preHandler: [authenticate, requirePermission("invoices.view")] }, async (request) => {
    const tenant = request.tenant!;
    const { id } = request.params as { id: string };

    const { data: invoice, error } = await supabaseAdmin
      .from("invoices")
      .select(
        `
        *,
        members (id, member_id, first_name, last_name, mobile, email, address, city, pincode),
        branches (id, name, code, phone, email, address, city, state, state_code, pincode),
        invoice_items (*),
        payments (*)
      `
      )
      .eq("id", id)
      .eq("organization_id", tenant.organizationId)
      .single();

    if (error || !invoice) {
      throw new NotFoundError("Invoice", id);
    }

    // Get Organization GSTIN & Legal info
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name, legal_name, gstin, pan, phone, email, address, city, state, state_code, pincode, logo_url")
      .eq("id", tenant.organizationId)
      .single();

    return {
      success: true,
      data: {
        ...invoice,
        organization: org
      }
    };
  });
}
