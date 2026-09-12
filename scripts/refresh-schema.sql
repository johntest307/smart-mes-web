NOTIFY pgrst, 'reload schema';
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY['stations','alerts','monitor_events','defects','hourly_yield','kpi_snapshots','torque_data','skill_matrix','cost_events','production_progress','yield_trends','defect_distribution','station_defect_rates','production_progress_history'])
  LOOP
    BEGIN EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t); EXCEPTION WHEN OTHERS THEN END;
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS anon_select_%I ON %I;', t, t);
      EXECUTE format('CREATE POLICY anon_select_%I ON %I FOR SELECT USING (true);', t, t);
    EXCEPTION WHEN OTHERS THEN END;
    BEGIN EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I;', t); EXCEPTION WHEN OTHERS THEN END;
  END LOOP;
  FOR t IN SELECT unnest(ARRAY['stations','alerts','monitor_events','defects','hourly_yield','kpi_snapshots','torque_data','cost_events','production_progress'])
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS anon_insert_%I ON %I;', t, t);
      EXECUTE format('CREATE POLICY anon_insert_%I ON %I FOR INSERT WITH CHECK (true);', t, t);
    EXCEPTION WHEN OTHERS THEN END;
  END LOOP;
  BEGIN
    DROP POLICY IF EXISTS anon_update_stations ON stations;
    CREATE POLICY anon_update_stations ON stations FOR UPDATE USING (true);
  EXCEPTION WHEN OTHERS THEN END;
  BEGIN
    DROP POLICY IF EXISTS anon_update_cost_events ON cost_events;
    CREATE POLICY anon_update_cost_events ON cost_events FOR UPDATE USING (true);
  EXCEPTION WHEN OTHERS THEN END;
END $$;

-- Event trigger for auto schema cache refresh
CREATE OR REPLACE FUNCTION pgrst_watch() RETURNS event_trigger AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$ LANGUAGE plpgsql;

DROP EVENT TRIGGER IF EXISTS pgrst_watch;
CREATE EVENT TRIGGER pgrst_watch ON ddl_command_end
  WHEN TAG IN (
    'CREATE SCHEMA', 'ALTER SCHEMA',
    'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE', 'DROP TABLE',
    'CREATE VIEW', 'ALTER VIEW', 'DROP VIEW',
    'CREATE FUNCTION', 'ALTER FUNCTION', 'DROP FUNCTION',
    'CREATE TRIGGER', 'ALTER TRIGGER', 'DROP TRIGGER',
    'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE', 'DROP FOREIGN TABLE',
    'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW', 'DROP MATERIALIZED VIEW'
  )
  EXECUTE FUNCTION pgrst_watch();
