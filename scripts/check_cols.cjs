const { Client } = require("pg");
const dotenv = require("dotenv");
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Please configure DIRECT_URL or DATABASE_URL in your environment or .env file");
  process.exit(1);
}

async function checkInvoiceCols() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const res = await client.query(`
    SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invoices';
  `);
  console.log("invoices columns:", res.rows.map(r => r.column_name));

  await client.end();
}

checkInvoiceCols();
