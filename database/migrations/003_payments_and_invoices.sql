-- ==============================================================================
-- GYMCARE CRM - Multi-Tenant SaaS Architecture Migration 003
-- GST Invoices, Immutable Payments, Allocations, Refunds, Expenses & Idempotency
-- ==============================================================================

-- ==============================================================================
-- 1. INVOICES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(50) NOT NULL, -- e.g. INV-KOP-2026-0001
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    taxable_amount NUMERIC(12, 2) NOT NULL CHECK (taxable_amount >= 0),
    cgst NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (cgst >= 0),
    sgst NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (sgst >= 0),
    igst NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (igst >= 0),
    total_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_tax >= 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
    balance_due NUMERIC(12, 2) NOT NULL CHECK (balance_due >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'CANCELLED')),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_invoice_num_per_org UNIQUE (organization_id, invoice_number)
);

CREATE TRIGGER update_invoices_timestamp
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON invoices(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_member ON invoices(member_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(organization_id, issue_date DESC);

-- ==============================================================================
-- 2. INVOICE ITEMS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    hsn_sac VARCHAR(20) DEFAULT '999723', -- SAC Code for Gymnasium Services in India
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    taxable_amount NUMERIC(12, 2) NOT NULL CHECK (taxable_amount >= 0),
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00 CHECK (tax_rate >= 0),
    cgst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sgst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    igst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- ==============================================================================
-- 3. PAYMENTS (IMMUTABLE FINANCIAL LEDGER)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    receipt_number VARCHAR(50) NOT NULL, -- e.g. RCP-2026-0001
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'RAZORPAY')),
    transaction_id VARCHAR(100), -- UPI reference / Card Auth / Gateway Ref
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PAID' CHECK (status IN ('PENDING', 'PAID', 'PARTIAL', 'FAILED', 'REFUNDED', 'CANCELLED')),
    collected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_receipt_num_per_org UNIQUE (organization_id, receipt_number)
);

-- Financial Immutability Rule: No permanent DELETE on payments
CREATE OR REPLACE FUNCTION prevent_payment_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Financial records in payments are immutable and cannot be deleted. Issue a refund record instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_payment_delete
BEFORE DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION prevent_payment_delete();

CREATE INDEX IF NOT EXISTS idx_payments_org_date ON payments(organization_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id);

-- ==============================================================================
-- 4. REFUNDS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    transaction_id VARCHAR(100),
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. EXPENSES & CATEGORIES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_exp_cat_org UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
    title VARCHAR(150) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'CASH',
    receipt_attachment_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_org_date ON expenses(organization_id, expense_date DESC);

-- ==============================================================================
-- 6. IDEMPOTENCY KEYS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    request_path VARCHAR(255) NOT NULL,
    response_code INTEGER NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_idempotency_key UNIQUE (organization_id, key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency ON idempotency_keys(organization_id, key);

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- INVOICES POLICIES
CREATE POLICY invoices_select ON invoices
    FOR SELECT USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY invoices_write ON invoices
    FOR ALL USING ((organization_id = get_current_user_tenant_id() AND has_permission('invoices.create')) OR auth.jwt() ->> 'role' = 'service_role');

-- INVOICE ITEMS POLICIES
CREATE POLICY invoice_items_select ON invoice_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM invoices i 
            WHERE i.id = invoice_items.invoice_id 
              AND (i.organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role')
        )
    );

CREATE POLICY invoice_items_write ON invoice_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM invoices i 
            WHERE i.id = invoice_items.invoice_id 
              AND ((i.organization_id = get_current_user_tenant_id() AND has_permission('invoices.create')) OR auth.jwt() ->> 'role' = 'service_role')
        )
    );

-- PAYMENTS POLICIES
CREATE POLICY payments_select ON payments
    FOR SELECT USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY payments_insert ON payments
    FOR INSERT WITH CHECK ((organization_id = get_current_user_tenant_id() AND has_permission('payments.create')) OR auth.jwt() ->> 'role' = 'service_role');

-- REFUNDS POLICIES
CREATE POLICY refunds_all ON refunds
    FOR ALL USING ((organization_id = get_current_user_tenant_id() AND has_permission('payments.refund')) OR auth.jwt() ->> 'role' = 'service_role');

-- EXPENSES POLICIES
CREATE POLICY expenses_select ON expenses
    FOR SELECT USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY expenses_write ON expenses
    FOR ALL USING ((organization_id = get_current_user_tenant_id() AND has_permission('expenses.manage')) OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY exp_cat_all ON expense_categories
    FOR ALL USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');

-- IDEMPOTENCY POLICIES
CREATE POLICY idempotency_all ON idempotency_keys
    FOR ALL USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');
