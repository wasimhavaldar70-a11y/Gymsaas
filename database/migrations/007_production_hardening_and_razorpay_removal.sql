-- ==============================================================================
-- GYMCARE CRM - Multi-Tenant SaaS Architecture Migration 007
-- Direct Indian Payment Modes Hardening & Automated Membership Expiration
-- ==============================================================================

-- 1. Enforce Direct Indian Payment Methods on Payments (CASH, UPI, CARD, BANK_TRANSFER, CHEQUE)
DO $$
BEGIN
    -- Drop existing payment_method check constraint if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'payments' AND constraint_name = 'payments_payment_method_check'
    ) THEN
        ALTER TABLE payments DROP CONSTRAINT payments_payment_method_check;
    END IF;

    -- Re-apply updated constraint without RAZORPAY
    ALTER TABLE payments 
    ADD CONSTRAINT payments_payment_method_check 
    CHECK (payment_method IN ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE'));
END $$;

-- 2. Stored Procedure for Automated Daily Membership Expiration
CREATE OR REPLACE FUNCTION rpc_expire_outdated_memberships(p_org_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_expired_count INT := 0;
    v_member_update_count INT := 0;
BEGIN
    -- 1. Mark past memberships as EXPIRED
    WITH updated_memberships AS (
        UPDATE memberships
        SET status = 'EXPIRED', updated_at = NOW()
        WHERE status = 'ACTIVE'
          AND end_date < CURRENT_DATE
          AND (p_org_id IS NULL OR organization_id = p_org_id)
        RETURNING id, member_id, organization_id
    )
    SELECT COUNT(*) INTO v_expired_count FROM updated_memberships;

    -- 2. Update member status to EXPIRED if they have no other ACTIVE memberships
    WITH members_to_expire AS (
        SELECT m.id
        FROM members m
        WHERE m.status = 'ACTIVE'
          AND (p_org_id IS NULL OR m.organization_id = p_org_id)
          AND NOT EXISTS (
              SELECT 1 
              FROM memberships ms 
              WHERE ms.member_id = m.id 
                AND ms.status = 'ACTIVE' 
                AND ms.end_date >= CURRENT_DATE
          )
    ),
    updated_members AS (
        UPDATE members
        SET status = 'EXPIRED', updated_at = NOW()
        WHERE id IN (SELECT id FROM members_to_expire)
        RETURNING id
    )
    SELECT COUNT(*) INTO v_member_update_count FROM updated_members;

    RETURN jsonb_build_object(
        'success', TRUE,
        'expired_memberships', v_expired_count,
        'expired_members', v_member_update_count,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;
