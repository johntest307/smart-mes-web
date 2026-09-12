const { Client } = require('pg');

exports.handler = async () => {
  try {
    const client = new Client({
      host: 'db.lgjzqjgvcmylrebhjgdy.supabase.co',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: process.env.SUPABASE_DB_PASSWORD || 'YOUR_DB_PASSWORD',
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    const tables = [
      'stations','alerts','monitor_events','defects','hourly_yield',
      'kpi_snapshots','torque_data','skill_matrix','cost_events',
      'production_progress','yield_trends','defect_distribution',
      'station_defect_rates','production_progress_history'
    ];

    // Check if tables already exist
    const check = await client.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stations')");
    if (!check.rows[0].exists) {
      // Create tables
      await client.query("DROP TABLE IF EXISTS _migration_lock");
      await client.query('CREATE TABLE IF NOT EXISTS stations (id TEXT PRIMARY KEY, status TEXT NOT NULL, model TEXT NOT NULL, output INTEGER NOT NULL DEFAULT 0, cycle_time REAL NOT NULL DEFAULT 0, operator TEXT NOT NULL, temperature REAL NOT NULL, torque REAL NOT NULL)');
      await client.query('CREATE TABLE IF NOT EXISTS alerts (id TEXT PRIMARY KEY, level TEXT NOT NULL, module TEXT NOT NULL, message TEXT NOT NULL, station TEXT NOT NULL, timestamp TEXT NOT NULL, acknowledged BOOLEAN NOT NULL DEFAULT false, category TEXT)');
      await client.query('CREATE TABLE IF NOT EXISTS monitor_events (id TEXT PRIMARY KEY, station TEXT NOT NULL, type TEXT NOT NULL, message TEXT NOT NULL, timestamp TEXT NOT NULL)');
      await client.query('CREATE TABLE IF NOT EXISTS defects (id TEXT PRIMARY KEY, cause TEXT NOT NULL, cause_label TEXT NOT NULL, station TEXT NOT NULL, operator TEXT NOT NULL, timestamp TEXT NOT NULL)');
      await client.query('CREATE TABLE IF NOT EXISTS hourly_yield (hour TEXT NOT NULL PRIMARY KEY, fpy REAL NOT NULL, total INTEGER NOT NULL, defects INTEGER NOT NULL)');
      await client.query('CREATE TABLE IF NOT EXISTS kpi_snapshots (id SERIAL PRIMARY KEY, fpy REAL NOT NULL, online_workers INTEGER NOT NULL, alert_count INTEGER NOT NULL, torque_pass_rate REAL NOT NULL, recorded_at TIMESTAMP DEFAULT NOW())');
      await client.query('CREATE TABLE IF NOT EXISTS torque_data (id SERIAL PRIMARY KEY, time TEXT NOT NULL, value REAL NOT NULL, station TEXT NOT NULL, status TEXT NOT NULL)');
      await client.query('CREATE TABLE IF NOT EXISTS skill_matrix (employee_id TEXT NOT NULL, station TEXT NOT NULL, level INTEGER NOT NULL, PRIMARY KEY (employee_id, station))');
      await client.query('CREATE TABLE IF NOT EXISTS cost_events (id TEXT PRIMARY KEY, station_id TEXT NOT NULL, station_name TEXT NOT NULL, operator_name TEXT NOT NULL, equipment_name TEXT NOT NULL, error_type TEXT NOT NULL, category TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT, duration_minutes REAL DEFAULT 0, status TEXT DEFAULT \'recovered\', lost_production_cost INTEGER DEFAULT 0, idle_labor_cost INTEGER DEFAULT 0, equipment_depreciation_cost INTEGER DEFAULT 0, emergency_maintenance_cost INTEGER DEFAULT 0, scrap_cost INTEGER DEFAULT 0, energy_waste_cost INTEGER DEFAULT 0, penalty_cost INTEGER DEFAULT 0, total_cost INTEGER DEFAULT 0)');
      await client.query('CREATE TABLE IF NOT EXISTS production_progress (id SERIAL PRIMARY KEY, target INTEGER NOT NULL, completed INTEGER NOT NULL, percent REAL NOT NULL, deadline TEXT NOT NULL, estimated_completion TEXT NOT NULL, status TEXT NOT NULL, daily_rate REAL NOT NULL, effective_daily_rate REAL NOT NULL, date TEXT NOT NULL)');
      await client.query('CREATE TABLE IF NOT EXISTS yield_trends (date TEXT PRIMARY KEY, fpy REAL NOT NULL, repair_rate REAL NOT NULL, yield_rate REAL NOT NULL, rework_rate REAL NOT NULL, output INTEGER NOT NULL)');
      await client.query('CREATE TABLE IF NOT EXISTS defect_distribution (cause TEXT PRIMARY KEY, cause_label TEXT NOT NULL, count INTEGER NOT NULL, percentage REAL NOT NULL)');
      await client.query('CREATE TABLE IF NOT EXISTS station_defect_rates (station TEXT PRIMARY KEY, total INTEGER NOT NULL, defects INTEGER NOT NULL, rate REAL NOT NULL)');
      await client.query('CREATE TABLE IF NOT EXISTS production_progress_history (date TEXT PRIMARY KEY, target INTEGER NOT NULL, completed INTEGER NOT NULL, percent REAL NOT NULL)');
    }

    // Schema cache refresh
    await client.query("NOTIFY pgrst, 'reload schema'");

    // Enable RLS + SELECT policies for all tables
    for (const t of tables) {
      await client.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY;`).catch(() => {});
      await client.query(`DROP POLICY IF EXISTS anon_select_${t} ON ${t};`);
      await client.query(`CREATE POLICY anon_select_${t} ON ${t} FOR SELECT USING (true);`);
    }

    // Enable Realtime publication
    for (const t of tables) {
      await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE ${t};`)
        .catch(e => { if (!e.message.includes('already a member')) throw e; });
    }

    // INSERT/UPDATE policies for demo data generator
    const rw = ['stations','alerts','monitor_events','defects','hourly_yield','kpi_snapshots','torque_data','cost_events','production_progress'];
    for (const t of rw) {
      await client.query(`DROP POLICY IF EXISTS anon_insert_${t} ON ${t};`);
      await client.query(`CREATE POLICY anon_insert_${t} ON ${t} FOR INSERT WITH CHECK (true);`);
    }
    await client.query(`DROP POLICY IF EXISTS anon_update_stations ON stations;`);
    await client.query(`CREATE POLICY anon_update_stations ON stations FOR UPDATE USING (true);`);
    await client.query(`DROP POLICY IF EXISTS anon_update_cost_events ON cost_events;`);
    await client.query(`CREATE POLICY anon_update_cost_events ON cost_events FOR UPDATE USING (true);`);

    await client.end();
    return { statusCode: 200, body: JSON.stringify({ ok: true, tables: tables.length }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
