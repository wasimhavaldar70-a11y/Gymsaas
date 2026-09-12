const { Client } = require("pg");
const dotenv = require("dotenv");
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Please configure DIRECT_URL or DATABASE_URL in your environment or .env file");
  process.exit(1);
}

async function inspectDatabase() {
  console.log("============================================================");
  console.log("🔍 SUPABASE DATABASE & CREDENTIALS AUDIT");
  console.log("============================================================");

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("✅ Connection to Supabase PostgreSQL 17.6 Successful!\n");

    // 1. Roles table columns & data
    const rolesCols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'roles';
    `);
    console.log("--- ROLES TABLE COLUMNS ---");
    console.log(rolesCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(", "));
    const rolesRes = await client.query("SELECT * FROM public.roles;");
    console.log("Roles data:", rolesRes.rows);
    console.log();

    // 2. Users table columns & data
    const usersCols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';
    `);
    console.log("--- USERS TABLE COLUMNS ---");
    console.log(usersCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(", "));
    const usersRes = await client.query("SELECT * FROM public.users;");
    console.log("Users data:", usersRes.rows);
    console.log();

    // 3. Organizations table columns & data
    const orgsRes = await client.query("SELECT * FROM public.organizations;");
    console.log("--- ORGANIZATIONS DATA ---");
    console.log(orgsRes.rows);
    console.log();

    // 4. Branches table columns & data
    const branchesRes = await client.query("SELECT * FROM public.branches;");
    console.log("--- BRANCHES DATA ---");
    console.log(branchesRes.rows);
    console.log();

    // 5. Subscription Plans
    const plansRes = await client.query("SELECT * FROM public.subscription_plans;");
    console.log("--- SUBSCRIPTION PLANS ---");
    console.log(plansRes.rows);
    console.log();

    // 6. Notification Templates
    const tplCols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notification_templates';
    `);
    console.log("--- NOTIFICATION TEMPLATES COLUMNS ---");
    console.log(tplCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(", "));
    const tplRes = await client.query("SELECT * FROM public.notification_templates;");
    console.log("Notification templates data:", tplRes.rows);
    console.log();

    // 7. Storage Buckets
    const bucketsRes = await client.query("SELECT * FROM storage.buckets;").catch(e => ({ error: e.message, rows: [] }));
    console.log("--- STORAGE BUCKETS ---");
    console.log(bucketsRes.rows);
    console.log();

  } catch (err) {
    console.error("❌ Inspection Error:", err);
  } finally {
    await client.end();
  }
}

inspectDatabase();
