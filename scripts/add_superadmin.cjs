const { Client } = require("pg");
const dotenv = require("dotenv");
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Please configure DIRECT_URL or DATABASE_URL in your environment or .env file");
  process.exit(1);
}

async function addSuperAdmin() {
  console.log("============================================================");
  console.log("👑 ADDING WASIM HAVALDAR AS SUPER ADMIN TO LIVE SUPABASE DB");
  console.log("============================================================");

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const defaultOrgId = "00000000-0000-0000-0000-000000000001";
    const superAdminUserId = "00000000-0000-0000-0000-000000000001";

    const res = await client.query(`
      INSERT INTO public.users (
        id, organization_id, branch_id, email, first_name, last_name, mobile, role, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, null, 'wasimhavaldar70@gmail.com', 'Wasim', 'Havaldar', '+919822000000', 'SUPER_ADMIN', true, NOW(), NOW()
      ) ON CONFLICT (id) DO UPDATE SET 
        email = 'wasimhavaldar70@gmail.com',
        first_name = 'Wasim',
        last_name = 'Havaldar',
        role = 'SUPER_ADMIN',
        is_active = true,
        updated_at = NOW()
      RETURNING *;
    `, [superAdminUserId, defaultOrgId]);

    console.log("✅ Super Admin Record Upserted in public.users:");
    console.log({
      id: res.rows[0].id,
      email: res.rows[0].email,
      name: `${res.rows[0].first_name} ${res.rows[0].last_name}`,
      role: res.rows[0].role,
      is_active: res.rows[0].is_active
    });

  } catch (err) {
    console.error("❌ Error adding Super Admin:", err);
  } finally {
    await client.end();
  }
}

addSuperAdmin();
