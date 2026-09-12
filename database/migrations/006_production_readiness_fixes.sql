-- ==============================================================================
-- GYMCARE CRM - Multi-Tenant SaaS Architecture Migration 006
-- Production Readiness Fixes: Atomic Sequences, Transactional Financial RPCs,
-- Cross-Tenant Integrity & Storage Infrastructure
-- ==============================================================================

-- ==============================================================================
-- 1. ATOMIC SEQUENCE COUNTERS (Prevents Concurrent ID Collisions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS organization_sequences (
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    sequence_type VARCHAR(50) NOT NULL, -- 'MEMBER', 'INVOICE', 'RECEIPT'
    current_value BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (organization_id, sequence_type)
);

CREATE OR REPLACE FUNCTION get_next_org_sequence(p_org_id UUID, p_type TEXT)
RETURNS BIGINT AS $$
DECLARE
    v_val BIGINT;
BEGIN
    INSERT INTO organization_sequences (organization_id, sequence_type, current_value, updated_at)
    VALUES (p_org_id, p_type, 1, NOW())
    ON CONFLICT (organization_id, sequence_type)
    DO UPDATE SET current_value = organization_sequences.current_value + 1, updated_at = NOW()
    RETURNING current_value INTO v_val;

    RETURN v_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

ALTER TABLE organization_sequences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organization_sequences' AND policyname = 'org_seq_policy'
    ) THEN
        CREATE POLICY org_seq_policy ON organization_sequences
            FOR ALL USING (organization_id = get_current_user_tenant_id() OR auth.jwt() ->> 'role' = 'service_role');
    END IF;
END $$;

-- ==============================================================================
-- 2. ATOMIC FINANCIAL STORED PROCEDURES (Prevents Split Transactions)
-- ==============================================================================

