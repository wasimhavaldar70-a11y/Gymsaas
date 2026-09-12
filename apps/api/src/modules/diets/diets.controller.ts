import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { z } from "zod";
import { ValidationError } from "../../lib/errors.js";

const DietPlanCreateSchema = z.object({
  branch_id: z.string().uuid(),
  member_id: z.string().uuid(),
  trainer_id: z.string().uuid().optional(),
  title: z.string().min(2).max(150),
  target_calories: z.number().int().positive().optional(),
  target_protein_grams: z.number().int().nonnegative().optional(),
  target_carbs_grams: z.number().int().nonnegative().optional(),
  target_fat_grams: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
  meals: z.array(
    z.object({
      meal_type: z.string(),
      food_item: z.string(),
      quantity: z.string(),
      calories: z.number().int().optional(),
      protein_grams: z.number().optional(),
      carbs_grams: z.number().optional(),
      fat_grams: z.number().optional(),
      notes: z.string().optional()
    })
  ).optional()
});

const MeasurementCreateSchema = z.object({
  branch_id: z.string().uuid(),
  member_id: z.string().uuid(),
  weight_kg: z.number().positive(),
  height_cm: z.number().positive().optional(),
  chest_inches: z.number().positive().optional(),
  waist_inches: z.number().positive().optional(),
  arms_inches: z.number().positive().optional(),
  notes: z.string().optional()
});

export async function dietRoutes(app: FastifyInstance) {
  // Get Diet Plans
  app.get("/", { preHandler: [authenticate, requirePermission("diets.view")] }, async (request) => {
    const tenant = request.tenant!;
    const { member_id } = request.query as { member_id?: string };

    let query = supabaseAdmin
      .from("diet_plans")
      .select("*, trainers (name), diet_plan_meals (*)")
      .eq("organization_id", tenant.organizationId)
      .order("created_at", { ascending: false });

    if (member_id) {
      query = query.eq("member_id", member_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    return {
      success: true,
      data: data || []
    };
  });

  // Create Diet Plan
  app.post("/", { preHandler: [authenticate, requirePermission("diets.manage")] }, async (request, reply) => {
    const tenant = request.tenant!;
    const parseResult = DietPlanCreateSchema.safeParse(request.body);

    if (!parseResult.success) {
      throw new ValidationError("Invalid diet plan data", parseResult.error.format());
    }

    const { meals, ...dietData } = parseResult.data;

    // Validate branch belongs to organization (FIX-SEC-002)
    const { data: bValid } = await supabaseAdmin
      .from("branches")
      .select("id")
      .eq("id", dietData.branch_id)
      .eq("organization_id", tenant.organizationId)
      .maybeSingle();

    if (!bValid) {
      throw new ValidationError("Invalid branch_id for this gym organization");
    }

    // Validate member belongs to organization (FIX-SEC-002)
    const { data: mValid } = await supabaseAdmin
      .from("members")
      .select("id")
      .eq("id", dietData.member_id)
      .eq("organization_id", tenant.organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!mValid) {
      throw new ValidationError("Invalid member_id for this gym organization");
    }

    // Validate trainer belongs to organization if provided
    if (dietData.trainer_id) {
      const { data: tValid } = await supabaseAdmin
        .from("trainers")
        .select("id")
        .eq("id", dietData.trainer_id)
        .eq("organization_id", tenant.organizationId)
        .maybeSingle();

      if (!tValid) {
        throw new ValidationError("Invalid trainer_id for this gym organization");
      }
    }

    const { data: newDiet, error: dietError } = await supabaseAdmin
      .from("diet_plans")
      .insert({
        organization_id: tenant.organizationId,
        ...dietData
      })
      .select()
      .single();

    if (dietError) throw dietError;

    if (meals && meals.length > 0) {
      const itemsToInsert = meals.map((m, idx) => ({
        diet_plan_id: newDiet.id,
        ...m,
        sort_order: idx
      }));

      await supabaseAdmin.from("diet_plan_meals").insert(itemsToInsert);
    }

    return reply.status(201).send({
      success: true,
      data: newDiet
    });
  });

  // Body Measurements: Get History
  app.get("/measurements", { preHandler: [authenticate] }, async (request) => {
    const tenant = request.tenant!;
    const { member_id } = request.query as { member_id: string };

    if (!member_id) {
      throw new ValidationError("member_id query param is required");
    }

    // Validate member belongs to organization
    const { data: mValid } = await supabaseAdmin
      .from("members")
      .select("id")
      .eq("id", member_id)
      .eq("organization_id", tenant.organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!mValid) {
      throw new ValidationError("Invalid member_id for this gym organization");
    }

    const { data, error } = await supabaseAdmin
      .from("body_measurements")
      .select("*")
      .eq("organization_id", tenant.organizationId)
      .eq("member_id", member_id)
      .order("measured_date", { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: data || []
    };
  });

  // Body Measurements: Add Measurement Record
  app.post("/measurements", { preHandler: [authenticate, requirePermission("measurements.manage")] }, async (request, reply) => {
    const tenant = request.tenant!;
    const parseResult = MeasurementCreateSchema.safeParse(request.body);

    if (!parseResult.success) {
      throw new ValidationError("Invalid measurement data", parseResult.error.format());
    }

    // Validate branch belongs to organization (FIX-SEC-002)
    const { data: bValid } = await supabaseAdmin
      .from("branches")
      .select("id")
      .eq("id", parseResult.data.branch_id)
      .eq("organization_id", tenant.organizationId)
      .maybeSingle();

    if (!bValid) {
      throw new ValidationError("Invalid branch_id for this gym organization");
    }

    // Validate member belongs to organization (FIX-SEC-002)
    const { data: mValid } = await supabaseAdmin
      .from("members")
      .select("id")
      .eq("id", parseResult.data.member_id)
      .eq("organization_id", tenant.organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!mValid) {
      throw new ValidationError("Invalid member_id for this gym organization");
    }

    const { weight_kg, height_cm } = parseResult.data;
    let bmi: number | undefined;

    if (height_cm && height_cm > 0) {
      const heightInMeters = height_cm / 100;
      bmi = Math.round((weight_kg / (heightInMeters * heightInMeters)) * 10) / 10;
    }

    const { data, error } = await supabaseAdmin
      .from("body_measurements")
      .insert({
        organization_id: tenant.organizationId,
        bmi,
        recorded_by: tenant.userId,
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
}
