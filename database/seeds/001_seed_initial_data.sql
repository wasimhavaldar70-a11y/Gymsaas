-- ==============================================================================
-- GYMCARE CRM - Multi-Tenant SaaS Architecture Initial Seed Data
-- Roles, Permissions, Subscription Tiers, Demo Tenant & Exercise Catalog
-- ==============================================================================

-- 1. SYSTEM ROLES
INSERT INTO roles (id, name, description, is_system) VALUES
('SUPER_ADMIN', 'Super Admin', 'Platform administrator with unrestricted global access', TRUE),
('GYM_OWNER', 'Gym Owner', 'Full operational and financial control over the gym organization', TRUE),
('BRANCH_MANAGER', 'Branch Manager', 'Operational manager for assigned branch(es)', TRUE),
('RECEPTIONIST', 'Receptionist', 'Front desk staff handling check-ins, members, and billing', TRUE),
('TRAINER', 'Trainer / Coach', 'Fitness instructor managing workout/diet plans and attendance', TRUE),
('ACCOUNTANT', 'Accountant', 'Financial officer handling payments, GST invoices and expenses', TRUE),
('STAFF', 'General Staff', 'Staff member with read-only member and attendance check privileges', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 2. PERMISSIONS
INSERT INTO permissions (id, name, category, description) VALUES
('members.view', 'View Members', 'Members', 'View member profiles and lists'),
('members.create', 'Add Members', 'Members', 'Register new gym members'),
('members.update', 'Edit Members', 'Members', 'Update member information'),
('members.delete', 'Delete Members', 'Members', 'Soft-delete or deactivate members'),
('members.export', 'Export Members', 'Members', 'Download member reports and CSVs'),
('members.import', 'Import Members', 'Members', 'Bulk import members from CSV'),
('memberships.view', 'View Memberships', 'Memberships', 'View member subscriptions and plans'),
('memberships.create', 'Assign Memberships', 'Memberships', 'Create or renew member subscriptions'),
('memberships.update', 'Update Memberships', 'Memberships', 'Modify subscription dates and details'),
('memberships.cancel', 'Cancel Memberships', 'Memberships', 'Cancel active member subscriptions'),
('memberships.freeze', 'Freeze Memberships', 'Memberships', 'Freeze memberships for vacations/medical'),
('plans.manage', 'Manage Plans', 'Memberships', 'Create and edit pricing plans'),
('attendance.view', 'View Attendance', 'Attendance', 'View check-in logs and daily rosters'),
('attendance.mark', 'Mark Attendance', 'Attendance', 'Record member check-ins and check-outs'),
('attendance.modify', 'Modify Attendance', 'Attendance', 'Edit or remove attendance records'),
('payments.view', 'View Payments', 'Financials', 'View transactions, receipts, and revenue'),
('payments.create', 'Collect Payments', 'Financials', 'Record payments and issue receipts'),
('payments.refund', 'Process Refunds', 'Financials', 'Issue refunds on invoices and payments'),
('invoices.view', 'View Invoices', 'Financials', 'View GST tax invoices and receipts'),
('invoices.create', 'Create Invoices', 'Financials', 'Generate GST tax invoices'),
('expenses.view', 'View Expenses', 'Financials', 'View gym expenditure records'),
('expenses.manage', 'Manage Expenses', 'Financials', 'Add and edit expense entries'),
('trainers.view', 'View Trainers', 'Trainers', 'View trainer roster and assignments'),
('trainers.manage', 'Manage Trainers', 'Trainers', 'Add trainers and configure commissions/salaries'),
('workouts.view', 'View Workouts', 'Fitness', 'View workout routines and exercises'),
('workouts.manage', 'Manage Workouts', 'Fitness', 'Create exercise routines and workout plans'),
('diets.view', 'View Diets', 'Fitness', 'View meal plans and nutrition schedules'),
('diets.manage', 'Manage Diets', 'Fitness', 'Create nutrition charts and assign meals'),
('measurements.manage', 'Manage Measurements', 'Fitness', 'Record body metrics and progress photos'),
('leads.view', 'View Leads', 'CRM', 'View inquiry pipeline and prospect details'),
('leads.manage', 'Manage Leads', 'CRM', 'Create, update, and convert leads to members'),
('trials.manage', 'Manage Trials', 'CRM', 'Schedule and track trial sessions'),
('reports.view', 'View Operational Reports', 'Reports', 'Access member, attendance, and trainer reports'),
('reports.financial', 'View Financial Reports', 'Reports', 'Access revenue, GST, and collection reports'),
('reports.export', 'Export Reports', 'Reports', 'Export reports to Excel/PDF'),
('branches.view', 'View Branches', 'Administration', 'View branch locations and details'),
('branches.manage', 'Manage Branches', 'Administration', 'Create and configure branches'),
('users.view', 'View Staff Users', 'Administration', 'View system user accounts'),
('users.manage', 'Manage Staff Users', 'Administration', 'Invite, configure, and manage staff accounts'),
('settings.manage', 'Manage Gym Settings', 'Administration', 'Configure gym profile, tax rates, and branding'),
('audit.view', 'View Audit Logs', 'Administration', 'Inspect immutable system security and activity logs'),
('platform.manage', 'Platform Management', 'Platform', 'Super Admin master switch for platform features')
ON CONFLICT (id) DO NOTHING;

-- 3. ROLE-PERMISSION MAPPINGS (GYM_OWNER gets all business permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'GYM_OWNER', id FROM permissions WHERE id != 'platform.manage'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'SUPER_ADMIN', id FROM permissions
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'RECEPTIONIST', id FROM permissions WHERE id IN (
  'members.view', 'members.create', 'members.update',
  'memberships.view', 'memberships.create', 'memberships.freeze',
  'attendance.view', 'attendance.mark',
  'payments.view', 'payments.create',
  'invoices.view', 'invoices.create',
  'leads.view', 'leads.manage', 'trials.manage', 'trainers.view'
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'TRAINER', id FROM permissions WHERE id IN (
  'members.view', 'attendance.view', 'attendance.mark',
  'workouts.view', 'workouts.manage',
  'diets.view', 'diets.manage',
  'measurements.manage'
) ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'ACCOUNTANT', id FROM permissions WHERE id IN (
  'members.view', 'memberships.view',
  'payments.view', 'payments.create', 'payments.refund',
  'invoices.view', 'invoices.create',
  'expenses.view', 'expenses.manage',
  'reports.view', 'reports.financial', 'reports.export'
) ON CONFLICT DO NOTHING;

-- 4. SAAS SUBSCRIPTION PLANS
INSERT INTO subscription_plans (id, name, price_per_month, max_members, max_branches, max_staff, features) VALUES
('STARTER', 'Starter Gym', 1999.00, 300, 1, 3, '{"whatsapp": false, "multi_branch": false, "diet_plans": true, "offline_sync": true}'),
('BUSINESS', 'Business Fitness', 4999.00, 1500, 3, 15, '{"whatsapp": true, "multi_branch": true, "diet_plans": true, "offline_sync": true, "advanced_reports": true}'),
('ENTERPRISE', 'Enterprise Chain', 9999.00, 10000, 15, 100, '{"whatsapp": true, "multi_branch": true, "diet_plans": true, "offline_sync": true, "advanced_reports": true, "api_access": true}')
ON CONFLICT (id) DO NOTHING;

-- 5. DEMO ORGANISATION (IronPulse Fitness Club)
INSERT INTO organizations (
    id, name, slug, legal_name, gstin, pan, phone, email,
    address, city, state, state_code, pincode, currency, timezone, invoice_prefix
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'IronPulse Fitness Club',
    'ironpulse',
    'IronPulse Fitness & Wellness LLP',
    '27AAACI1234F1Z5',
    'AAACI1234F',
    '+919822012345',
    'contact@ironpulse.in',
    'Plot 45, Tarabai Park, Opp Circuit House',
    'Kolhapur',
    'Maharashtra',
    '27',
    '416003',
    'INR',
    'Asia/Kolkata',
    'INV-IP'
) ON CONFLICT (id) DO NOTHING;

-- 6. DEMO BRANCHES
INSERT INTO branches (id, organization_id, name, code, phone, email, address, city, state, state_code, pincode) VALUES
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Kolhapur Central Branch', 'KOP-01', '+919822012345', 'kolhapur@ironpulse.in', 'Plot 45, Tarabai Park', 'Kolhapur', 'Maharashtra', '27', '416003'),
('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Pune Kothrud Branch', 'PUN-01', '+919822099999', 'pune@ironpulse.in', 'Mayur Colony, Kothrud', 'Pune', 'Maharashtra', '27', '411038')
ON CONFLICT (id) DO NOTHING;

-- 7. MEMBERSHIP PLANS (Indian Gym Market Standards with 18% GST)
INSERT INTO membership_plans (id, organization_id, branch_id, name, duration_days, price, tax_rate, is_tax_inclusive, description) VALUES
('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', NULL, '1 Month Strength & Cardio', 30, 2500.00, 18.00, TRUE, 'Full gym access, cardio machines & weight training for 30 days'),
('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', NULL, '3 Months Transformation Plan', 90, 6500.00, 18.00, TRUE, 'Quarterly plan including 1 complimentary fitness assessment and trainer consultation'),
('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', NULL, '6 Months Pro Fitness', 180, 11000.00, 18.00, TRUE, 'Half-yearly plan with 15 days freeze allowance and steam bath access'),
('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', NULL, '12 Months Annual Elite Pass', 365, 18000.00, 18.00, TRUE, 'Best value annual pass with 30 days freeze, 2 guest passes/month & locker priority')
ON CONFLICT (id) DO NOTHING;

-- 8. EXPENSE CATEGORIES
INSERT INTO expense_categories (id, organization_id, name, description) VALUES
('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'Rent & Premises', 'Facility rent and property maintenance'),
('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', 'Electricity & Utilities', 'Commercial power bills, generator diesel & water'),
('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', 'Staff Salaries', 'Trainer salaries, front-desk staff, cleaners'),
('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000001', 'Equipment & Maintenance', 'Weights, cable replacement, machine servicing'),
('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000001', 'Marketing & Social Media', 'Local hoarding ads, Meta ads, flyers'),
('00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000001', 'Housekeeping & Supplies', 'Sanitizers, floor cleaners, towels, RO water')
ON CONFLICT (id) DO NOTHING;

-- 9. EXERCISE LIBRARY (BUILT-IN)
INSERT INTO exercises (name, category, muscle_group, equipment, difficulty, instructions) VALUES
('Flat Barbell Bench Press', 'STRENGTH', 'CHEST', 'BARBELL', 'INTERMEDIATE', 'Lie flat on bench, grip barbell slightly wider than shoulder width, lower bar to mid-chest, press up explosively.'),
('Incline Dumbbell Press', 'STRENGTH', 'CHEST', 'DUMBBELL', 'INTERMEDIATE', 'Set bench to 30-45 degrees, press dumbbells upward rotating wrists slightly at the top.'),
('Barbell Back Squat', 'STRENGTH', 'LEGS', 'BARBELL', 'ADVANCED', 'Bar across upper traps, feet shoulder-width, squat down until hips are below knees, drive up through heels.'),
('Romanian Deadlift', 'STRENGTH', 'LEGS', 'BARBELL', 'INTERMEDIATE', 'Hinge at the hips, keeping back flat and slight bend in knees, lower bar along shins, squeeze glutes to return.'),
('Lat Pulldown', 'STRENGTH', 'BACK', 'MACHINE', 'BEGINNER', 'Grip wide bar, sit upright, pull bar down towards upper chest squeezing shoulder blades together.'),
('Seated Cable Row', 'STRENGTH', 'BACK', 'MACHINE', 'BEGINNER', 'Sit with knees slightly bent, pull handle to lower abdomen while keeping spine neutral.'),
('Overhead Barbell Military Press', 'STRENGTH', 'SHOULDERS', 'BARBELL', 'ADVANCED', 'Stand tall, press barbell directly overhead locking out elbows, core braced.'),
('Dumbbell Lateral Raise', 'STRENGTH', 'SHOULDERS', 'DUMBBELL', 'BEGINNER', 'Raise dumbbells out to sides until arms are parallel to floor, controlling the eccentric descent.'),
('Standing Barbell Bicep Curl', 'STRENGTH', 'ARMS', 'BARBELL', 'BEGINNER', 'Keep elbows pinned to your sides, curl barbell up towards shoulders, squeeze biceps at peak.'),
('Triceps Rope Pushdown', 'STRENGTH', 'ARMS', 'MACHINE', 'BEGINNER', 'Attach rope to high cable pulley, push down extending elbows fully, flare rope slightly at bottom.'),
('Plank Hold', 'STRENGTH', 'CORE', 'BODYWEIGHT', 'BEGINNER', 'Maintain forearm plank position with straight alignment from head to heels, glutes and abs squeezed tight.'),
('HIIT Treadmill Sprints', 'CARDIO', 'LEGS', 'MACHINE', 'INTERMEDIATE', 'Alternate 30 seconds sprint at 14 km/h with 45 seconds slow walking recovery for 15 minutes.')
ON CONFLICT DO NOTHING;
