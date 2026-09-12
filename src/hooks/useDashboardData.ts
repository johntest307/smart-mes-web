// -*- coding: utf-8 -*-
import React, { useState, useEffect, useCallback } from 'react';

export interface TorqueDataPoint {
  time: string;
  value: number;
  station: string;
  status: 'ok' | 'over' | 'under';
}

export interface StationSnapshot {
  id: string;
  status: 'running' | 'waiting' | 'error' | 'offline';
  model: string;
  output: number;
  cycleTime: number;
  operator: string;
  temperature: number;
  torque: number;
}

export interface MonitorEvent {
  id: string;
  station: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
}

export interface Alert {
  id: string;
  level: 'critical' | 'warning' | 'info';
  module: string;
  message: string;
  station: string;
  timestamp: string;
  acknowledged: boolean;
  category?: CostEvent['category'];
}

export interface DefectRecord {
  id: string;
  cause: string;
  causeLabel: string;
  station: string;
  operator: string;
  timestamp: string;
}

export interface HourlyYield {
  hour: string;
  fpy: number;
  total: number;
  defects: number;
}

export interface KpiSnapshot {
  fpy: number;
  onlineWorkers: number;
  alertCount: number;
  torquePassRate: number;
}

export interface ProductionProgress {
  target: number;
  completed: number;
  percent: number;
  deadline: string;
  estimatedCompletion: string;
  status: '提早' | '準時' | '延遲';
  dailyRate: number;
  effectiveDailyRate: number;
}

export function calcProductionProgress(stations: StationSnapshot[]): ProductionProgress {
  const target = 2000;
  const deadline = '2026/07/30';
  const batchStart = new Date('2026-06-01');
  const today = new Date();
  const elapsedDays = Math.max(1, Math.floor((today.getTime() - batchStart.getTime()) / 86400000));
  const completed = stations.reduce((s, st) => s + st.output, 0);
  const dailyRate = completed / elapsedDays;
  const errorCount = stations.filter(s => s.status === 'error' || s.status === 'offline').length;
  const abnormalRatio = errorCount / stations.length;
  const effectiveDailyRate = dailyRate * (1 - abnormalRatio * 0.6);
  const remaining = Math.max(0, target - completed);
  const daysToComplete = effectiveDailyRate > 0 ? remaining / effectiveDailyRate : 999;
  const estDate = new Date(today.getTime() + daysToComplete * 86400000);
  const deadlineDate = new Date('2026-07-30');
  let status: ProductionProgress['status'];
  if (estDate > deadlineDate) status = '延遲';
  else if (estDate < new Date(deadlineDate.getTime() - 3 * 86400000)) status = '提早';
  else status = '準時';
  const y = estDate.getFullYear();
  const m = String(estDate.getMonth() + 1).padStart(2, '0');
  const d = String(estDate.getDate()).padStart(2, '0');
  return {
    target, completed,
    percent: parseFloat(((completed / target) * 100).toFixed(1)),
    deadline,
    estimatedCompletion: `${y}/${m}/${d}`,
    status,
    dailyRate: parseFloat(dailyRate.toFixed(1)),
    effectiveDailyRate: parseFloat(effectiveDailyRate.toFixed(1)),
  };
}

