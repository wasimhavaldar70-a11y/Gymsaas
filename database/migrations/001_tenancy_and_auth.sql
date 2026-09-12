-- ==============================================================================
-- GYMCARE CRM - Multi-Tenant SaaS Architecture Migration 001
-- Tenancy, Organizations, Branches, RBAC, Users, Audit Logging & RLS
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. UTILITY FUNCTIONS
-- ==============================================================================

-- Trigger to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 2. ORGANIZATIONS (TENANTS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    legal_name VARCHAR(200),
    gstin VARCHAR(15),
    pan VARCHAR(10),
    logo_url TEXT,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100) DEFAULT 'Maharashtra',
    state_code VARCHAR(2) DEFAULT '27',
    pincode VARCHAR(10),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    currency_symbol VARCHAR(5) NOT NULL DEFAULT '₹',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    invoice_prefix VARCHAR(10) NOT NULL DEFAULT 'INV',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_organizations_timestamp
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- ==============================================================================
-- 3. BRANCHES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(150),
    address TEXT,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL DEFAULT 'Maharashtra',
    state_code VARCHAR(2) NOT NULL DEFAULT '27',
    pincode VARCHAR(10),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_branch_code_per_org UNIQUE(organization_id, code)
);

CREATE TRIGGER update_branches_timestamp
BEFORE UPDATE ON branches
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE INDEX IF NOT EXISTS idx_branches_org_id ON branches(organization_id);

-- ==============================================================================
-- 4. ROLES & PERMISSIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id VARCHAR(50) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(100) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ==============================================================================
-- 5. USERS (PROFILES LINKED TO AUTH.USERS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY, -- references auth.users(id) in Supabase
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    email VARCHAR(150) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    photo_url TEXT,
    role VARCHAR(50) NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_org_email UNIQUE(organization_id, email)
);

CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ==============================================================================
-- 6. AUDIT LOGS (IMMUTABLE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ==============================================================================
-- 7. DEVICES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    device_id VARCHAR(100) NOT NULL,
    device_name VARCHAR(150) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_device_per_org UNIQUE(organization_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_devices_org ON devices(organization_id);

-- ==============================================================================
-- 8. SETTINGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_setting_key_per_org UNIQUE(organization_id, category, key)
);

-- ==============================================================================
-- 9. RLS SECURITY HELPER FUNCTIONS
-- ==============================================================================

-- Get authenticated user's organization ID
CREATE OR REPLACE FUNCTION get_current_user_tenant_id()
RETURNS UUID AS $$
    SELECT organization_id FROM users WHERE id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get authenticated user's branch ID
CREATE OR REPLACE FUNCTION get_current_user_branch_id()
RETURNS UUID AS $$
    SELECT branch_id FROM users WHERE id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if current authenticated user has a specific permission
CREATE OR REPLACE FUNCTION has_permission(perm_id TEXT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM users u
        JOIN role_permissions rp ON rp.role_id = u.role
        WHERE u.id = auth.uid()
          AND u.is_active = TRUE
          AND (rp.permission_id = perm_id OR u.role = 'SUPER_ADMIN')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tenant tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ORGANIZATIONS POLICIES
CREATE POLICY org_read_policy ON organizations
    FOR SELECT
    USING (id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY org_update_policy ON organizations
    FOR UPDATE
    USING ((id = get_current_user_tenant_id() AND has_permission('settings.manage')) OR auth.jwt() ->> 'role' = 'service_role');

-- BRANCHES POLICIES
CREATE POLICY branches_read_policy ON branches
    FOR SELECT
    USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY branches_write_policy ON branches
    FOR ALL
    USING ((organization_id = get_current_user_tenant_id() AND has_permission('branches.manage')) OR auth.jwt() ->> 'role' = 'service_role');

-- USERS POLICIES
CREATE POLICY users_read_policy ON users
    FOR SELECT
    USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY users_write_policy ON users
    FOR ALL
    USING ((organization_id = get_current_user_tenant_id() AND has_permission('users.manage')) OR auth.jwt() ->> 'role' = 'service_role');

-- AUDIT LOGS POLICIES (Immutable: SELECT only for authorized staff, write via service/trigger)
CREATE POLICY audit_logs_read_policy ON audit_logs
    FOR SELECT
    USING ((organization_id = get_current_user_tenant_id() AND has_permission('audit.view')) OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY audit_logs_insert_policy ON audit_logs
    FOR INSERT
    WITH CHECK (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');

-- DEVICES POLICIES
CREATE POLICY devices_all_policy ON devices
    FOR ALL
    USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');

-- SETTINGS POLICIES
CREATE POLICY settings_read_policy ON settings
    FOR SELECT
    USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY settings_write_policy ON settings
    FOR ALL
    USING ((organization_id = get_current_user_tenant_id() AND has_permission('settings.manage')) OR auth.jwt() ->> 'role' = 'service_role');
