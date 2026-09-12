-- ==============================================================================
-- GYMCARE CRM - Multi-Tenant SaaS Architecture Migration 002
-- Members, Documents, Membership Plans, Memberships, Freezes & Attendance
-- ==============================================================================

-- ==============================================================================
-- 1. MEMBERSHIP PLANS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00 CHECK (tax_rate >= 0),
    is_tax_inclusive BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_membership_plans_timestamp
BEFORE UPDATE ON membership_plans
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE INDEX IF NOT EXISTS idx_plans_org ON membership_plans(organization_id, is_active);

-- ==============================================================================
-- 2. MEMBERS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    member_id VARCHAR(50) NOT NULL, -- e.g. MEM-0001
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    dob DATE,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    photo_url TEXT,
    address TEXT,
    city VARCHAR(100),
    pincode VARCHAR(10),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source VARCHAR(50) DEFAULT 'WALK_IN',
    assigned_trainer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXPIRED', 'FREEZED', 'CANCELLED', 'LEAD')),
    qr_token VARCHAR(100) NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
    version INTEGER NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_member_code_per_org UNIQUE(organization_id, member_id),
    CONSTRAINT uq_member_qr_per_org UNIQUE(organization_id, qr_token)
);

CREATE TRIGGER update_members_timestamp
BEFORE UPDATE ON members
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE INDEX IF NOT EXISTS idx_members_org_status ON members(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_org_branch ON members(organization_id, branch_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_mobile ON members(organization_id, mobile) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_members_qr ON members(organization_id, qr_token);

-- ==============================================================================
-- 3. MEMBER DOCUMENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS member_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'AADHAAR', 'PAN', 'MEDICAL_CERT', 'PHOTO'
    title VARCHAR(150) NOT NULL,
    storage_path TEXT NOT NULL,
    file_size_bytes INTEGER,
    mime_type VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_docs ON member_documents(member_id);

-- ==============================================================================
-- 4. MEMBERSHIPS (SUBSCRIPTIONS TO PLANS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    plan_id UUID NOT NULL REFERENCES membership_plans(id) ON DELETE RESTRICT,
    plan_name VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    base_price NUMERIC(12, 2) NOT NULL CHECK (base_price >= 0),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'FROZEN', 'CANCELLED', 'PENDING')),
    frozen_days_used INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_dates CHECK (end_date >= start_date)
);

CREATE TRIGGER update_memberships_timestamp
BEFORE UPDATE ON memberships
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE INDEX IF NOT EXISTS idx_memberships_member ON memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_dates ON memberships(organization_id, end_date);

-- ==============================================================================
-- 5. MEMBERSHIP FREEZES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS membership_freezes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_freeze_dates CHECK (end_date >= start_date)
);

-- ==============================================================================
-- 6. ATTENDANCE (FAST HIGH-THROUGHPUT & DUPLICATE-SAFE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    check_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    check_out TIMESTAMPTZ,
    date DATE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE,
    method VARCHAR(20) NOT NULL DEFAULT 'SEARCH' CHECK (method IN ('QR', 'MANUAL', 'SEARCH', 'BIOMETRIC')),
    device_id VARCHAR(100),
    marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_attendance_day UNIQUE (organization_id, member_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_org_date ON attendance(organization_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_branch_date ON attendance(branch_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON attendance(member_id, date DESC);

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_freezes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- MEMBERSHIP PLANS POLICIES
CREATE POLICY plans_select ON membership_plans
    FOR SELECT USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY plans_write ON membership_plans
    FOR ALL USING ((organization_id = get_current_user_tenant_id() AND has_permission('plans.manage')) OR auth.jwt() ->> 'role' = 'service_role');

-- MEMBERS POLICIES
CREATE POLICY members_select ON members
    FOR SELECT USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY members_insert ON members
    FOR INSERT WITH CHECK ((organization_id = get_current_user_tenant_id() AND has_permission('members.create')) OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY members_update ON members
    FOR UPDATE USING ((organization_id = get_current_user_tenant_id() AND has_permission('members.update')) OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY members_delete ON members
    FOR DELETE USING ((organization_id = get_current_user_tenant_id() AND has_permission('members.delete')) OR auth.jwt() ->> 'role' = 'service_role');

-- MEMBER DOCUMENTS POLICIES
CREATE POLICY member_docs_all ON member_documents
    FOR ALL USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');

-- MEMBERSHIPS POLICIES
CREATE POLICY memberships_select ON memberships
    FOR SELECT USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY memberships_write ON memberships
    FOR ALL USING ((organization_id = get_current_user_tenant_id() AND has_permission('memberships.create')) OR auth.jwt() ->> 'role' = 'service_role');

-- FREEZES POLICIES
CREATE POLICY freezes_all ON membership_freezes
    FOR ALL USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');

-- ATTENDANCE POLICIES
CREATE POLICY attendance_select ON attendance
    FOR SELECT USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY attendance_insert ON attendance
    FOR INSERT WITH CHECK ((organization_id = get_current_user_tenant_id() AND has_permission('attendance.mark')) OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY attendance_update ON attendance
    FOR UPDATE USING ((organization_id = get_current_user_tenant_id() AND has_permission('attendance.modify')) OR auth.jwt() ->> 'role' = 'service_role');
