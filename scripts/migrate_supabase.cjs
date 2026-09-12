const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

async function runMigrations() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Please configure DIRECT_URL or DATABASE_URL in your environment or .env file');
    process.exit(1);
  }
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase PostgreSQL (aws-0-ap-south-1.pooler.supabase.com:5432)...');
    await client.connect();
    console.log('Connected successfully!\n');

    // List of migration files to execute in order
    const migrationFiles = [
      '001_tenancy_and_auth.sql',
      '002_members_and_attendance.sql',
      '003_payments_and_invoices.sql',
      '004_trainers_workouts_nutrition.sql',
      '005_leads_notifications_saas.sql',
      '006_production_readiness_fixes.sql',
      '007_production_hardening_and_razorpay_removal.sql',
      '008_superadmin_and_whatsapp_engine.sql'
    ];

    const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`Migration file not found: ${file}, skipping.`);
        continue;
      }
      console.log(`Executing migration: ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf-8');
      await client.query(sql);
      console.log(`✓ Migration ${file} applied successfully.`);
    }

    // Run Seed Initial Data
    const seedPath = path.join(__dirname, '..', 'database', 'seeds', '001_seed_initial_data.sql');
    if (fs.existsSync(seedPath)) {
      console.log('\nExecuting seed data (001_seed_initial_data.sql)...');
      const seedSql = fs.readFileSync(seedPath, 'utf-8');
      await client.query(seedSql);
      console.log('✓ Seed data applied successfully.');
    }

    // Verify all created tables
    const res = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );
    console.log('\n=============================================');
    console.log(`TOTAL PUBLIC TABLES IN SUPABASE: ${res.rows.length}`);
    console.log('=============================================');
    res.rows.forEach((r, idx) => console.log(`${idx + 1}. ${r.table_name}`));

    // Verify system roles in database
    const rolesRes = await client.query("SELECT id, name FROM roles ORDER BY id;");
    console.log('\nConfigured Roles:', rolesRes.rows.map(r => r.id).join(', '));

    // Verify default organization
    const orgsRes = await client.query("SELECT id, name, slug FROM organizations LIMIT 5;");
    console.log('\nOrganizations in DB:', orgsRes.rows);

    await client.end();
    console.log('\nDatabase migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigrations();
