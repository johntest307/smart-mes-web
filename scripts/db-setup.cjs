const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_URL = process.env.DB_URL;
const SCRIPTS_DIR = path.resolve(__dirname);

if (!DB_URL) {
  console.error('FATAL: DB_URL environment variable not set');
  process.exit(1);
}

async function run() {
  const files = ['migrate-schema.sql', 'refresh-schema.sql', 'seed-data.sql'];
  const poolUrl = DB_URL.replace(':5432/', ':6579/');

  for (const f of files) {
    const sql = fs.readFileSync(path.join(SCRIPTS_DIR, f), 'utf8');
    process.stdout.write(`${f}: `);
    const client = new Client({ connectionString: poolUrl, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      await client.query(sql);
      console.log('OK');
      await client.end();
    } catch (e) {
      console.error('FAIL:', e.message.replace(/\n/g, ' '));
      await client.end().catch(() => {});
      process.exit(1);
    }
  }

  // NOTIFY pgrst
  process.stdout.write('NOTIFY pgrst: ');
  const c2 = new Client({ connectionString: poolUrl, ssl: { rejectUnauthorized: false } });
  try {
    await c2.connect();
    await c2.query("NOTIFY pgrst, 'reload schema'");
    console.log('OK');
    await c2.end();
  } catch (e) {
    console.error('FAIL:', e.message);
    await c2.end().catch(() => {});
  }

  // Terminate PostgREST backends as fallback
  process.stdout.write('Terminate PostgREST: ');
  const c3 = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  try {
    await c3.connect();
    await c3.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name='postgrest' AND pid <> pg_backend_pid()");
    console.log('OK');
    await c3.end();
  } catch (e) {
    console.error('FAIL:', e.message);
    await c3.end().catch(() => {});
  }
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