const ALERT_TEMPLATES = [
  { level: 'critical' as const, module: '3', message: 'AI Poka-Yoke：工站 ST-03 偵測到漏鎖螺絲', station: 'ST-03', category: 'machine' as CostEvent['category'] },
  { level: 'warning' as const, module: '4', message: 'Smart Torque：ST-05 扭力超過上限 6.2Nm', station: 'ST-05', category: 'machine' as CostEvent['category'] },
  { level: 'warning' as const, module: '1', message: 'Skill Matrix：員工 EMP-007 資質不符，已拒絕進站', station: 'ST-02', category: 'human' as CostEvent['category'] },
  { level: 'info' as const, module: '5', message: 'PTL：料倉 B-12 揀料完成，良品確認', station: 'ST-06', category: 'material' as CostEvent['category'] },
  { level: 'info' as const, module: '6', message: '數位履歷：SN-20260601-0342 完工，履歷封存', station: 'ST-08', category: 'other' as CostEvent['category'] },
  { level: 'warning' as const, module: '2', message: '多國語言 SOP：工站 ST-07 SOP 版本待更新', station: 'ST-07', category: 'human' as CostEvent['category'] },
  { level: 'critical' as const, module: '3', message: 'AI Poka-Yoke：ST-01 零件方向錯誤告警', station: 'ST-01', category: 'human' as CostEvent['category'] },
  { level: 'warning' as const, module: '4', message: 'Smart Torque：ST-09 扭力感測器偏差超標', station: 'ST-09', category: 'machine' as CostEvent['category'] },
  { level: 'info' as const, module: '5', message: '老化測試：ST-10 批次抽驗合格率 98.5%', station: 'ST-10', category: 'other' as CostEvent['category'] },
  { level: 'warning' as const, module: '7', message: 'SCADA：ST-11 溫度感測器異常偏高', station: 'ST-11', category: 'machine' as CostEvent['category'] },
  { level: 'critical' as const, module: '3', message: 'AI Poka-Yoke：ST-12 螺絲鎖付扭力不足', station: 'ST-12', category: 'machine' as CostEvent['category'] },
  { level: 'info' as const, module: '5', message: 'PTL：ST-13 料倉揀料完成，準備下一工單', station: 'ST-13', category: 'material' as CostEvent['category'] },
  { level: 'warning' as const, module: '4', message: 'Smart Torque：ST-14 扭力曲線異常抖動', station: 'ST-14', category: 'machine' as CostEvent['category'] },
  { level: 'info' as const, module: '6', message: '數位履歷：ST-15 履歷資料完整性驗證通過', station: 'ST-15', category: 'other' as CostEvent['category'] },
  { level: 'critical' as const, module: '3', message: 'AI Vision：ST-16 外觀檢測發現刮傷', station: 'ST-16', category: 'machine' as CostEvent['category'] },
  { level: 'warning' as const, module: '2', message: '多國語言 SOP：ST-17 程序版本已更新', station: 'ST-17', category: 'human' as CostEvent['category'] },
  { level: 'info' as const, module: '5', message: 'PTL：ST-18 料倉補料完成，庫存充足', station: 'ST-18', category: 'material' as CostEvent['category'] },
  { level: 'warning' as const, module: '7', message: '老化工站：ST-19 溫度循環曲線偏移', station: 'ST-19', category: 'machine' as CostEvent['category'] },
  { level: 'critical' as const, module: '3', message: '安全門：ST-20 光柵被遮斷，產線停止', station: 'ST-20', category: 'machine' as CostEvent['category'] },
];

export const MODELS = [
  'R730xd', 'R740', 'R750', 'R760', 'PowerEdge XE',
  'ProLiant DL380', 'ThinkSystem SR650', 'RX2540', 'R760xa', 'HS5670',
  'PowerEdge C6525', 'ProLiant XL270d', 'ThinkSystem SR850', 'RX4770', 'R960',
  'FusionServer 2288', 'TS860', 'Synergy 480', 'R790', 'HS8750',
];

export const STATION_NAMES = [
  'ST-01', 'ST-02', 'ST-03', 'ST-04', 'ST-05',
  'ST-06', 'ST-07', 'ST-08', 'ST-09', 'ST-10',
  'ST-11', 'ST-12', 'ST-13', 'ST-14', 'ST-15',
  'ST-16', 'ST-17', 'ST-18', 'ST-19', 'ST-20',
];
export const DEFECT_CAUSES = [
  { cause: 'operator_error', label: '人員操作失誤', weight: 0.35 },
  { cause: 'machine_fault', label: '機台故障', weight: 0.25 },
  { cause: 'material_issue', label: '材料異常', weight: 0.18 },
  { cause: 'process_deviation', label: '製程偏移', weight: 0.15 },
  { cause: 'environmental', label: '環境因素', weight: 0.07 },
];

