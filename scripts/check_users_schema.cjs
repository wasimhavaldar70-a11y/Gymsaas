const { Client } = require("pg");
const dotenv = require("dotenv");
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Please configure DIRECT_URL or DATABASE_URL in your environment or .env file");
  process.exit(1);
}

async function checkUsersSchema() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const res = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
    ORDER BY ordinal_position;
  `);

  console.log("public.users columns:");
  console.table(res.rows);

  await client.end();
}

checkUsersSchema();
