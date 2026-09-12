-- ==============================================================================
-- GYMCARE CRM - Multi-Tenant SaaS Architecture Migration 005
-- Leads CRM, Trials, Notifications Engine, Feature Flags, SaaS Billing & Realtime
-- ==============================================================================

-- ==============================================================================
-- 1. LEADS CRM & FOLLOW-UPS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    source VARCHAR(50) DEFAULT 'WALK_IN', -- 'INSTAGRAM', 'GOOGLE', 'WALK_IN', 'REFERRAL'
    interested_plan_id UUID REFERENCES membership_plans(id) ON DELETE SET NULL,
    assigned_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'FOLLOW_UP', 'TRIAL', 'CONVERTED', 'LOST')),
    expected_joining_date DATE,
    notes TEXT,
    converted_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_leads_timestamp
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE INDEX IF NOT EXISTS idx_leads_org_status ON leads(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_mobile ON leads(organization_id, mobile);

CREATE TABLE IF NOT EXISTS lead_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED')),
    notes TEXT,
    conducted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 2. TRIALS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS trials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    assigned_trainer_id UUID REFERENCES trainers(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'EXPIRED', 'CONVERTED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. NOTIFICATIONS ENGINE & LOGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    channel VARCHAR(30) NOT NULL CHECK (channel IN ('WHATSAPP', 'SMS', 'EMAIL', 'PUSH')),
    event_type VARCHAR(50) NOT NULL, -- 'MEMBERSHIP_EXPIRING', 'PAYMENT_RECEIPT', 'WELCOME', etc.
    template_body TEXT NOT NULL,
    variables JSONB, -- list of supported placeholder keys
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(30) NOT NULL DEFAULT 'SYSTEM', -- 'PAYMENT', 'MEMBERSHIP', 'ATTENDANCE', 'LEAD', 'SYSTEM'
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    channel VARCHAR(30) NOT NULL,
    recipient VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'SENT', -- 'PENDING', 'SENT', 'FAILED'
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. SAAS FEATURE FLAGS & PLATFORM SUBSCRIPTIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id VARCHAR(50) PRIMARY KEY, -- 'STARTER', 'BUSINESS', 'ENTERPRISE'
    name VARCHAR(100) NOT NULL,
    price_per_month NUMERIC(12, 2) NOT NULL,
    max_members INTEGER NOT NULL,
    max_branches INTEGER NOT NULL,
    max_staff INTEGER NOT NULL,
    features JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED')),
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feature_flags (
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    flag_key VARCHAR(50) NOT NULL, -- 'inventory_enabled', 'diet_module_enabled', etc.
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (organization_id, flag_key)
);

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY leads_select ON leads FOR SELECT USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY leads_write ON leads FOR ALL USING ((organization_id = get_current_user_tenant_id() AND has_permission('leads.manage')) OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY lead_followups_all ON lead_followups FOR ALL USING (
    EXISTS (SELECT 1 FROM leads l WHERE l.id = lead_followups.lead_id AND (l.organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role'))
);

CREATE POLICY trials_all ON trials FOR ALL USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY notifications_select ON notifications FOR SELECT USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY notifications_write ON notifications FOR ALL USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY notif_logs_all ON notification_logs FOR ALL USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY subscriptions_all ON subscriptions FOR ALL USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY feature_flags_all ON feature_flags FOR ALL USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');

-- ==============================================================================
-- 6. SUPABASE REALTIME CONFIGURATION
-- ==============================================================================
-- Enable Realtime publication for operational tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE attendance, members, memberships, payments, notifications;
