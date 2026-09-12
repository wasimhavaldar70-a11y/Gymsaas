import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { AttendanceMarkSchema } from "@gymcare/shared";
import { ValidationError, NotFoundError } from "../../lib/errors.js";

export async function attendanceRoutes(app: FastifyInstance) {
  // Rapid Check-in Desk Endpoint
  app.post("/check-in", { preHandler: [authenticate, requirePermission("attendance.mark")] }, async (request, reply) => {
    const tenant = request.tenant!;
    const parseResult = AttendanceMarkSchema.safeParse(request.body);

    if (!parseResult.success) {
      throw new ValidationError("Invalid check-in parameters", parseResult.error.format());
    }

    const { branch_id, member_identifier, method, device_id } = parseResult.data;

    // Resolve member by QR Token, Member ID or Mobile
    const cleanedIdent = member_identifier.trim();
    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select(`
        id, member_id, first_name, last_name, photo_url, mobile, status,
        memberships (id, plan_name, end_date, status)
      `)
      .eq("organization_id", tenant.organizationId)
      .is("deleted_at", null)
      .or(`qr_token.eq.${cleanedIdent},member_id.ilike.${cleanedIdent},mobile.ilike.%${cleanedIdent}%`)
      .maybeSingle();

    if (memberError || !member) {
      throw new NotFoundError("Member matching identifier", member_identifier);
    }

    // Determine current Indian date (Asia/Kolkata)
    const todayKolkata = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

    // Check if already checked in today
    const { data: existingCheckIn } = await supabaseAdmin
      .from("attendance")
      .select("id, check_in")
      .eq("organization_id", tenant.organizationId)
      .eq("member_id", member.id)
      .eq("date", todayKolkata)
      .maybeSingle();

    if (existingCheckIn) {
      const checkInTime = new Date(existingCheckIn.check_in).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit"
      });

      return reply.status(200).send({
        success: true,
        already_checked_in: true,
        message: `${member.first_name} ${member.last_name} has already checked in today at ${checkInTime}.`,
        data: {
          member,
          check_in_time: existingCheckIn.check_in
        }
      });
    }

    // Insert attendance record
    const { data: attendanceRecord, error: insertError } = await supabaseAdmin
      .from("attendance")
      .insert({
        organization_id: tenant.organizationId,
        branch_id,
        member_id: member.id,
        date: todayKolkata,
        method,
        device_id,
        marked_by: tenant.userId
      })
      .select()
      .single();

    if (insertError) {
      // Gracefully handle concurrent check-in collision on uq_attendance_day (CONCUR-002)
      if ((insertError as any).code === "23505" || insertError.message?.includes("uq_attendance_day")) {
        return reply.status(200).send({
          success: true,
          already_checked_in: true,
          message: `${member.first_name} ${member.last_name} has already checked in today.`,
          data: {
            member,
            check_in_time: new Date().toISOString()
          }
        });
      }
      throw insertError;
    }

    // Check active membership health
    const activeMembership = (member.memberships as any[])?.find(
      (m) => m.status === "ACTIVE" || m.status === "EXPIRING_SOON"
    );

    return reply.status(201).send({
      success: true,
      already_checked_in: false,
      message: `Check-in recorded for ${member.first_name} ${member.last_name}!`,
      data: {
        attendance: attendanceRecord,
        member: {
          id: member.id,
          member_id: member.member_id,
          name: `${member.first_name} ${member.last_name}`,
          photo_url: member.photo_url,
          membership_status: activeMembership ? activeMembership.status : "NO_ACTIVE_PLAN",
          plan_name: activeMembership ? activeMembership.plan_name : null,
          end_date: activeMembership ? activeMembership.end_date : null
        }
      }
    });
  });

  // Get Today's or Historical Live Attendance Feed (FIX-10)
  app.get("/today", { preHandler: [authenticate, requirePermission("attendance.view")] }, async (request) => {
    const tenant = request.tenant!;
    const { branch_id, date } = request.query as { branch_id?: string; date?: string };

    const todayKolkata = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

    const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayKolkata;

    let query = supabaseAdmin
      .from("attendance")
      .select(`
        id, check_in, check_out, method, date,
        members (id, member_id, first_name, last_name, photo_url, mobile, status),
        branches (name, code)
      `)
      .eq("organization_id", tenant.organizationId)
      .eq("date", targetDate)
      .order("check_in", { ascending: false });

    if (branch_id) {
      query = query.eq("branch_id", branch_id);
    } else if (tenant.branchId) {
      query = query.eq("branch_id", tenant.branchId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return {
      success: true,
      data: data || [],
      count: data?.length || 0,
      date: targetDate
    };
  });
}
