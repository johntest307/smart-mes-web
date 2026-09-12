-- Seed demo data for Smart MES Platform
INSERT INTO stations (id, status, model, output, cycle_time, operator, temperature, torque)
SELECT * FROM (VALUES
  ('S001', 'running'::station_status, 'R750', 42, 28.5, '張志明', 68.2, 45.3),
  ('S002', 'running'::station_status, 'R750', 38, 31.2, '陳美玲', 72.1, 48.7),
  ('S003', 'waiting'::station_status, 'R750', 29, 45.8, '林建國', 75.6, 52.1),
  ('S004', 'running'::station_status, 'R650', 35, 33.0, '王雅萍', 70.4, 44.9),
  ('S005', 'running'::station_status, 'R750', 44, 27.1, '李佳穎', 66.8, 46.2),
  ('S006', 'offline'::station_status, 'R650', 0, 0.0, '黃志偉', 0.0, 0.0),
  ('S007', 'running'::station_status, 'R750', 40, 30.0, '劉怡君', 69.5, 47.8),
  ('S008', 'running'::station_status, 'R650', 41, 29.3, '吳宗翰', 71.2, 45.6)
) AS v WHERE NOT EXISTS (SELECT 1 FROM stations LIMIT 1);

INSERT INTO alerts (id, level, module, message, station, timestamp, acknowledged, category)
SELECT * FROM (VALUES
  ('A001', 'critical'::alert_level, 'Assembly', 'Torque deviation exceeds threshold', 'S003', '2026-06-24T08:15:00Z', false, '設備'),
  ('A002', 'warning'::alert_level, 'Testing', 'Temperature sensor drift detected', 'S004', '2026-06-24T08:30:00Z', false, '感測器'),
  ('A003', 'info'::alert_level, 'Packaging', 'Material shortage notice', 'S006', '2026-06-24T07:45:00Z', true, '物料'),
  ('A004', 'critical'::alert_level, 'Assembly', 'Emergency stop triggered', 'S003', '2026-06-24T08:12:00Z', false, '安全'),
  ('A005', 'warning'::alert_level, 'Testing', 'Yield drop below 95% threshold', 'S002', '2026-06-24T08:00:00Z', true, '品質')
) AS v WHERE NOT EXISTS (SELECT 1 FROM alerts LIMIT 1);

INSERT INTO production_progress (target, completed, percent, deadline, estimated_completion, status, daily_rate, effective_daily_rate, date)
SELECT * FROM (VALUES
  (500, 342, 68.4, '2026-06-30', '2026-06-28', '準時', 85, 82, '2026-06-24'),
  (500, 268, 53.6, '2026-06-30', '2026-06-29', '準時', 85, 80, '2026-06-23'),
  (500, 185, 37.0, '2026-06-30', '2026-06-30', '準時', 85, 78, '2026-06-22')
) AS v WHERE NOT EXISTS (SELECT 1 FROM production_progress LIMIT 1);

INSERT INTO defects (id, cause, cause_label, station, operator, timestamp)
SELECT * FROM (VALUES
  ('D001', 'misalignment', '治具偏移', 'S003', '林建國', '2026-06-24T07:30:00Z'),
  ('D002', 'temperature', '溫度異常', 'S004', '王雅萍', '2026-06-24T08:00:00Z'),
  ('D003', 'torque', '扭力不足', 'S001', '張志明', '2026-06-24T06:45:00Z'),
  ('D004', 'material', '材料瑕疵', 'S003', '林建國', '2026-06-24T07:15:00Z'),
  ('D005', 'calibration', '校準偏差', 'S005', '李佳穎', '2026-06-24T08:30:00Z')
) AS v WHERE NOT EXISTS (SELECT 1 FROM defects LIMIT 1);

INSERT INTO monitor_events (id, station, type, message, timestamp)
SELECT * FROM (VALUES
  ('M001', 'S003', 'error'::monitor_type, 'Station S003 cycle time exceeded 45s', '2026-06-24T08:15:00Z'),
  ('M002', 'S004', 'warning'::monitor_type, 'Temperature reading 75.6°C - approaching limit', '2026-06-24T08:30:00Z'),
  ('M003', 'S006', 'info'::monitor_type, 'Station S006 entered maintenance mode', '2026-06-24T07:00:00Z'),
  ('M004', 'S001', 'success'::monitor_type, 'Station S001 completed batch successfully', '2026-06-24T08:45:00Z'),
  ('M005', 'S005', 'warning'::monitor_type, 'Output rate decreasing on S005', '2026-06-24T08:20:00Z')
) AS v WHERE NOT EXISTS (SELECT 1 FROM monitor_events LIMIT 1);

