import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { StationSnapshot, Alert, MonitorEvent, DefectRecord, HourlyYield, KpiSnapshot, TorqueDataPoint, CostEvent, CostSummary, ProductionProgress } from './useDashboardData';
import { calcCostSummary } from './useDashboardData';

export interface DashboardData {
  stations: StationSnapshot[];
  alerts: Alert[];
  monitorEvents: MonitorEvent[];
  defects: DefectRecord[];
  hourlyYield: HourlyYield[];
  kpis: KpiSnapshot;
  torqueData: TorqueDataPoint[];
  productionProgress: ProductionProgress;
  skillMatrix: { employee_id: string; station: string; level: number }[];
  costEvents: CostEvent[];
  costSummary: CostSummary;
}

export interface DashboardDataWithLoading extends DashboardData {
  loading: boolean;
}

export function useSupabaseData(): DashboardDataWithLoading {
  const [data, setData] = useState<DashboardData>({
    stations: [], alerts: [], monitorEvents: [], defects: [],
    hourlyYield: [],
    kpis: { fpy: 97.3, onlineWorkers: 145, alertCount: 5, torquePassRate: 98.2 },
    torqueData: [],
    productionProgress: { target: 2000, completed: 0, percent: 0, deadline: '2026/07/30', estimatedCompletion: '-', status: '準時' as '提早' | '準時' | '延遲', dailyRate: 0, effectiveDailyRate: 0 },
    skillMatrix: [],
    costEvents: [],
    costSummary: {
      totalCostToday: 0, totalCostThisWeek: 0, totalCostThisMonth: 0,
      costByCategory: [], costByStation: [], top10OperatorCosts: [],
      top10MachineCosts: [], dailyTrend: [],
    },
  });

  const [loading, setLoading] = useState(true);

  const dataRef = useRef(data);
  dataRef.current = data;

  function mapStation(r: any): StationSnapshot {
    return { id: r.id, status: r.status, model: r.model, output: r.output, cycleTime: r.cycle_time, operator: r.operator, temperature: r.temperature, torque: r.torque };
  }
  function mapDefect(r: any): DefectRecord {
    return { id: r.id, cause: r.cause, causeLabel: r.cause_label, station: r.station, operator: r.operator, timestamp: r.timestamp };
  }
  function mapCostEvent(r: any): CostEvent {
    return {
      id: r.id, stationId: r.station_id, stationName: r.station_name, operatorName: r.operator_name,
      equipmentName: r.equipment_name, errorType: r.error_type, category: r.category,
      startTime: r.start_time, endTime: r.end_time, durationMinutes: r.duration_minutes, status: r.status,
      lostProductionCost: r.lost_production_cost, idleLaborCost: r.idle_labor_cost,
      equipmentDepreciationCost: r.equipment_depreciation_cost,
      emergencyMaintenanceCost: r.emergency_maintenance_cost,
      scrapCost: r.scrap_cost, energyWasteCost: r.energy_waste_cost,
      penaltyCost: r.penalty_cost, totalCost: r.total_cost,
    };
  }
  function mapProgress(r: any): ProductionProgress {
    return { target: r.target, completed: r.completed, percent: r.percent, deadline: r.deadline, estimatedCompletion: r.estimated_completion, status: r.status, dailyRate: r.daily_rate, effectiveDailyRate: r.effective_daily_rate };
  }

  // ── Initial fetch ──
  useEffect(() => {
    async function fetchAll() {
      try {
        const [
          stationsRes, alertsRes, eventsRes, defectsRes, yieldRes,
          kpisRes, torqueRes, skillRes, costRes, progressRes,
        ] = await Promise.all([
          supabase.from('stations').select('*'),
          supabase.from('alerts').select('*').order('timestamp', { ascending: false }),
          supabase.from('monitor_events').select('*').order('timestamp', { ascending: false }).limit(30),
          supabase.from('defects').select('*').order('timestamp', { ascending: false }).limit(100),
          supabase.from('hourly_yield').select('*').order('hour', { ascending: true }),
          supabase.from('kpi_snapshots').select('*').order('id', { ascending: false }).limit(1),
          supabase.from('torque_data').select('*').order('id', { ascending: false }).limit(20),
          supabase.from('skill_matrix').select('*'),
          supabase.from('cost_events').select('*').order('start_time', { ascending: false }).limit(200),
          supabase.from('production_progress').select('*').order('id', { ascending: false }).limit(1),
        ]);

        const stations = (stationsRes.data || []).map(mapStation);
        const alerts = alertsRes.data || [];
        const monitorEvents = eventsRes.data || [];
        const defects = (defectsRes.data || []).map(mapDefect);
        const hourlyYield = yieldRes.data || [];
        const kpisRaw = kpisRes.data?.[0];
        const kpis = kpisRaw ? { fpy: kpisRaw.fpy, onlineWorkers: kpisRaw.online_workers, alertCount: kpisRaw.alert_count, torquePassRate: kpisRaw.torque_pass_rate } : dataRef.current.kpis;
        const torqueData = ((torqueRes.data || []) as TorqueDataPoint[]).reverse();
        const skillMatrix = skillRes.data || [];
        const costEvents = (costRes.data || []).map(mapCostEvent);
        const costSummary = calcCostSummary(costEvents);
        const productionProgress = progressRes.data?.[0] ? mapProgress(progressRes.data[0]) : dataRef.current.productionProgress;

        setData(() => ({ stations, alerts, monitorEvents, defects, hourlyYield, kpis, torqueData, skillMatrix, costEvents, costSummary, productionProgress }));
      } catch (err) {
        console.error('Supabase fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // ── Realtime subscriptions ──
  useEffect(() => {
    const channel = supabase.channel('mes-realtime');

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stations' }, (payload) => {
        const st = payload.new as any;
        setData(prev => {
          const idx = prev.stations.findIndex(s => s.id === st.id);
          const s: StationSnapshot = {
            id: st.id, status: st.status, model: st.model, output: st.output,
            cycleTime: st.cycle_time, operator: st.operator,
            temperature: st.temperature, torque: st.torque,
          };
          if (idx >= 0) {
            const next = [...prev.stations];
            next[idx] = s;
            return { ...prev, stations: next };
          }
          return { ...prev, stations: [...prev.stations, s] };
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        const a = payload.new as any;
        setData(prev => ({
          ...prev,
          alerts: [{ id: a.id, level: a.level, module: a.module, message: a.message, station: a.station, timestamp: a.timestamp, acknowledged: a.acknowledged, category: a.category }, ...prev.alerts],
        }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'monitor_events' }, (payload) => {
        const e = payload.new as any;
        setData(prev => ({
          ...prev,
          monitorEvents: [{ id: e.id, station: e.station, type: e.type, message: e.message, timestamp: e.timestamp } as MonitorEvent, ...prev.monitorEvents].slice(0, 30),
        }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'defects' }, (payload) => {
        const d = payload.new as any;
        setData(prev => ({
          ...prev,
          defects: [{ id: d.id, cause: d.cause, causeLabel: d.cause_label, station: d.station, operator: d.operator, timestamp: d.timestamp } as DefectRecord, ...prev.defects].slice(0, 100),
        }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'torque_data' }, (payload) => {
        const t = payload.new as any;
        setData(prev => {
          const next = [...prev.torqueData, { time: t.time, value: t.value, station: t.station, status: t.status } as TorqueDataPoint];
          return { ...prev, torqueData: next.length > 20 ? next.slice(-20) : next };
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'kpi_snapshots' }, (payload) => {
        const k = payload.new as any;
        setData(prev => ({ ...prev, kpis: { fpy: k.fpy, onlineWorkers: k.online_workers, alertCount: k.alert_count, torquePassRate: k.torque_pass_rate } }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cost_events' }, (payload) => {
        const c = payload.new as any;
        setData(prev => {
          const event: CostEvent = {
            id: c.id, stationId: c.station_id, stationName: c.station_name,
            operatorName: c.operator_name, equipmentName: c.equipment_name,
            errorType: c.error_type, category: c.category,
            startTime: c.start_time, endTime: c.end_time,
            durationMinutes: c.duration_minutes, status: c.status,
            lostProductionCost: c.lost_production_cost, idleLaborCost: c.idle_labor_cost,
            equipmentDepreciationCost: c.equipment_depreciation_cost,
            emergencyMaintenanceCost: c.emergency_maintenance_cost,
            scrapCost: c.scrap_cost, energyWasteCost: c.energy_waste_cost,
            penaltyCost: c.penalty_cost, totalCost: c.total_cost,
          };
          let next: CostEvent[];
          if (payload.eventType === 'INSERT') {
            next = [event, ...prev.costEvents].slice(0, 200);
          } else {
            const idx = prev.costEvents.findIndex(e => e.id === c.id);
            if (idx >= 0) { next = [...prev.costEvents]; next[idx] = event; }
            else next = [event, ...prev.costEvents];
          }
          return { ...prev, costEvents: next, costSummary: calcCostSummary(next) };
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'production_progress' }, (payload) => {
        const p = payload.new as any;
        setData(prev => ({
          ...prev,
          productionProgress: { target: p.target, completed: p.completed, percent: p.percent, deadline: p.deadline, estimatedCompletion: p.estimated_completion, status: p.status, dailyRate: p.daily_rate, effectiveDailyRate: p.effective_daily_rate } as ProductionProgress,
        }));
      });

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return { ...data, loading };
}
