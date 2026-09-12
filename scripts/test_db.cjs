const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function testConnection() {
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
    console.log('Connecting to Supabase PostgreSQL at aws-0-ap-south-1.pooler.supabase.com:5432...');
    await client.connect();
    console.log('>>> CONNECTED TO SUPABASE POSTGRESQL SUCCESSFULLY! <<<');

    const dbRes = await client.query('SELECT current_database(), version();');
    console.log('Database:', dbRes.rows[0].current_database);
    console.log('Postgres Version:', dbRes.rows[0].version);

    const tablesRes = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );
    console.log('Public Tables Count:', tablesRes.rows.length);
    console.log('Tables in public schema:', tablesRes.rows.map(r => r.table_name));

    const schemasRes = await client.query(
      "SELECT schema_name FROM information_schema.schemata ORDER BY schema_name;"
    );
    console.log('Schemas in database:', schemasRes.rows.map(r => r.schema_name));

    await client.end();
  } catch (err) {
    console.error('Connection Failed:', err.message);
    process.exit(1);
  }
}

testConnection();