-- Atomic Membership Assignment with GST Invoice & Payment
CREATE OR REPLACE FUNCTION rpc_assign_membership_with_invoice(
    p_org_id UUID,
    p_branch_id UUID,
    p_member_id UUID,
    p_plan_id UUID,
    p_start_date DATE,
    p_discount NUMERIC,
    p_amount_paid NUMERIC,
    p_payment_method VARCHAR,
    p_transaction_id VARCHAR,
    p_notes TEXT,
    p_actor_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_plan RECORD;
    v_member RECORD;
    v_org RECORD;
    v_end_date DATE;
    v_taxable NUMERIC(12, 2);
    v_cgst NUMERIC(12, 2) := 0.00;
    v_sgst NUMERIC(12, 2) := 0.00;
    v_igst NUMERIC(12, 2) := 0.00;
    v_total_tax NUMERIC(12, 2);
    v_total_amount NUMERIC(12, 2);
    v_final_price NUMERIC(12, 2);
    v_inv_seq BIGINT;
    v_pay_seq BIGINT;
    v_year TEXT;
    v_inv_number TEXT;
    v_rcp_number TEXT;
    v_inv_status VARCHAR(30);
    v_balance NUMERIC(12, 2);
    v_invoice_id UUID;
    v_membership_id UUID;
    v_payment_id UUID := NULL;
    v_result JSONB;
BEGIN
    -- 1. Validate Entities
    SELECT * INTO v_org FROM organizations WHERE id = p_org_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Organization % not found', p_org_id;
    END IF;

    SELECT * INTO v_plan FROM membership_plans WHERE id = p_plan_id AND organization_id = p_org_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Membership plan % not found for organization', p_plan_id;
    END IF;

    SELECT * INTO v_member FROM members WHERE id = p_member_id AND organization_id = p_org_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Member % not found for organization', p_member_id;
    END IF;

    -- 2. Compute Dates
    v_end_date := p_start_date + (v_plan.duration_days || ' days')::INTERVAL;

    -- 3. Compute Indian GST (Intra-state CGST+SGST default)
    v_final_price := GREATEST(0.00, v_plan.price - COALESCE(p_discount, 0.00));
    IF v_plan.is_tax_inclusive THEN
        v_taxable := ROUND((v_final_price / (1.00 + (v_plan.tax_rate / 100.00))), 2);
        v_total_tax := v_final_price - v_taxable;
    ELSE
        v_taxable := v_final_price;
        v_total_tax := ROUND((v_taxable * (v_plan.tax_rate / 100.00)), 2);
    END IF;

    v_total_amount := v_taxable + v_total_tax;
    v_cgst := ROUND((v_total_tax / 2.00), 2);
    v_sgst := v_total_tax - v_cgst;

    -- 4. Generate Atomic Invoice Number
    v_inv_seq := get_next_org_sequence(p_org_id, 'INVOICE');
    v_year := TO_CHAR(p_start_date, 'YYYY');
    v_inv_number := COALESCE(v_org.invoice_prefix, 'INV') || '-' || v_year || '-' || LPAD(v_inv_seq::TEXT, 4, '0');

    -- 5. Determine Invoice Balance & Status
    v_balance := GREATEST(0.00, v_total_amount - COALESCE(p_amount_paid, 0.00));
    IF COALESCE(p_amount_paid, 0.00) >= v_total_amount THEN
        v_inv_status := 'PAID';
    ELSIF COALESCE(p_amount_paid, 0.00) > 0 THEN
        v_inv_status := 'PARTIALLY_PAID';
    ELSE
        v_inv_status := 'ISSUED';
    END IF;

    -- 6. Insert Invoice
    INSERT INTO invoices (
        organization_id, branch_id, invoice_number, member_id, subtotal, discount,
        taxable_amount, cgst, sgst, igst, total_tax, total_amount, amount_paid,
        balance_due, status, issue_date, due_date, notes, created_by
    ) VALUES (
        p_org_id, p_branch_id, v_inv_number, p_member_id, v_plan.price, COALESCE(p_discount, 0.00),
        v_taxable, v_cgst, v_sgst, v_igst, v_total_tax, v_total_amount, COALESCE(p_amount_paid, 0.00),
        v_balance, v_inv_status, p_start_date, p_start_date, COALESCE(p_notes, 'Membership: ' || v_plan.name), p_actor_id
    ) RETURNING id INTO v_invoice_id;

    -- 7. Insert Invoice Item
    INSERT INTO invoice_items (
        invoice_id, description, hsn_sac, quantity, unit_price, discount,
        taxable_amount, tax_rate, cgst, sgst, igst, total_amount
    ) VALUES (
        v_invoice_id, v_plan.name || ' (' || v_plan.duration_days || ' Days)', '999723',
        1, v_plan.price, COALESCE(p_discount, 0.00), v_taxable, v_plan.tax_rate,
        v_cgst, v_sgst, v_igst, v_total_amount
    );

    -- 8. Insert Membership Subscription
    INSERT INTO memberships (
        organization_id, branch_id, member_id, plan_id, plan_name, start_date, end_date,
        base_price, discount_amount, tax_amount, total_amount, status
    ) VALUES (
        p_org_id, p_branch_id, p_member_id, v_plan.id, v_plan.name, p_start_date, v_end_date,
        v_taxable, COALESCE(p_discount, 0.00), v_total_tax, v_total_amount, 'ACTIVE'
    ) RETURNING id INTO v_membership_id;

    -- 9. Insert Payment Record (if amount paid > 0)
    IF COALESCE(p_amount_paid, 0.00) > 0 THEN
        v_pay_seq := get_next_org_sequence(p_org_id, 'RECEIPT');
        v_rcp_number := 'RCP-' || v_year || '-' || LPAD(v_pay_seq::TEXT, 4, '0');

        INSERT INTO payments (
            organization_id, branch_id, receipt_number, invoice_id, member_id,
            amount, payment_method, transaction_id, notes, status, collected_by
        ) VALUES (
            p_org_id, p_branch_id, v_rcp_number, v_invoice_id, p_member_id,
            p_amount_paid, p_payment_method, p_transaction_id, p_notes, 'PAID', p_actor_id
        ) RETURNING id INTO v_payment_id;
    END IF;

    -- 10. Update Member Status
    UPDATE members SET status = 'ACTIVE', updated_at = NOW() WHERE id = p_member_id AND organization_id = p_org_id;

    v_result := jsonb_build_object(
        'invoice_id', v_invoice_id,
        'invoice_number', v_inv_number,
        'membership_id', v_membership_id,
        'payment_id', v_payment_id,
        'total_amount', v_total_amount,
        'amount_paid', COALESCE(p_amount_paid, 0.00),
        'balance_due', v_balance,
        'status', v_inv_status
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Atomic Fee Collection with Row Locking & Invoice Rebalancing
CREATE OR REPLACE FUNCTION rpc_collect_payment(
    p_org_id UUID,
    p_branch_id UUID,
    p_invoice_id UUID,
    p_member_id UUID,
    p_amount NUMERIC,
    p_payment_method VARCHAR,
    p_transaction_id VARCHAR,
    p_notes TEXT,
    p_idempotency_key VARCHAR,
    p_actor_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_cached JSONB;
    v_inv RECORD;
    v_pay_seq BIGINT;
    v_year TEXT;
    v_rcp_number TEXT;
    v_payment_id UUID;
    v_new_amount_paid NUMERIC(12, 2);
    v_new_balance NUMERIC(12, 2);
    v_new_status VARCHAR(30);
    v_result JSONB;
BEGIN
    -- 1. Check Idempotency Key
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) != '' THEN
        SELECT response_body INTO v_cached
        FROM idempotency_keys
        WHERE organization_id = p_org_id AND key = p_idempotency_key;

        IF FOUND THEN
            RETURN v_cached;
        END IF;
    END IF;

    -- 2. Lock Invoice Row (Prevents Concurrent Double-Payment)
    SELECT * INTO v_inv
    FROM invoices
    WHERE id = p_invoice_id AND organization_id = p_org_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice % not found for organization', p_invoice_id;
    END IF;

    -- 3. Generate Receipt Number
    v_pay_seq := get_next_org_sequence(p_org_id, 'RECEIPT');
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_rcp_number := 'RCP-' || v_year || '-' || LPAD(v_pay_seq::TEXT, 4, '0');

    -- 4. Insert Payment Record
    INSERT INTO payments (
        organization_id, branch_id, receipt_number, invoice_id, member_id,
        amount, payment_method, transaction_id, notes, status, collected_by
    ) VALUES (
        p_org_id, p_branch_id, v_rcp_number, p_invoice_id, p_member_id,
        p_amount, p_payment_method, p_transaction_id, p_notes, 'PAID', p_actor_id
    ) RETURNING id INTO v_payment_id;

    -- 5. Rebalance Invoice
    v_new_amount_paid := v_inv.amount_paid + p_amount;
    v_new_balance := GREATEST(0.00, v_inv.total_amount - v_new_amount_paid);
    v_new_status := CASE WHEN v_new_balance <= 0 THEN 'PAID' ELSE 'PARTIALLY_PAID' END;

    UPDATE invoices
    SET amount_paid = v_new_amount_paid,
        balance_due = v_new_balance,
        status = v_new_status,
        updated_at = NOW()
    WHERE id = p_invoice_id AND organization_id = p_org_id;

    v_result := jsonb_build_object(
        'payment_id', v_payment_id,
        'receipt_number', v_rcp_number,
        'amount', p_amount,
        'invoice_id', p_invoice_id,
        'invoice_status', v_new_status,
        'balance_remaining', v_new_balance
    );

    -- 6. Cache Idempotency Key
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) != '' THEN
        INSERT INTO idempotency_keys (organization_id, key, request_path, response_code, response_body)
        VALUES (p_org_id, p_idempotency_key, '/api/v1/payments/collect', 201, v_result)
        ON CONFLICT (organization_id, key) DO NOTHING;
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ==============================================================================
-- 3. STORAGE BUCKETS & RLS POLICIES (Documents & Photos)
-- ==============================================================================
DO $$
BEGIN
    -- Check if Supabase storage schema exists
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        -- Create private tenant storage buckets
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES 
            ('tenant-documents', 'tenant-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
            ('member-photos', 'member-photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
        ON CONFLICT (id) DO UPDATE 
        SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

        -- Storage Objects RLS: Tenant Isolation via Folder Path
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'tenant_storage_isolation'
        ) THEN
            CREATE POLICY tenant_storage_isolation ON storage.objects
                FOR ALL USING (
                    bucket_id IN ('tenant-documents', 'member-photos')
                    AND (
                        (storage.foldername(name))[1] = get_current_user_tenant_id()::text
                        OR auth.jwt() ->> 'role' = 'service_role'
                    )
                );
        END IF;
    END IF;
END $$;

-- ==============================================================================
-- 4. REALTIME PUBLICATION SAFETY (Idempotent)
-- ==============================================================================
DO $$
DECLARE
    t TEXT;
    target_tables TEXT[] := ARRAY['attendance', 'members', 'memberships', 'payments', 'notifications'];
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    FOREACH t IN ARRAY target_tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
        END IF;
    END LOOP;
END $$;
