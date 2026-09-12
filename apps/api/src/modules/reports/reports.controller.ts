import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { supabaseAdmin } from "../../lib/supabase.js";

export async function reportRoutes(app: FastifyInstance) {
  // GST Tax Report
  app.get("/gst", { preHandler: [authenticate, requirePermission("reports.financial")] }, async (request) => {
    const tenant = request.tenant!;
    const { start_date, end_date } = request.query as { start_date?: string; end_date?: string };

    let query = supabaseAdmin
      .from("invoices")
      .select("invoice_number, issue_date, taxable_amount, cgst, sgst, igst, total_tax, total_amount, status")
      .eq("organization_id", tenant.organizationId)
      .neq("status", "CANCELLED")
      .order("issue_date", { ascending: true });

    if (start_date) query = query.gte("issue_date", start_date);
    if (end_date) query = query.lte("issue_date", end_date);

    const { data: invoices, error } = await query;
    if (error) throw error;

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalTax = 0;
    let grandTotal = 0;

    (invoices || []).forEach((inv: any) => {
      totalTaxable += Number(inv.taxable_amount || 0);
      totalCgst += Number(inv.cgst || 0);
      totalSgst += Number(inv.sgst || 0);
      totalIgst += Number(inv.igst || 0);
      totalTax += Number(inv.total_tax || 0);
      grandTotal += Number(inv.total_amount || 0);
    });

    return {
      success: true,
      data: {
        summary: {
          total_taxable_turnover: totalTaxable,
          total_cgst: totalCgst,
          total_sgst: totalSgst,
          total_igst: totalIgst,
          total_tax_liability: totalTax,
          grand_total: grandTotal,
          invoice_count: invoices?.length || 0
        },
        invoices: invoices || []
      }
    };
  });

  // Server-Side Export Members CSV
  app.get("/export/members.csv", { preHandler: [authenticate, requirePermission("reports.export")] }, async (request, reply) => {
    const tenant = request.tenant!;

    const { data: members, error } = await supabaseAdmin
      .from("members")
      .select("member_id, first_name, last_name, mobile, email, gender, joining_date, status")
      .eq("organization_id", tenant.organizationId)
      .is("deleted_at", null)
      .order("member_id", { ascending: true });

    if (error) throw error;

    const headers = ["Member ID", "First Name", "Last Name", "Mobile", "Email", "Gender", "Joining Date", "Status"];
    const csvRows = [headers.join(",")];

    (members || []).forEach((m: any) => {
      const row = [
        `"${m.member_id}"`,
        `"${m.first_name}"`,
        `"${m.last_name}"`,
        `"${m.mobile}"`,
        `"${m.email || ""}"`,
        `"${m.gender}"`,
        `"${m.joining_date}"`,
        `"${m.status}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");

    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", `attachment; filename="members_${new Date().toISOString().split("T")[0]}.csv"`);
    return reply.send(csvContent);
  });
}