const MONITOR_EVENT_TEMPLATES = [
  { type: 'critical' as const, message: 'PLC 通訊斷線，站點控制單元無回應' },
  { type: 'critical' as const, message: 'RFID 讀取器故障，無法辨識托盤 ID' },
  { type: 'warning' as const, message: '產線氣壓低於 4.5kg/cm² 標準值' },
  { type: 'warning' as const, message: 'SCADA 回報該站 Cycle Time 逾時 150%' },
  { type: 'warning' as const, message: '震動感測器異常，設備軸承磨損超標' },
  { type: 'info' as const, message: 'MES 派工完成，下一工單已分配至本線' },
  { type: 'info' as const, message: '定時校准完成，感測器精度已恢復' },
];

function generateTorquePoint(): TorqueDataPoint {
  const value = 4.5 + (Math.random() - 0.5) * 3;
  const rounded = parseFloat(value.toFixed(2));
  return {
    time: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
    value: rounded,
    station: STATION_NAMES[Math.floor(Math.random() * STATION_NAMES.length)],
    status: rounded >= 3.5 && rounded <= 5.5 ? 'ok' : rounded > 5.5 ? 'over' : 'under',
  };
}

function generateInitialTorque(): TorqueDataPoint[] {
  const now = Date.now();
  return Array.from({ length: 20 }, (_, i) => {
    const v = 4.5 + (Math.random() - 0.5) * 2.5;
    const rounded = parseFloat(v.toFixed(2));
    const d = new Date(now - (19 - i) * 2000);
    return {
      time: d.toLocaleTimeString('zh-TW', { hour12: false }),
      value: rounded,
      station: STATION_NAMES[Math.floor(Math.random() * STATION_NAMES.length)],
      status: rounded >= 3.5 && rounded <= 5.5 ? 'ok' : rounded > 5.5 ? 'over' : 'under',
    };
  });
}

function randomModel() { return MODELS[Math.floor(Math.random() * MODELS.length)]; }
function randomOperator() { return `EMP-${String(Math.floor(Math.random() * 200) + 1).padStart(3, '0')}`; }

function generateStationSnapshot(id: string, prev?: StationSnapshot): StationSnapshot {
  const statusRand = Math.random();
  let status: StationSnapshot['status'];
  if (prev?.status === 'error') {
    status = Math.random() < 0.4 ? 'running' : 'error';
  } else {
    status = statusRand < 0.6 ? 'running' : statusRand < 0.82 ? 'waiting' : statusRand < 0.95 ? 'error' : 'offline';
  }
  return {
    id,
    status,
    model: prev?.model || randomModel(),
    output: (prev?.output || 0) + (status === 'running' ? Math.floor(Math.random() * 3) + 1 : 0),
    cycleTime: status === 'running' ? parseFloat((18 + Math.random() * 12).toFixed(1)) : 0,
    operator: prev?.operator || randomOperator(),
    temperature: parseFloat((36 + Math.random() * 8).toFixed(1)),
    torque: parseFloat((4.0 + Math.random() * 2.5).toFixed(2)),
  };
}

function generateMonitorEvent(): MonitorEvent {
  const t = MONITOR_EVENT_TEMPLATES[Math.floor(Math.random() * MONITOR_EVENT_TEMPLATES.length)];
  return {
    id: Date.now().toString() + Math.random(),
    station: STATION_NAMES[Math.floor(Math.random() * STATION_NAMES.length)],
    type: t.type,
    message: t.message,
    timestamp: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
  };
}

function pickWeightedCause() {
  const r = Math.random();
  let acc = 0;
  for (const c of DEFECT_CAUSES) {
    acc += c.weight;
    if (r <= acc) return c;
  }
  return DEFECT_CAUSES[DEFECT_CAUSES.length - 1];
}

