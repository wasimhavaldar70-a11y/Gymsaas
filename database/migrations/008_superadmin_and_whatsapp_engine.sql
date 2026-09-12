-- ==============================================================================
-- GYMCARE CRM - Multi-Tenant SaaS Architecture Migration 008
-- Super Admin Platform Control, Tenant Sequence Codes, WhatsApp Message Engine & Idempotency
-- ==============================================================================

-- 1. ADD STATUS TO ORGANIZATIONS (IF NOT PRESENT)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'status'
    ) THEN
        ALTER TABLE organizations ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' 
            CHECK (status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' AND column_name = 'org_code'
    ) THEN
        ALTER TABLE organizations ADD COLUMN org_code VARCHAR(20) UNIQUE;
    END IF;
END $$;

-- 2. CREATE IDEMPOTENCY KEYS TABLE (PREVENTS DUPLICATE WHATSAPP REMINDERS / PAYMENTS)
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    response_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    CONSTRAINT uq_idempotency_key_per_org UNIQUE (organization_id, key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_lookup ON idempotency_keys(organization_id, key);

-- 3. CREATE WHATSAPP MESSAGE LOGS TABLE
CREATE TABLE IF NOT EXISTS whatsapp_message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
    message_type VARCHAR(50) NOT NULL, -- 'PAYMENT_RECEIPT', 'PAYMENT_DUE', 'EXPIRY_REMINDER', 'BIRTHDAY', 'CUSTOM'
    recipient VARCHAR(30) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'META_CLOUD', -- 'META_CLOUD', 'TWILIO', 'MOCK'
    provider_message_id VARCHAR(150),
    message_body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED')),
    failure_reason TEXT,
    idempotency_key VARCHAR(255),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_org_status ON whatsapp_message_logs(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_member ON whatsapp_message_logs(organization_id, member_id);

-- 4. ATOMIC TENANT CREATION STORED PROCEDURE (FOR SUPER ADMIN WORKFLOW)
CREATE OR REPLACE FUNCTION rpc_create_gym_tenant(
    p_name VARCHAR(150),
    p_slug VARCHAR(100),
    p_phone VARCHAR(20),
    p_email VARCHAR(150),
    p_owner_first_name VARCHAR(100),
    p_owner_last_name VARCHAR(100),
    p_owner_mobile VARCHAR(20),
    p_owner_email VARCHAR(150),
    p_plan_id VARCHAR(50),
    p_city VARCHAR(100) DEFAULT 'Kolhapur',
    p_state VARCHAR(100) DEFAULT 'Maharashtra',
    p_state_code VARCHAR(2) DEFAULT '27',
    p_gstin VARCHAR(15) DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_pincode VARCHAR(10) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_org_id UUID;
    v_branch_id UUID;
    v_owner_user_id UUID;
    v_org_code VARCHAR(20);
    v_owner_code VARCHAR(20);
    v_seq_num BIGINT;
    v_subscription_id UUID;
BEGIN
    -- 1. Generate collision-free Organization Code GYM-XXXXXX
    INSERT INTO organization_sequences (organization_id, sequence_type, current_value)
    VALUES ('00000000-0000-0000-0000-000000000000', 'GLOBAL_GYM', 1)
    ON CONFLICT (organization_id, sequence_type)
    DO UPDATE SET current_value = organization_sequences.current_value + 1
    RETURNING current_value INTO v_seq_num;

    v_org_code := 'GYM-' || LPAD(v_seq_num::TEXT, 6, '0');

    -- 2. Generate Owner User Code OWN-XXXXXX
    INSERT INTO organization_sequences (organization_id, sequence_type, current_value)
    VALUES ('00000000-0000-0000-0000-000000000000', 'GLOBAL_OWNER', 1)
    ON CONFLICT (organization_id, sequence_type)
    DO UPDATE SET current_value = organization_sequences.current_value + 1
    RETURNING current_value INTO v_seq_num;

    v_owner_code := 'OWN-' || LPAD(v_seq_num::TEXT, 6, '0');

    -- 3. Create Organization Record
    INSERT INTO organizations (
        name, slug, org_code, legal_name, phone, email, address, city, state, state_code, pincode, gstin, status, is_active
    ) VALUES (
        p_name, p_slug, v_org_code, p_name, p_phone, p_email, p_address, p_city, p_state, p_state_code, p_pincode, p_gstin, 'ACTIVE', TRUE
    ) RETURNING id INTO v_org_id;

    -- 4. Create Main Branch
    INSERT INTO branches (
        organization_id, name, code, phone, email, address, city, state, state_code, pincode, is_active
    ) VALUES (
        v_org_id, p_name || ' (Main Branch)', 'MAIN-01', p_phone, p_email, p_address, p_city, p_state, p_state_code, p_pincode, TRUE
    ) RETURNING id INTO v_branch_id;

    -- 5. Create Gym Owner User Profile
    v_owner_user_id := gen_random_uuid();
    INSERT INTO users (
        id, organization_id, branch_id, email, first_name, last_name, mobile, role, is_active
    ) VALUES (
        v_owner_user_id, v_org_id, v_branch_id, p_owner_email, p_owner_first_name, p_owner_last_name, p_owner_mobile, 'GYM_OWNER', TRUE
    );

    -- 6. Assign SaaS Subscription Plan
    INSERT INTO subscriptions (
        organization_id, plan_id, status, start_date, end_date
    ) VALUES (
        v_org_id, COALESCE(p_plan_id, 'BUSINESS'), 'ACTIVE', NOW(), NOW() + INTERVAL '365 days'
    ) RETURNING id INTO v_subscription_id;

    -- 7. Seed Default Notification Templates for the new tenant
    INSERT INTO notification_templates (organization_id, channel, event_type, template_body, variables, is_active)
    VALUES 
    (
        v_org_id, 'WHATSAPP', 'PAYMENT_RECEIPT', 
        'Hello {{member_name}}, we have received your payment of ₹{{amount}} for your gym membership. Payment Method: {{payment_method}}. Receipt No: {{receipt_number}}. Date: {{date}}. Thank you for choosing {{gym_name}}!', 
        '["member_name", "amount", "payment_method", "receipt_number", "date", "gym_name"]'::jsonb, TRUE
    ),
    (
        v_org_id, 'WHATSAPP', 'PAYMENT_DUE', 
        'Hello {{member_name}}, your gym membership payment of ₹{{amount}} is pending. Due Date: {{due_date}}. Please complete your payment to keep your membership active. Thank you, {{gym_name}}.', 
        '["member_name", "amount", "due_date", "gym_name"]'::jsonb, TRUE
    ),
    (
        v_org_id, 'WHATSAPP', 'EXPIRY_REMINDER', 
        'Hello {{member_name}}, your gym membership expires on {{expiry_date}}. Renew today to continue your workouts without interruption! - {{gym_name}}', 
        '["member_name", "expiry_date", "gym_name"]'::jsonb, TRUE
    );

    -- 8. Write Audit Log
    INSERT INTO audit_logs (
        organization_id, branch_id, actor_id, action, entity_type, entity_id, new_data
    ) VALUES (
        v_org_id, v_branch_id, v_owner_user_id, 'TENANT_PROVISIONED', 'ORGANIZATION', v_org_id::TEXT,
        jsonb_build_object(
            'org_code', v_org_code,
            'owner_code', v_owner_code,
            'name', p_name,
            'plan_id', p_plan_id
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'organization_id', v_org_id,
        'org_code', v_org_code,
        'branch_id', v_branch_id,
        'owner_user_id', v_owner_user_id,
        'owner_code', v_owner_code,
        'subscription_id', v_subscription_id
    );
END;
$$;

-- 5. ROW LEVEL SECURITY (RLS) FOR NEW TABLES
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY idempotency_keys_policy ON idempotency_keys
    FOR ALL USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY whatsapp_logs_select_policy ON whatsapp_message_logs
    FOR SELECT USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY whatsapp_logs_write_policy ON whatsapp_message_logs
    FOR ALL USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');
