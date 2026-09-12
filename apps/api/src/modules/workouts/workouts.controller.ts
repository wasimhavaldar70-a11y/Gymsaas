import { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { supabaseAdmin } from "../../lib/supabase.js";
import { z } from "zod";
import { ValidationError } from "../../lib/errors.js";

const ExerciseCreateSchema = z.object({
  name: z.string().min(2).max(150),
  category: z.string(),
  muscle_group: z.string(),
  equipment: z.string().optional(),
  difficulty: z.string().default("INTERMEDIATE"),
  instructions: z.string().optional()
});

const WorkoutPlanCreateSchema = z.object({
  branch_id: z.string().uuid(),
  member_id: z.string().uuid(),
  trainer_id: z.string().uuid().optional(),
  title: z.string().min(2).max(150),
  goal: z.string(),
  start_date: z.string().default(() => new Date().toISOString().split("T")[0]),
  notes: z.string().optional(),
  exercises: z.array(
    z.object({
      day_of_week: z.string(),
      exercise_id: z.string().uuid(),
      sets: z.number().int().positive(),
      reps: z.string(),
      weight_kg: z.number().nonnegative().optional(),
      rest_seconds: z.number().int().default(60),
      notes: z.string().optional()
    })
  ).optional()
});

export async function workoutRoutes(app: FastifyInstance) {
  // Get Exercise Library (Built-in + Custom)
  app.get("/exercises", { preHandler: [authenticate] }, async (request) => {
    const tenant = request.tenant!;
    const { category, muscle_group } = request.query as { category?: string; muscle_group?: string };

    let query = supabaseAdmin
      .from("exercises")
      .select("*")
      .or(`organization_id.is.null,organization_id.eq.${tenant.organizationId}`)
      .order("name", { ascending: true });

    if (category) query = query.eq("category", category);
    if (muscle_group) query = query.eq("muscle_group", muscle_group);

    const { data, error } = await query;
    if (error) throw error;

    return {
      success: true,
      data: data || []
    };
  });

  // Create Custom Exercise
  app.post("/exercises", { preHandler: [authenticate, requirePermission("workouts.manage")] }, async (request, reply) => {
    const tenant = request.tenant!;
    const parseResult = ExerciseCreateSchema.safeParse(request.body);

    if (!parseResult.success) {
      throw new ValidationError("Invalid exercise data", parseResult.error.format());
    }

    const { data, error } = await supabaseAdmin
      .from("exercises")
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

  // Get Workout Plans for Member
  app.get("/plans", { preHandler: [authenticate, requirePermission("workouts.view")] }, async (request) => {
    const tenant = request.tenant!;
    const { member_id } = request.query as { member_id?: string };

    let query = supabaseAdmin
      .from("workout_plans")
      .select(
        `
        *,
        trainers (name, specialization),
        workout_plan_exercises (*, exercises (name, muscle_group, equipment))
      `
      )
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

  // Create Workout Plan
  app.post("/plans", { preHandler: [authenticate, requirePermission("workouts.manage")] }, async (request, reply) => {
    const tenant = request.tenant!;
    const parseResult = WorkoutPlanCreateSchema.safeParse(request.body);

    if (!parseResult.success) {
      throw new ValidationError("Invalid workout plan data", parseResult.error.format());
    }

    const { exercises, ...planData } = parseResult.data;

    const { data: newPlan, error: planError } = await supabaseAdmin
      .from("workout_plans")
      .insert({
        organization_id: tenant.organizationId,
        ...planData
      })
      .select()
      .single();

    if (planError) throw planError;

    // Insert associated exercises if provided
    if (exercises && exercises.length > 0) {
      const itemsToInsert = exercises.map((ex, idx) => ({
        workout_plan_id: newPlan.id,
        ...ex,
        sort_order: idx
      }));

      await supabaseAdmin.from("workout_plan_exercises").insert(itemsToInsert);
    }

    return reply.status(201).send({
      success: true,
      data: newPlan
    });
  });
}