function generateDefect(): DefectRecord {
  const c = pickWeightedCause();
  return {
    id: Date.now().toString() + Math.random(),
    cause: c.cause,
    causeLabel: c.label,
    station: STATION_NAMES[Math.floor(Math.random() * STATION_NAMES.length)],
    operator: randomOperator(),
    timestamp: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
  };
}

function generateInitialHourlyYield(): HourlyYield[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const h = new Date(now.getTime() - (11 - i) * 3600000);
    const hh = `${String(h.getHours()).padStart(2, '0')}:00`;
    return { hour: hh, fpy: parseFloat((92 + Math.random() * 7).toFixed(1)), total: 80 + Math.floor(Math.random() * 40), defects: Math.floor(Math.random() * 8) + 1 };
  });
}

export const skillMatrixData = Array.from({ length: 200 }, (_, ei) =>
  Array.from({ length: 20 }, (_, si) => ({
    employeeId: `EMP-${String(ei + 1).padStart(3, '0')}`,
    station: STATION_NAMES[si],
    level: Math.floor(Math.random() * 5) as 0 | 1 | 2 | 3 | 4,
  }))
);

// ═════════════════════════════════════════════════════════════════════════
// 成本估算 (Cost Estimation)
// ═════════════════════════════════════════════════════════════════════════

export interface CostEvent {
  id: string;
  stationId: string;
  stationName: string;
  operatorName: string;
  equipmentName: string;
  errorType: string;
  category: 'machine' | 'human' | 'material' | 'other';
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
  status: 'active' | 'recovered';
  lostProductionCost: number;
  idleLaborCost: number;
  equipmentDepreciationCost: number;
  emergencyMaintenanceCost: number;
  scrapCost: number;
  energyWasteCost: number;
  penaltyCost: number;
  totalCost: number;
}

export interface CostSummary {
  totalCostToday: number;
  totalCostThisWeek: number;
  totalCostThisMonth: number;
  costByCategory: { name: string; value: number; color: string }[];
  costByStation: { stationId: string; cost: number; count: number }[];
  top10OperatorCosts: { operator: string; count: number; totalCost: number; avgCost: number }[];
  top10MachineCosts: { equipment: string; stationId: string; count: number; totalCost: number }[];
  dailyTrend: { date: string; cost: number }[];
}

const BASE_HOURLY_WAGE = 250;
const BURDEN_RATE = 1.4;
const HOURLY_LOADED_WAGE = Math.round(BASE_HOURLY_WAGE * BURDEN_RATE);
const HOURLY_PRODUCTION_VALUE = 38000;
const GROSS_MARGIN = 0.35;
const HOURLY_ENERGY_COST = 200;
const EQUIPMENT_COST: Record<string, { purchase: number; years: number }> = {
  'R730xd': { purchase: 1200000, years: 10 },
  'R740': { purchase: 1500000, years: 10 },
  'R750': { purchase: 1800000, years: 10 },
  'R760': { purchase: 2000000, years: 10 },
  'PowerEdge XE': { purchase: 2500000, years: 10 },
  'ProLiant DL380': { purchase: 1600000, years: 10 },
  'ThinkSystem SR650': { purchase: 1700000, years: 10 },
  'RX2540': { purchase: 1400000, years: 10 },
  'R760xa': { purchase: 2200000, years: 10 },
  'HS5670': { purchase: 1300000, years: 10 },
  'PowerEdge C6525': { purchase: 1900000, years: 10 },
  'ProLiant XL270d': { purchase: 2800000, years: 10 },
  'ThinkSystem SR850': { purchase: 2100000, years: 10 },
  'RX4770': { purchase: 1600000, years: 10 },
  'R960': { purchase: 3000000, years: 12 },
  'FusionServer 2288': { purchase: 1200000, years: 10 },
  'TS860': { purchase: 2600000, years: 10 },
  'Synergy 480': { purchase: 1400000, years: 10 },
  'R790': { purchase: 2300000, years: 10 },
  'HS8750': { purchase: 1500000, years: 10 },
};

