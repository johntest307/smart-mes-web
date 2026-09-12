-- Drop all tables first so types can be recreated cleanly
DROP TABLE IF EXISTS production_progress_history CASCADE;
DROP TABLE IF EXISTS station_defect_rates CASCADE;
DROP TABLE IF EXISTS defect_distribution CASCADE;
DROP TABLE IF EXISTS yield_trends CASCADE;
DROP TABLE IF EXISTS production_progress CASCADE;
DROP TABLE IF EXISTS cost_events CASCADE;
DROP TABLE IF EXISTS skill_matrix CASCADE;
DROP TABLE IF EXISTS torque_data CASCADE;
DROP TABLE IF EXISTS kpi_snapshots CASCADE;
DROP TABLE IF EXISTS hourly_yield CASCADE;
DROP TABLE IF EXISTS defects CASCADE;
DROP TABLE IF EXISTS monitor_events CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS stations CASCADE;

-- Drop old enum types
DROP TYPE IF EXISTS station_status;
DROP TYPE IF EXISTS alert_level;
DROP TYPE IF EXISTS monitor_type;
DROP TYPE IF EXISTS torque_status;
DROP TYPE IF EXISTS cost_category;
DROP TYPE IF EXISTS cost_status;

-- Create enum types (canonical English codes)
CREATE TYPE station_status AS ENUM ('running','waiting','error','offline');
CREATE TYPE alert_level AS ENUM ('critical','warning','info');
CREATE TYPE monitor_type AS ENUM ('critical','warning','info','error','success');
CREATE TYPE torque_status AS ENUM ('ok','over','under');
CREATE TYPE cost_category AS ENUM ('machine','human','material','other');
CREATE TYPE cost_status AS ENUM ('active','recovered');

CREATE TABLE IF NOT EXISTS stations (
  id TEXT PRIMARY KEY,
  status station_status NOT NULL,
  model TEXT NOT NULL,
  output INTEGER NOT NULL DEFAULT 0,
  cycle_time REAL NOT NULL DEFAULT 0,
  operator TEXT NOT NULL,
  temperature REAL NOT NULL,
  torque REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  level alert_level NOT NULL,
  module TEXT NOT NULL,
  message TEXT NOT NULL,
  station TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  category TEXT
);

CREATE TABLE IF NOT EXISTS monitor_events (
  id TEXT PRIMARY KEY,
  station TEXT NOT NULL,
  type monitor_type NOT NULL,
  message TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS defects (
  id TEXT PRIMARY KEY,
  cause TEXT NOT NULL,
  cause_label TEXT NOT NULL,
  station TEXT NOT NULL,
  operator TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hourly_yield (
  hour TEXT NOT NULL,
  fpy REAL NOT NULL,
  total INTEGER NOT NULL,
  defects INTEGER NOT NULL,
  PRIMARY KEY (hour)
);

CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id SERIAL PRIMARY KEY,
  fpy REAL NOT NULL,
  online_workers INTEGER NOT NULL,
  alert_count INTEGER NOT NULL,
  torque_pass_rate REAL NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS torque_data (
  id SERIAL PRIMARY KEY,
  time TEXT NOT NULL,
  value REAL NOT NULL,
  station TEXT NOT NULL,
  status torque_status NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_matrix (
  employee_id TEXT NOT NULL,
  station TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level >= 0 AND level <= 4),
  PRIMARY KEY (employee_id, station)
);

CREATE TABLE IF NOT EXISTS cost_events (
  id TEXT PRIMARY KEY,
  station_id TEXT NOT NULL,
  station_name TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  equipment_name TEXT NOT NULL,
  error_type TEXT NOT NULL,
  category cost_category NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_minutes REAL DEFAULT 0,
  status cost_status DEFAULT 'recovered',
  lost_production_cost INTEGER DEFAULT 0,
  idle_labor_cost INTEGER DEFAULT 0,
  equipment_depreciation_cost INTEGER DEFAULT 0,
  emergency_maintenance_cost INTEGER DEFAULT 0,
  scrap_cost INTEGER DEFAULT 0,
  energy_waste_cost INTEGER DEFAULT 0,
  penalty_cost INTEGER DEFAULT 0,
  total_cost INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS production_progress (
  id SERIAL PRIMARY KEY,
  target INTEGER NOT NULL,
  completed INTEGER NOT NULL,
  percent REAL NOT NULL,
  deadline TEXT NOT NULL,
  estimated_completion TEXT NOT NULL,
  status TEXT NOT NULL,
  daily_rate REAL NOT NULL,
  effective_daily_rate REAL NOT NULL,
  date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS yield_trends (
  date TEXT PRIMARY KEY,
  fpy REAL NOT NULL,
  repair_rate REAL NOT NULL,
  yield_rate REAL NOT NULL,
  rework_rate REAL NOT NULL,
  output INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS defect_distribution (
  cause TEXT PRIMARY KEY,
  cause_label TEXT NOT NULL,
  count INTEGER NOT NULL,
  percentage REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS station_defect_rates (
  station TEXT PRIMARY KEY,
  total INTEGER NOT NULL,
  defects INTEGER NOT NULL,
  rate REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS production_progress_history (
  date TEXT PRIMARY KEY,
  target INTEGER NOT NULL,
  completed INTEGER NOT NULL,
  percent REAL NOT NULL
);

-- Grant permissions to API roles (required for Supabase May 2026+)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT UPDATE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
