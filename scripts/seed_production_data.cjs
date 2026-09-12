const { Client } = require("pg");
const dotenv = require("dotenv");
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Please configure DIRECT_URL or DATABASE_URL in your environment or .env file");
  process.exit(1);
}

async function seedProductionData() {
  console.log("============================================================");
  console.log("🌱 SEEDING PRODUCTION READY RECORDS TO LIVE SUPABASE DB");
  console.log("============================================================");

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query("BEGIN;");

    const defaultOrgId = "00000000-0000-0000-0000-000000000001";
    const defaultBranchId = "00000000-0000-0000-0000-000000000011";

    // 1. Update Organization with code GYM-000001 and brand FITNEX
    await client.query(`
      UPDATE public.organizations 
      SET 
        name = 'FITNEX Fitness Club',
        slug = 'fitnex',
        legal_name = 'FITNEX Fitness & Wellness LLP',
        org_code = 'GYM-000001',
        status = 'ACTIVE',
        updated_at = NOW()
      WHERE id = $1;
    `, [defaultOrgId]);
    console.log("✅ Organization updated to FITNEX Fitness Club (GYM-000001)");

    // 2. Ensure default Subscription exists for organization
    await client.query(`
      INSERT INTO public.subscriptions (
        id, organization_id, plan_id, status, start_date, end_date, created_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000501',
        $1,
        'BUSINESS',
        'ACTIVE',
        '2026-01-01T00:00:00Z',
        '2027-01-01T23:59:59Z',
        NOW()
      ) ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE', plan_id = 'BUSINESS';
    `, [defaultOrgId]);
    console.log("✅ Active Subscription (BUSINESS plan) seeded");

    // 3. Seed Default Notification Templates for WhatsApp
    const defaultTemplates = [
      {
        event_type: "PAYMENT_RECEIPT",
        body: "Hello {{member_name}}, thank you for your payment of ₹{{amount}} for {{plan_name}} (Receipt #{{receipt_number}}). - {{gym_name}}",
        variables: ["member_name", "amount", "plan_name", "receipt_number", "gym_name"]
      },
      {
        event_type: "PAYMENT_DUE",
        body: "Hello {{member_name}}, you have a pending gym fee of ₹{{amount}} due on {{due_date}}. Please clear your dues at the reception or pay online. - {{gym_name}}",
        variables: ["member_name", "amount", "due_date", "gym_name"]
      },
      {
        event_type: "EXPIRY_REMINDER_7",
        body: "Hello {{member_name}}, your gym membership for {{plan_name}} expires on {{due_date}}. Renew today to keep your fitness journey uninterrupted! - {{gym_name}}",
        variables: ["member_name", "plan_name", "due_date", "gym_name"]
      },
      {
        event_type: "WELCOME",
        body: "Welcome to {{gym_name}}, {{member_name}}! We are thrilled to partner with you in achieving your fitness goals. See you on the floor! - {{gym_name}}",
        variables: ["member_name", "gym_name"]
      },
      {
        event_type: "BIRTHDAY",
        body: "Happy Birthday {{member_name}}! Wishing you strength, great health, and happiness from the entire team at {{gym_name}}! 🎂💪",
        variables: ["member_name", "gym_name"]
      }
    ];

    for (const tpl of defaultTemplates) {
      await client.query(`
        INSERT INTO public.notification_templates (
          organization_id, channel, event_type, template_body, variables, is_active, created_at
        ) VALUES (
          $1, 'WHATSAPP', $2, $3, $4, true, NOW()
        ) ON CONFLICT DO NOTHING;
      `, [defaultOrgId, tpl.event_type, tpl.body, JSON.stringify(tpl.variables)]);
    }
    console.log("✅ 5 WhatsApp notification templates seeded");

    // 4. Seed Essential Portal Users
    const defaultUsers = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        email: "admin@gymcare.in",
        first_name: "Super",
        last_name: "Admin",
        mobile: "+919800000000",
        role: "SUPER_ADMIN",
        branch_id: null
      },
      {
        id: "00000000-0000-0000-0000-000000000002",
        email: "owner@fitnex.in",
        first_name: "Rahul",
        last_name: "Patil",
        mobile: "+919822012345",
        role: "GYM_OWNER",
        branch_id: defaultBranchId
      },
      {
        id: "00000000-0000-0000-0000-000000000003",
        email: "manager@fitnex.in",
        first_name: "Amit",
        last_name: "Shinde",
        mobile: "+919822012346",
        role: "BRANCH_MANAGER",
        branch_id: defaultBranchId
      },
      {
        id: "00000000-0000-0000-0000-000000000004",
        email: "reception@fitnex.in",
        first_name: "Pooja",
        last_name: "Kulkarni",
        mobile: "+919822012347",
        role: "RECEPTIONIST",
        branch_id: defaultBranchId
      },
      {
        id: "00000000-0000-0000-0000-000000000005",
        email: "trainer@fitnex.in",
        first_name: "Vikram",
        last_name: "Jadhav",
        mobile: "+919822012348",
        role: "TRAINER",
        branch_id: defaultBranchId
      },
      {
        id: "00000000-0000-0000-0000-000000000006",
        email: "accountant@fitnex.in",
        first_name: "Suresh",
        last_name: "Deshmukh",
        mobile: "+919822012349",
        role: "ACCOUNTANT",
        branch_id: defaultBranchId
      },
      {
        id: "00000000-0000-0000-0000-000000000007",
        email: "staff@fitnex.in",
        first_name: "Anil",
        last_name: "Gaikwad",
        mobile: "+919822012350",
        role: "STAFF",
        branch_id: defaultBranchId
      }
    ];

    for (const u of defaultUsers) {
      await client.query(`
        INSERT INTO public.users (
          id, organization_id, branch_id, email, first_name, last_name, mobile, role, is_active, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW()
        ) ON CONFLICT (id) DO UPDATE SET 
          email = $4, first_name = $5, last_name = $6, role = $8, is_active = true;
      `, [u.id, defaultOrgId, u.branch_id, u.email, u.first_name, u.last_name, u.mobile, u.role]);
    }
    console.log("✅ 7 System users seeded for all roles");

    // 5. Seed Initial Demo Members
    const demoMembers = [
      {
        id: "00000000-0000-0000-0000-000000001001",
        member_id: "MEM-000001",
        first_name: "Aditya",
        last_name: "Kadam",
        gender: "MALE",
        mobile: "+919822011111",
        email: "aditya.kadam@gmail.com",
        city: "Kolhapur",
        status: "ACTIVE"
      },
      {
        id: "00000000-0000-0000-0000-000000001002",
        member_id: "MEM-000002",
        first_name: "Sneha",
        last_name: "More",
        gender: "FEMALE",
        mobile: "+919822022222",
        email: "sneha.more@gmail.com",
        city: "Kolhapur",
        status: "ACTIVE"
      },
      {
        id: "00000000-0000-0000-0000-000000001003",
        member_id: "MEM-000003",
        first_name: "Rohan",
        last_name: "Bhosale",
        gender: "MALE",
        mobile: "+919822033333",
        email: "rohan.bhosale@gmail.com",
        city: "Kolhapur",
        status: "EXPIRED"
      }
    ];

    for (const m of demoMembers) {
      await client.query(`
        INSERT INTO public.members (
          id, organization_id, branch_id, member_id, first_name, last_name, gender, mobile, email, city, status, joining_date, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_DATE - INTERVAL '30 days', NOW(), NOW()
        ) ON CONFLICT (id) DO NOTHING;
      `, [m.id, defaultOrgId, defaultBranchId, m.member_id, m.first_name, m.last_name, m.gender, m.mobile, m.email, m.city, m.status]);
    }
    console.log("✅ 3 Demo members seeded (Aditya, Sneha, Rohan)");

    // 6. Seed demo attendance
    await client.query(`
      INSERT INTO public.attendance (
        id, organization_id, branch_id, member_id, date, check_in, method, created_at
      ) VALUES (
        '00000000-0000-0000-0000-000000002001',
        $1, $2, '00000000-0000-0000-0000-000000001001',
        CURRENT_DATE,
        NOW() - INTERVAL '2 hours',
        'QR',
        NOW()
      ) ON CONFLICT DO NOTHING;
    `, [defaultOrgId, defaultBranchId]);

    // 7. Seed demo invoice & payment
    const invoiceId = "00000000-0000-0000-0000-000000004001";
    await client.query(`
      INSERT INTO public.invoices (
        id, organization_id, branch_id, invoice_number, member_id, subtotal, discount, taxable_amount, cgst, sgst, igst, total_tax, total_amount, amount_paid, balance_due, status, issue_date, due_date, created_at
      ) VALUES (
        $1, $2, $3, 'INV-2026-000001', '00000000-0000-0000-0000-000000001001',
        2118.64, 0, 2118.64, 190.68, 190.68, 0, 381.36, 2500.00, 2500.00, 0, 'PAID', CURRENT_DATE, CURRENT_DATE, NOW()
      ) ON CONFLICT DO NOTHING;
    `, [invoiceId, defaultOrgId, defaultBranchId]);

    await client.query(`
      INSERT INTO public.payments (
        id, organization_id, branch_id, receipt_number, invoice_id, member_id, amount, payment_method, status, payment_date, created_at
      ) VALUES (
        '00000000-0000-0000-0000-000000003001',
        $1, $2, 'REC-000001', $3, '00000000-0000-0000-0000-000000001001',
        2500.00, 'UPI', 'PAID', NOW() - INTERVAL '5 days', NOW()
      ) ON CONFLICT DO NOTHING;
    `, [defaultOrgId, defaultBranchId, invoiceId]);
    console.log("✅ Demo attendance, tax invoice and payment records seeded");

    await client.query("COMMIT;");
    console.log("\n✨ ALL SEEDING TRANSACTIONS COMMITTED SUCCESSFULLY!");
  } catch (err) {
    await client.query("ROLLBACK;");
    console.error("❌ Seeding Error:", err);
  } finally {
    await client.end();
  }
}

seedProductionData();