function calcHourlyDepreciation(model: string): number {
  const cfg = EQUIPMENT_COST[model];
  if (!cfg) return 15;
  return cfg.purchase / cfg.years / 365 / 24;
}

export function calcCostSummary(events: CostEvent[]): CostSummary {
  const now = new Date();
  const todayStr = now.toLocaleDateString('zh-TW');
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);

  const recovered = events.filter(e => e.status === 'recovered');
  const totalCostToday = recovered
    .filter(e => e.startTime.startsWith(todayStr.slice(0, 5)))
    .reduce((s, e) => s + e.totalCost, 0);
  const totalCostThisWeek = recovered
    .filter(e => new Date(e.startTime) >= weekAgo)
    .reduce((s, e) => s + e.totalCost, 0);
  const totalCostThisMonth = recovered
    .filter(e => new Date(e.startTime) >= monthAgo)
    .reduce((s, e) => s + e.totalCost, 0);

  const costByCategory: CostSummary['costByCategory'] = [
    { name: '損失利潤', value: 0, color: '#D9534F' },
    { name: '閒置人力', value: 0, color: '#E8A838' },
    { name: '設備折舊', value: 0, color: '#4A90C7' },
    { name: '緊急維修', value: 0, color: '#C9975E' },
    { name: '報廢損失', value: 0, color: '#8B5CF6' },
    { name: '能源浪費', value: 0, color: '#5BA87A' },
    { name: '罰款', value: 0, color: '#EC4899' },
  ];
  for (const e of recovered) {
    costByCategory[0].value += e.lostProductionCost;
    costByCategory[1].value += e.idleLaborCost;
    costByCategory[2].value += e.equipmentDepreciationCost;
    costByCategory[3].value += e.emergencyMaintenanceCost;
    costByCategory[4].value += e.scrapCost;
    costByCategory[5].value += e.energyWasteCost;
    costByCategory[6].value += e.penaltyCost;
  }

  const stationMap = new Map<string, { cost: number; count: number }>();
  for (const e of recovered) {
    const prev = stationMap.get(e.stationId) || { cost: 0, count: 0 };
    prev.cost += e.totalCost;
    prev.count += 1;
    stationMap.set(e.stationId, prev);
  }
  const costByStation = [...stationMap.entries()]
    .map(([stationId, v]) => ({ stationId, cost: Math.round(v.cost), count: v.count }))
    .sort((a, b) => b.cost - a.cost);

  const operatorMap = new Map<string, { count: number; totalCost: number }>();
  for (const e of recovered) {
    const prev = operatorMap.get(e.operatorName) || { count: 0, totalCost: 0 };
    prev.count += 1;
    prev.totalCost += e.totalCost;
    operatorMap.set(e.operatorName, prev);
  }
  const top10OperatorCosts = [...operatorMap.entries()]
    .map(([operator, v]) => ({
      operator, count: v.count,
      totalCost: Math.round(v.totalCost),
      avgCost: Math.round(v.totalCost / v.count),
    }))
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 10);

  const machineMap = new Map<string, { equipment: string; stationId: string; count: number; totalCost: number }>();
  for (const e of recovered) {
    const key = `${e.stationId}_${e.equipmentName}`;
    const prev = machineMap.get(key) || { equipment: e.equipmentName, stationId: e.stationId, count: 0, totalCost: 0 };
    prev.count += 1;
    prev.totalCost += e.totalCost;
    machineMap.set(key, prev);
  }
  const top10MachineCosts = [...machineMap.values()]
    .map(v => ({ ...v, totalCost: Math.round(v.totalCost) }))
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 10);

  const dailyMap = new Map<string, number>();
  for (const e of recovered) {
    const day = new Date(e.startTime).toISOString().slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) || 0) + e.totalCost);
  }
  const dailyTrend: CostSummary['dailyTrend'] = [];
  for (let i = 30; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    dailyTrend.push({ date: key, cost: Math.round(dailyMap.get(key) || 0) });
  }

  return {
    totalCostToday, totalCostThisWeek, totalCostThisMonth,
    costByCategory, costByStation, top10OperatorCosts, top10MachineCosts, dailyTrend,
  };
}

