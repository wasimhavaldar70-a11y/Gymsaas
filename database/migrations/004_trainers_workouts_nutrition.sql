-- ==============================================================================
-- GYMCARE CRM - Multi-Tenant SaaS Architecture Migration 004
-- Trainers, Exercises, Workouts, Diets & Body Measurement Tracking
-- ==============================================================================

-- ==============================================================================
-- 1. TRAINER PROFILES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS trainers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    photo_url TEXT,
    specialization VARCHAR(150), -- e.g. 'Strength & Conditioning, Weight Loss'
    salary NUMERIC(12, 2) CHECK (salary >= 0),
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_trainers_timestamp
BEFORE UPDATE ON trainers
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TABLE IF NOT EXISTS trainer_members (
    trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (trainer_id, member_id)
);

-- ==============================================================================
-- 2. EXERCISE LIBRARY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL means Global Built-in Library
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'STRENGTH', 'CARDIO', 'FLEXIBILITY', 'HIIT'
    muscle_group VARCHAR(50) NOT NULL, -- 'CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'CORE'
    equipment VARCHAR(100), -- 'BARBELL', 'DUMBBELL', 'MACHINE', 'BODYWEIGHT'
    difficulty VARCHAR(20) DEFAULT 'INTERMEDIATE',
    instructions TEXT,
    video_url TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. WORKOUT PLANS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS workout_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    trainer_id UUID REFERENCES trainers(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    goal VARCHAR(100) NOT NULL, -- 'MUSCLE_GAIN', 'FAT_LOSS', 'ENDURANCE'
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workout_plan_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
    day_of_week VARCHAR(15) NOT NULL, -- 'MONDAY', 'TUESDAY', etc.
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    sets INTEGER NOT NULL CHECK (sets > 0),
    reps VARCHAR(50) NOT NULL, -- e.g. '8-12' or '15'
    weight_kg NUMERIC(6, 2),
    rest_seconds INTEGER DEFAULT 60,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- ==============================================================================
-- 4. DIET & NUTRITION PLANS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS diet_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    trainer_id UUID REFERENCES trainers(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    target_calories INTEGER,
    target_protein_grams INTEGER,
    target_carbs_grams INTEGER,
    target_fat_grams INTEGER,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diet_plan_meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diet_plan_id UUID NOT NULL REFERENCES diet_plans(id) ON DELETE CASCADE,
    meal_type VARCHAR(30) NOT NULL, -- 'BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'
    food_item VARCHAR(200) NOT NULL,
    quantity VARCHAR(100) NOT NULL,
    calories INTEGER,
    protein_grams NUMERIC(6, 2),
    carbs_grams NUMERIC(6, 2),
    fat_grams NUMERIC(6, 2),
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- ==============================================================================
-- 5. BODY MEASUREMENTS (IMMUTABLE PROGRESS LOGS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS body_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    measured_date DATE NOT NULL DEFAULT CURRENT_DATE,
    weight_kg NUMERIC(5, 2) NOT NULL CHECK (weight_kg > 0),
    height_cm NUMERIC(5, 2) CHECK (height_cm > 0),
    bmi NUMERIC(4, 1),
    body_fat_percentage NUMERIC(4, 1),
    chest_inches NUMERIC(5, 2),
    waist_inches NUMERIC(5, 2),
    arms_inches NUMERIC(5, 2),
    thigh_inches NUMERIC(5, 2),
    neck_inches NUMERIC(5, 2),
    photo_url TEXT,
    notes TEXT,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_body_meas_member ON body_measurements(member_id, measured_date DESC);

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_plan_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY trainers_select ON trainers
    FOR SELECT USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY trainers_write ON trainers
    FOR ALL USING ((organization_id = get_current_user_tenant_id() AND has_permission('trainers.manage')) OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY trainer_members_all ON trainer_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM trainers t WHERE t.id = trainer_members.trainer_id 
            AND (t.organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role')
        )
    );

CREATE POLICY exercises_select ON exercises
    FOR SELECT USING (organization_id IS NULL OR organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY exercises_write ON exercises
    FOR ALL USING ((organization_id = get_current_user_tenant_id() AND has_permission('workouts.manage')) OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY workout_plans_select ON workout_plans
    FOR SELECT USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY workout_plans_write ON workout_plans
    FOR ALL USING ((organization_id = get_current_user_tenant_id() AND has_permission('workouts.manage')) OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY workout_plan_exercises_all ON workout_plan_exercises
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM workout_plans wp WHERE wp.id = workout_plan_exercises.workout_plan_id 
            AND (wp.organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role')
        )
    );

CREATE POLICY diet_plans_select ON diet_plans
    FOR SELECT USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY diet_plans_write ON diet_plans
    FOR ALL USING ((organization_id = get_current_user_tenant_id() AND has_permission('diets.manage')) OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY diet_plan_meals_all ON diet_plan_meals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM diet_plans dp WHERE dp.id = diet_plan_meals.diet_plan_id 
            AND (dp.organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role')
        )
    );

CREATE POLICY body_measurements_select ON body_measurements
    FOR SELECT USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY body_measurements_write ON body_measurements
    FOR ALL USING ((organization_id = get_current_user_tenant_id() AND has_permission('measurements.manage')) OR auth.jwt() ->> 'role' = 'service_role');
