import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { hasPermission } from "@gymcare/shared";
import { ValidationError } from "../../lib/errors.js";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/metrics", { preHandler: [authenticate] }, async (request) => {
    const tenant = request.tenant!;
    const { branch_id } = request.query as { branch_id?: string };

    const canViewFinancials = hasPermission(tenant.permissions, "reports.financial");

    if (branch_id) {
      const { data: bValid } = await supabaseAdmin
        .from("branches")
        .select("id")
        .eq("id", branch_id)
        .eq("organization_id", tenant.organizationId)
        .maybeSingle();

      if (!bValid) {
        throw new ValidationError("Invalid branch_id for this gym organization");
      }
    }

    const todayKolkata = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

    const startOfMonthKolkata = todayKolkata.substring(0, 8) + "01";

    // 7 days ahead for expiring calculation
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const sevenDaysLaterStr = sevenDaysLater.toISOString().split("T")[0];

    // Helper to scope query by branch if provided
    const withBranch = (q: any) => {
      if (branch_id) return q.eq("branch_id", branch_id);
      if (tenant.branchId) return q.eq("branch_id", tenant.branchId);
      return q;
    };

    // Parallel aggregate count queries
    const [
      totalMembersRes,
      activeMembersRes,
      expiredMembersRes,
      newMembersThisMonthRes,
      todayAttendanceRes,
      activeTrainersRes,
      expiringSoonRes,
      paymentsRes,
      todayPaymentsRes,
      recentAttendanceRes,
      activePlansRes
    ] = await Promise.all([
      // Total members
      withBranch(
        supabaseAdmin
          .from("members")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", tenant.organizationId)
          .is("deleted_at", null)
      ),
      // Active members
      withBranch(
        supabaseAdmin
          .from("members")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", tenant.organizationId)
          .eq("status", "ACTIVE")
          .is("deleted_at", null)
      ),
      // Expired members
      withBranch(
        supabaseAdmin
          .from("members")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", tenant.organizationId)
          .eq("status", "EXPIRED")
          .is("deleted_at", null)
      ),
      // New members this month
      withBranch(
        supabaseAdmin
          .from("members")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", tenant.organizationId)
          .gte("joining_date", startOfMonthKolkata)
          .is("deleted_at", null)
      ),
      // Today's attendance
      withBranch(
        supabaseAdmin
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", tenant.organizationId)
          .eq("date", todayKolkata)
      ),
      // Active trainers
      withBranch(
        supabaseAdmin
          .from("trainers")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", tenant.organizationId)
          .eq("is_active", true)
      ),
      // Memberships expiring in 7 days
      withBranch(
        supabaseAdmin
          .from("memberships")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", tenant.organizationId)
          .eq("status", "ACTIVE")
          .lte("end_date", sevenDaysLaterStr)
          .gte("end_date", todayKolkata)
      ),
      // Month payments (sum amount & dates) - only if permitted (FIX-06)
      canViewFinancials
        ? withBranch(
            supabaseAdmin
              .from("payments")
              .select("amount, payment_date")
              .eq("organization_id", tenant.organizationId)
              .gte("payment_date", startOfMonthKolkata)
              .limit(5000)
          )
        : Promise.resolve({ data: [] }),
      // Today's payments - only if permitted (FIX-06)
      canViewFinancials
        ? withBranch(
            supabaseAdmin
              .from("payments")
              .select("amount")
              .eq("organization_id", tenant.organizationId)
              .gte("payment_date", `${todayKolkata}T00:00:00`)
              .limit(2000)
          )
        : Promise.resolve({ data: [] }),
      // Last 7 days attendance for trend chart (FIX-07)
      withBranch(
        supabaseAdmin
          .from("attendance")
          .select("date")
          .eq("organization_id", tenant.organizationId)
          .gte("date", new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0])
          .limit(10000)
      ),
      // Active membership plans for real distribution chart (FIX-PERF-001)
      withBranch(
        supabaseAdmin
          .from("memberships")
          .select("plan_name")
          .eq("organization_id", tenant.organizationId)
          .eq("status", "ACTIVE")
          .limit(2000)
      )
    ]);

    const monthlyRevenue = canViewFinancials
      ? (paymentsRes.data || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0)
      : 0;
    const todayCollection = canViewFinancials
      ? (todayPaymentsRes.data || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0)
      : 0;

    // Group last 7 days attendance
    const attendanceMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      attendanceMap[d] = 0;
    }
    (recentAttendanceRes.data || []).forEach((row: any) => {
      if (attendanceMap[row.date] !== undefined) {
        attendanceMap[row.date] += 1;
      }
    });

    const attendanceTrend = Object.entries(attendanceMap).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      count
    }));

    // Real Daily Revenue Trend (Last 7 Days) (FIX-PERF-001)
    const revenueMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      revenueMap[d] = 0;
    }
    if (canViewFinancials) {
      (paymentsRes.data || []).forEach((p: any) => {
        const pDate = (p.payment_date || "").split("T")[0];
        if (revenueMap[pDate] !== undefined) {
          revenueMap[pDate] += Number(p.amount) || 0;
        }
      });
    }

    const revenueTrend = Object.entries(revenueMap).map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      amount
    }));

    // Real Active Membership Distribution (FIX-PERF-001)
    const planCounts: Record<string, number> = {};
    (activePlansRes?.data || []).forEach((row: any) => {
      const planName = row.plan_name || "General Plan";
      planCounts[planName] = (planCounts[planName] || 0) + 1;
    });

    const membershipDistribution = Object.entries(planCounts).map(([name, value]) => ({
      name,
      value
    }));

    return {
      success: true,
      data: {
        total_members: totalMembersRes.count || 0,
        active_members: activeMembersRes.count || 0,
        expired_members: expiredMembersRes.count || 0,
        new_members_this_month: newMembersThisMonthRes.count || 0,
        today_attendance: todayAttendanceRes.count || 0,
        today_collection: todayCollection,
        monthly_revenue: monthlyRevenue,
        pending_payments: 0,
        expiring_in_7_days: expiringSoonRes.count || 0,
        active_trainers: activeTrainersRes.count || 0,
        charts: {
          attendance_trend: attendanceTrend,
          revenue_trend: revenueTrend,
          membership_distribution:
            membershipDistribution.length > 0
              ? membershipDistribution
              : [{ name: "Active Members", value: activeMembersRes.count || 0 }]
        }
      }
    };
  });
}