export function useDashboardData() {
  const [fpy, setFpy] = useState(97.3);
  const [torqueData, setTorqueData] = useState<TorqueDataPoint[]>(generateInitialTorque);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [kpis, setKpis] = useState<KpiSnapshot>({ fpy: 97.3, onlineWorkers: 145, alertCount: 5, torquePassRate: 98.2 });
  const [stations, setStations] = useState<StationSnapshot[]>(
    () => STATION_NAMES.map(id => generateStationSnapshot(id))
  );
  const [monitorEvents, setMonitorEvents] = useState<MonitorEvent[]>([]);
  const [defects, setDefects] = useState<DefectRecord[]>([]);
  const [hourlyYield, setHourlyYield] = useState<HourlyYield[]>(generateInitialHourlyYield);
  const [costEvents, setCostEvents] = useState<CostEvent[]>([]);
  const prevStatusRef = React.useRef<Map<string, StationSnapshot['status']>>(new Map());
  const alertsRef = React.useRef(alerts);
  alertsRef.current = alerts;

  // FPY: every 3s
  useEffect(() => {
    const id = setInterval(() => {
      setFpy(prev => parseFloat(Math.min(99.9, Math.max(90, prev + (Math.random() - 0.5) * 0.4)).toFixed(1)));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Torque: every 2s
  useEffect(() => {
    const id = setInterval(() => {
      setTorqueData(prev => {
        const next = [...prev, generateTorquePoint()];
        return next.length > 20 ? next.slice(next.length - 20) : next;
      });
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // Alerts: every 3.5s
  useEffect(() => {
    const id = setInterval(() => {
      const template = ALERT_TEMPLATES[Math.floor(Math.random() * ALERT_TEMPLATES.length)];
      const newAlert: Alert = {
        ...template,
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
        acknowledged: false,
      };
      setAlerts(prev => {
        const next = [newAlert, ...prev];
        return next.length > 10 ? next.slice(0, 10) : next;
      });
    }, 3500);
    return () => clearInterval(id);
  }, []);

  // KPIs: every 10s
  useEffect(() => {
    const id = setInterval(() => {
      setKpis({
        fpy: parseFloat((94 + Math.random() * 5).toFixed(1)),
        onlineWorkers: Math.floor(120 + Math.random() * 60),
        alertCount: Math.floor(Math.random() * 12),
        torquePassRate: parseFloat((96 + Math.random() * 4).toFixed(1)),
      });
    }, 10000);
    return () => clearInterval(id);
  }, []);

  // Station data: every 2s
  useEffect(() => {
    const id1 = setInterval(() => {
      setStations(prev => prev.map(s => generateStationSnapshot(s.id, s)));
      if (Math.random() < 0.35) {
        setMonitorEvents(prev => {
          const next = [generateMonitorEvent(), ...prev];
          return next.length > 30 ? next.slice(0, 30) : next;
        });
      }
    }, 2000);

    // Defects: every 4s
    const id2 = setInterval(() => {
      if (Math.random() < 0.5) {
        setDefects(prev => {
          const next = [generateDefect(), ...prev];
          return next.length > 100 ? next.slice(0, 100) : next;
        });
      }
    }, 4000);

    // Hourly yield: every 15s
    const id3 = setInterval(() => {
      setHourlyYield(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        const newVal = parseFloat((last.fpy + (Math.random() - 0.5) * 1.5).toFixed(1));
        next.push({
          hour: new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' }),
          fpy: Math.min(99.9, Math.max(88, newVal)),
          total: 80 + Math.floor(Math.random() * 40),
          defects: Math.floor(Math.random() * 8) + 1,
        });
        return next.length > 30 ? next.slice(-30) : next;
      });
    }, 15000);

    return () => { clearInterval(id1); clearInterval(id2); clearInterval(id3); };
  }, []);

  // Cost events: track station error/recovery transitions
  useEffect(() => {
    for (const st of stations) {
      const prevStatus = prevStatusRef.current.get(st.id);
      if (prevStatus === 'error' && st.status !== 'error') {
        const endTime = new Date().toLocaleString('zh-TW', { hour12: false });
        const durationMin = 0.5 + Math.random() * 4;
        const hours = durationMin / 60;
        const hourlyDep = calcHourlyDepreciation(st.model);
        const lostProd = Math.round(HOURLY_PRODUCTION_VALUE * hours * GROSS_MARGIN);
        const idleLabor = Math.round(HOURLY_LOADED_WAGE * hours);
        const depr = Math.round(hourlyDep * hours);
        const maint = Math.round(Math.random() * 3000 + 1500);
        const scrap = Math.round(Math.random() * 1500 + 500);
        const energy = Math.round(HOURLY_ENERGY_COST * hours);
        const penalty = Math.random() < 0.2 ? Math.round(Math.random() * 5000 + 2000) : 0;
        const total = lostProd + idleLabor + depr + maint + scrap + energy + penalty;
        setCostEvents(prev => {
          const idx = prev.findIndex(e => e.stationId === st.id && e.status === 'active');
          if (idx < 0) return prev;
          const next = [...prev];
          next[idx] = {
            ...next[idx], endTime,
            durationMinutes: parseFloat(durationMin.toFixed(1)),
            status: 'recovered',
            lostProductionCost: lostProd, idleLaborCost: idleLabor,
            equipmentDepreciationCost: depr, emergencyMaintenanceCost: maint,
            scrapCost: scrap, energyWasteCost: energy, penaltyCost: penalty,
            totalCost: total,
          };
          return next.length > 200 ? next.slice(-200) : next;
        });
      } else if (st.status === 'error' && prevStatus !== 'error') {
        const errorMsgs: { msg: string; cat: CostEvent['category'] }[] = [
          { msg: '人員操作失誤：未依標準流程作業', cat: 'human' },
          { msg: '機台故障：主軸軸承磨損超標', cat: 'machine' },
          { msg: '材料異常：來料尺寸超出公差', cat: 'material' },
          { msg: 'PLC 通訊斷線，站點控制單元無回應', cat: 'machine' },
          { msg: 'RFID 讀取器故障，無法辨識托盤 ID', cat: 'machine' },
          { msg: '扭力異常：螺絲鎖付扭力不足', cat: 'machine' },
          { msg: '感測器異常：溫度讀值飄移', cat: 'machine' },
          { msg: 'AI Vision 偵測：零件漏裝', cat: 'human' },
          { msg: '安全門光柵被遮斷，產線停止', cat: 'machine' },
        ];
        const pick = errorMsgs[Math.floor(Math.random() * errorMsgs.length)];
        const newEvent: CostEvent = {
          id: Date.now().toString() + Math.random(),
          stationId: st.id, stationName: st.id,
          operatorName: st.operator, equipmentName: st.model,
          errorType: pick.msg,
          category: pick.cat,
          startTime: new Date().toLocaleString('zh-TW', { hour12: false }),
          endTime: null, durationMinutes: 0, status: 'active',
          lostProductionCost: 0, idleLaborCost: 0, equipmentDepreciationCost: 0,
          emergencyMaintenanceCost: 0, scrapCost: 0, energyWasteCost: 0, penaltyCost: 0, totalCost: 0,
        };
        setCostEvents(prev => prev.length > 200 ? [...prev.slice(-199), newEvent] : [...prev, newEvent]);
      }
    }
    prevStatusRef.current = new Map(stations.map(s => [s.id, s.status]));
  }, [stations]);

  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  }, []);

  const productionProgress = calcProductionProgress(stations);
  const costSummary = calcCostSummary(costEvents);

  return { fpy, torqueData, alerts, kpis, acknowledgeAlert, stations, monitorEvents, defects, hourlyYield, productionProgress, costEvents, costSummary };
}