INSERT INTO hourly_yield (hour, fpy, total, defects)
SELECT * FROM (VALUES
  ('08:00', 97.5, 120, 3),
  ('09:00', 96.8, 145, 5),
  ('10:00', 95.2, 130, 6),
  ('11:00', 98.1, 140, 2),
  ('12:00', 94.5, 110, 6),
  ('13:00', 97.0, 135, 4),
  ('14:00', 96.2, 125, 5),
  ('15:00', 98.5, 150, 2)
) AS v WHERE NOT EXISTS (SELECT 1 FROM hourly_yield LIMIT 1);

INSERT INTO kpi_snapshots (fpy, online_workers, alert_count, torque_pass_rate)
SELECT * FROM (VALUES
  (96.7, 24, 5, 97.2),
  (95.8, 23, 7, 96.5),
  (97.2, 25, 3, 98.1)
) AS v WHERE NOT EXISTS (SELECT 1 FROM kpi_snapshots LIMIT 1);

INSERT INTO torque_data (time, value, station, status)
SELECT * FROM (VALUES
  ('08:00', 45.2, 'S001', 'ok'::torque_status),
  ('08:15', 48.7, 'S002', 'ok'::torque_status),
  ('08:30', 52.1, 'S003', 'over'::torque_status),
  ('08:45', 44.9, 'S004', 'ok'::torque_status),
  ('09:00', 46.2, 'S005', 'ok'::torque_status),
  ('09:15', 47.8, 'S007', 'ok'::torque_status),
  ('09:30', 45.6, 'S008', 'ok'::torque_status),
  ('09:45', 41.3, 'S001', 'under'::torque_status),
  ('10:00', 49.5, 'S002', 'ok'::torque_status),
  ('10:15', 53.0, 'S003', 'over'::torque_status)
) AS v WHERE NOT EXISTS (SELECT 1 FROM torque_data LIMIT 1);

INSERT INTO skill_matrix (employee_id, station, level)
SELECT * FROM (VALUES
  ('EMP001', 'S001', 3), ('EMP001', 'S002', 2),
  ('EMP002', 'S003', 4), ('EMP002', 'S004', 3),
  ('EMP003', 'S005', 2), ('EMP003', 'S006', 1),
  ('EMP004', 'S007', 3), ('EMP004', 'S008', 2),
  ('EMP005', 'S001', 4), ('EMP005', 'S003', 3)
) AS v WHERE NOT EXISTS (SELECT 1 FROM skill_matrix LIMIT 1);

INSERT INTO cost_events (id, station_id, station_name, operator_name, equipment_name, error_type, category, start_time, end_time, duration_minutes, status, lost_production_cost, idle_labor_cost, equipment_depreciation_cost, emergency_maintenance_cost, scrap_cost, energy_waste_cost, penalty_cost, total_cost)
SELECT * FROM (VALUES
  ('C001', 'S003', '組裝站3', '林建國', '扭矩扳手', 'Torque Deviation', 'machine'::cost_category, '2026-06-24T07:00:00Z', '2026-06-24T08:15:00Z', 75, 'recovered'::cost_status, 35000, 12000, 5000, 15000, 8000, 2000, 0, 77000),
  ('C002', 'S004', '測試站4', '王雅萍', '溫度感測器', 'Sensor Drift', 'machine'::cost_category, '2026-06-24T08:00:00Z', NULL, NULL, 'active'::cost_status, 0, 8000, 2000, 12000, 0, 1500, 5000, 28500),
  ('C003', 'S006', '包裝站6', '黃志偉', '輸送帶', 'Belt Malfunction', 'machine'::cost_category, '2026-06-24T06:30:00Z', '2026-06-24T07:45:00Z', 75, 'recovered'::cost_status, 28000, 10000, 4000, 18000, 5000, 1800, 3000, 69800)
) AS v WHERE NOT EXISTS (SELECT 1 FROM cost_events LIMIT 1);

INSERT INTO yield_trends (date, fpy, repair_rate, yield_rate, rework_rate, output)
SELECT * FROM (VALUES
  ('2026-06-18', 96.5, 1.8, 98.2, 0.9, 380),
  ('2026-06-19', 97.1, 1.5, 98.5, 0.7, 395),
  ('2026-06-20', 95.8, 2.1, 97.8, 1.2, 360),
  ('2026-06-21', 96.2, 1.9, 98.0, 1.0, 375),
  ('2026-06-22', 97.8, 1.2, 98.8, 0.5, 410),
  ('2026-06-23', 96.9, 1.6, 98.3, 0.8, 390),
  ('2026-06-24', 97.0, 1.5, 98.4, 0.7, 400)
) AS v WHERE NOT EXISTS (SELECT 1 FROM yield_trends LIMIT 1);

INSERT INTO defect_distribution (cause, cause_label, count, percentage)
SELECT * FROM (VALUES
  ('misalignment', '治具偏移', 15, 30.0),
  ('temperature', '溫度異常', 10, 20.0),
  ('torque', '扭力不足', 12, 24.0),
  ('material', '材料瑕疵', 8, 16.0),
  ('calibration', '校準偏差', 5, 10.0)
) AS v WHERE NOT EXISTS (SELECT 1 FROM defect_distribution LIMIT 1);
