import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { DollarSign, TrendingUp, AlertTriangle, BarChart3, Table2, Sliders, Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart as RechartsLine, Line, PieChart, Pie, Cell, Area, ComposedChart,
} from 'recharts';
import { jsonToCSV } from '../utils/csvExport';
import ChartContainer from '../components/common/ChartContainer';
import type { TimeRange } from '../components/common/ChartContainer';
import { useDashboard } from '../hooks/DashboardContext';
import { useAuth } from '../contexts/AuthContext';
import type { CostEvent, CostSummary } from '../hooks/useDashboardData';
import GuideLink from '../components/ui/GuideLink';

const tooltipStyle = { background: '#1A232E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: '#FFFFFF' };
const formatNTD = (v: unknown) => `NT$ ${Number(v).toLocaleString()}`;

const CATEGORY_CFG: Record<string, { label: string; color: string }> = {
  machine: { label: '機台故障', color: '#D9534F' },
  human: { label: '人為失誤', color: '#E8A838' },
  material: { label: '材料異常', color: '#4A90C7' },
  other: { label: '其他', color: '#8B5CF6' },
};

const CATEGORY_COLORS: Record<string, string> = { machine: '#D9534F', human: '#E8A838', material: '#4A90C7', other: '#8B5CF6' };
const CATEGORY_NAMES: Record<string, string> = { machine: '機台故障', human: '人為失誤', material: '材料異常', other: '其他' };

function filterByRange<T extends Record<string, any>>(data: T[], range: TimeRange, getTs: (d: T) => string | undefined): T[] {
  if (range === 'realtime' || !data.length) return data;
  const now = Date.now();
  const ms: Record<TimeRange, number> = { realtime: 0, '60min': 3600000, '12h': 43200000, 'week': 604800000, 'month': 2592000000 };
  return data.filter(d => {
    const ts = getTs(d);
    if (!ts) return true;
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(ts)) {
      const d2 = new Date(); const [hh, mm, ss] = ts.split(':').map(Number);
      d2.setHours(hh, mm, ss || 0, 0);
      return (now - d2.getTime()) <= ms[range] && d2.getTime() <= now;
    }
    const t = new Date(ts).getTime();
    return !isNaN(t) && (now - t) <= ms[range];
  });
}

function calcFilteredSummary(events: CostEvent[]): CostSummary {
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
    .map(([operator, v]) => ({ operator, count: v.count, totalCost: Math.round(v.totalCost), avgCost: Math.round(v.totalCost / v.count) }))
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

  return { totalCostToday, totalCostThisWeek, totalCostThisMonth, costByCategory, costByStation, top10OperatorCosts, top10MachineCosts, dailyTrend };
}

const CostEstimationPage: React.FC = () => {
  const { t } = useTranslation();
  const { costEvents, stations, fpy, loading } = useDashboard();
  const [llmAnalysis, setLlmAnalysis] = useState(t('cost.llmWaiting'));
  const [sortKey, setSortKey] = useState<'totalCost' | 'durationMinutes' | 'startTime'>('totalCost');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [roiReduction, setRoiReduction] = useState(20);
  const [roiCategory, setRoiCategory] = useState<string>('machine');
  const [ranges, setRanges] = useState<Record<string, TimeRange>>({});
  const llmRanRef = useRef(false);

  useEffect(() => {
    if (costEvents.some(e => e.status === 'recovered') && !llmRanRef.current) {
      llmRanRef.current = true;
      runLLMAnalysis();
    }
  }, [costEvents]);

  const handleTimeRange = useCallback((chartKey: string) => (range: TimeRange) => {
    setRanges(prev => ({ ...prev, [chartKey]: range }));
  }, []);

  const costRange = ranges['cost'] || 'realtime';
  const filteredCostEvents = useMemo(() => filterByRange(costEvents, costRange, e => e.startTime), [costEvents, costRange]);
  const filteredCostSummary = useMemo(() => calcFilteredSummary(filteredCostEvents), [filteredCostEvents]);
  const activeErrors = filteredCostEvents.filter(e => e.status === 'active');

  const categoryCost = useMemo(() => {
    const map = new Map<string, { count: number; totalCost: number }>();
    for (const e of filteredCostEvents.filter(e => e.status === 'recovered')) {
      const prev = map.get(e.category) || { count: 0, totalCost: 0 };
      prev.count++; prev.totalCost += e.totalCost;
      map.set(e.category, prev);
    }
    return [...map.entries()].map(([k, v]) => ({ category: k, ...CATEGORY_CFG[k] || { label: k, color: '#666' }, count: v.count, totalCost: Math.round(v.totalCost) }));
  }, [filteredCostEvents]);

  const filteredEvents = useMemo(() => {
    let list = filteredCostEvents.filter(e => e.status === 'recovered');
    if (filterCategory !== 'all') list = list.filter(e => e.category === filterCategory);
    list.sort((a, b) => {
      const mul = sortDir === 'desc' ? -1 : 1;
      if (sortKey === 'startTime') return mul * (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0);
      return mul * ((a[sortKey] as number) - (b[sortKey] as number));
    });
    return list.slice(0, 50);
  }, [filteredCostEvents, sortKey, sortDir, filterCategory]);

  const oeeTrend = useMemo(() => {
    return filteredCostSummary.dailyTrend.map(d => ({ ...d, oee: Math.round((70 + Math.random() * 20) * 10) / 10 }));
  }, [filteredCostSummary.dailyTrend]);

  const roiSavings = useMemo(() => {
    const totalByCat = new Map<string, number>();
    for (const e of filteredCostEvents.filter(e => e.status === 'recovered')) {
      totalByCat.set(e.category, (totalByCat.get(e.category) || 0) + e.totalCost);
    }
    const catTotal = totalByCat.get(roiCategory) || 0;
    const reduction = catTotal * (roiReduction / 100);
    return { catTotal: Math.round(catTotal), reduction: Math.round(reduction), annualProjection: Math.round(reduction * 12) };
  }, [filteredCostEvents, roiCategory, roiReduction]);

  const handleExportXLSX = () => {
    jsonToCSV(filteredCostEvents.filter(e => e.status === 'recovered').map(e => ({
      '站點': e.stationId, '操作員': e.operatorName, '機台': e.equipmentName,
      '異常類型': e.errorType, '類別': CATEGORY_CFG[e.category]?.label || e.category,
      '開始時間': e.startTime, '結束時間': e.endTime || '', '持續分鐘': e.durationMinutes,
      '損失利潤': e.lostProductionCost, '閒置人力': e.idleLaborCost,
      '設備折舊': e.equipmentDepreciationCost, '緊急維修': e.emergencyMaintenanceCost,
      '報廢損失': e.scrapCost, '能源浪費': e.energyWasteCost,
      '罰款': e.penaltyCost, '總計': e.totalCost,
    })), `MES成本估算_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const { token } = useAuth();

  const runLLMAnalysis = async () => {
    const prompt = `你是一個製造業成本管理顧問，請分析以下 MES 系統的停機成本數據，並給出繁體中文的改進建議。

TOP10 操作員失誤成本：
${filteredCostSummary.top10OperatorCosts.map((o, i) => `${i+1}. ${o.operator}: ${o.count} 次, 總成本 NT$ ${o.totalCost.toLocaleString()}, 平均每次 NT$ ${o.avgCost.toLocaleString()}`).join('\n')}

TOP10 機台故障成本：
${filteredCostSummary.top10MachineCosts.map((m, i) => `${i+1}. ${m.equipment} (${m.stationId}): ${m.count} 次, 總成本 NT$ ${m.totalCost.toLocaleString()}`).join('\n')}

成本結構（7 類）：
${filteredCostSummary.costByCategory.map(c => `${c.name}: NT$ ${c.value.toLocaleString()}`).join('\n')}

異常類別成本：
${categoryCost.map(c => `${c.label}: ${c.count} 次, NT$ ${c.totalCost.toLocaleString()}`).join('\n')}

總成本（本月）：NT$ ${filteredCostSummary.totalCostThisMonth.toLocaleString()}
活躍異常數：${activeErrors.length}

請分析：
1. 成本熱點在哪裡？
2. 最主要的三個問題是什麼？
3. 具體改善建議（可執行方案）`;
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 60000);
      const resp = await fetch(`${import.meta.env.VITE_RAG_API || 'https://smart-mes-rag.onrender.com'}/api/llm/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ prompt }),
        signal: ctrl.signal,
      });
      clearTimeout(to);
      const data = await resp.json();
      setLlmAnalysis(data.content || t('cost.llmNoResult'));
    } catch {
      setLlmAnalysis(t('cost.llmError'));
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background pt-24 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-text-muted text-sm">Loading data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-10 px-4 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-10 text-center">
          <span className="text-accent-green text-sm font-mono tracking-widest uppercase">{t('cost.title')}</span>
          <h1 className="text-3xl md:text-4xl font-bold mt-2 text-text-primary">{t('cost.title')}</h1>
          <p className="text-text-muted mt-2">{t('cost.subtitle')}</p>
      </motion.div>

      <div className="flex items-center gap-4 mb-4">
        <GuideLink section="cost-estimation" label="成本計算公式" />
      </div>

      <ChartContainer title={t('cost.summary')}
        onExport={() => ({
          headers: [t('yield.kpi'), t('cost.total')],
          rows: [
            [t('cost.todayLoss'), formatNTD(filteredCostSummary.totalCostToday)],
            [t('cost.weekLoss'), formatNTD(filteredCostSummary.totalCostThisWeek)],
            [t('cost.monthLoss'), formatNTD(filteredCostSummary.totalCostThisMonth)],
            [t('cost.activeErrors'), `${activeErrors.length} ${t('yield.stationsSuffix')}`],
          ],
        })}
        onTimeRangeChange={handleTimeRange('cost')}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <SummaryCard icon={DollarSign} label={t('cost.todayLoss')} value={formatNTD(filteredCostSummary.totalCostToday)} color="#D9534F" />
          <SummaryCard icon={TrendingUp} label={t('cost.weekLoss')} value={formatNTD(filteredCostSummary.totalCostThisWeek)} color="#E8A838" />
          <SummaryCard icon={BarChart3} label={t('cost.monthLoss')} value={formatNTD(filteredCostSummary.totalCostThisMonth)} color="#4A90C7" />
          <SummaryCard icon={AlertTriangle} label={t('cost.activeErrors')} value={`${activeErrors.length} ${t('yield.stationsSuffix')}`} color="#C9975E" />
          <SummaryCard icon={Download} label={t('cost.exportAllXlsx')} value={t('cost.clickDownload')} color="#5BA87A" onClick={handleExportXLSX} />
        </div>
      </ChartContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 mt-6">
        <ChartContainer title={t('cost.costStructure')}
          onExport={() => ({ headers: [t('cost.category'), t('cost.total')], rows: filteredCostSummary.costByCategory.map(d => [d.name, d.value]) })}
          onTimeRangeChange={handleTimeRange('cost')}>
          <CostDonutChart data={filteredCostSummary.costByCategory} />
        </ChartContainer>
        <ChartContainer title={t('cost.categoryCost')}
          onExport={() => ({ headers: [t('cost.category'), t('yield.alertCount'), t('cost.total')], rows: categoryCost.map(c => [c.label, c.count, c.totalCost]) })}
          onTimeRangeChange={handleTimeRange('cost')}>
          <CategoryCostChart data={categoryCost} />
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartContainer title={t('cost.dailyTrend')}
          onExport={() => ({ headers: ['Date', t('cost.total')], rows: filteredCostSummary.dailyTrend.map(d => [d.date, d.cost]) })}
          onTimeRangeChange={handleTimeRange('cost')}>
          <DailyCostTrend data={filteredCostSummary.dailyTrend} />
        </ChartContainer>
        <ChartContainer title={t('cost.oeeVsCost')}
          onExport={() => ({ headers: ['Date', t('cost.total'), t('cost.oeePercent')], rows: oeeTrend.map(d => [d.date, d.cost, d.oee]) })}
          onTimeRangeChange={handleTimeRange('cost')}>
          <OEETrendChart data={oeeTrend} />
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartContainer title={t('cost.top10Operator')}
          onExport={() => ({ headers: [t('cost.operator'), t('yield.errorCount'), t('cost.total')], rows: filteredCostSummary.top10OperatorCosts.map(d => [d.operator, d.count, d.totalCost]) })}
          onTimeRangeChange={handleTimeRange('cost')}>
          <Top10OperatorChart data={filteredCostSummary.top10OperatorCosts} />
        </ChartContainer>
        <ChartContainer title={t('cost.top10Machine')}
          onExport={() => ({ headers: ['Machine', t('cost.station'), t('yield.alertCount'), t('cost.total')], rows: filteredCostSummary.top10MachineCosts.map(d => [d.equipment, d.stationId, d.count, d.totalCost]) })}
          onTimeRangeChange={handleTimeRange('cost')}>
          <Top10MachineChart data={filteredCostSummary.top10MachineCosts} />
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartContainer title={t('cost.stationCostRank')}
          onExport={() => ({ headers: [t('cost.station'), t('cost.total')], rows: filteredCostSummary.costByStation.slice(0, 10).map(d => [d.stationId, d.cost]) })}
          onTimeRangeChange={handleTimeRange('cost')}>
          <StationCostChart data={filteredCostSummary.costByStation} />
        </ChartContainer>
        <ChartContainer title={t('cost.twoWeekForecast')}
          onExport={() => {
            const forecastData = genForecastData(stations, fpy);
            return { headers: ['Day', 'Date', t('cost.optimistic'), t('cost.expected'), t('cost.pessimistic')], rows: forecastData.map(d => [d.day, d.date, d.optimistic, d.expected, d.pessimistic]) };
          }}
          onTimeRangeChange={handleTimeRange('cost')}>
          <TwoWeekForecast stations={stations} fpy={fpy} />
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartContainer title={t('cost.roiSimulator')}
          onExport={() => {
            if (!categoryCost.length) return null;
            return { headers: [t('cost.category'), t('cost.total'), t('cost.savings'), t('cost.annualSavings')], rows: categoryCost.map(c => [c.label, c.totalCost, Math.round(c.totalCost * roiReduction / 100), Math.round(c.totalCost * roiReduction / 100 * 12)]) };
          }}
          onTimeRangeChange={handleTimeRange('cost')}>
          <RoiSimulator
            categoryCost={categoryCost}
            roiCategory={roiCategory} setRoiCategory={setRoiCategory}
            roiReduction={roiReduction} setRoiReduction={setRoiReduction}
            roiSavings={roiSavings}
          />
        </ChartContainer>
        <ChartContainer title={t('cost.costEventTable')}
          onExport={() => ({
            headers: [t('cost.time'), t('cost.station'), t('cost.operator'), t('cost.category'), t('cost.duration'), t('cost.total')],
            rows: filteredEvents.map(e => [e.startTime, e.stationId, e.operatorName, CATEGORY_NAMES[e.category] || e.category, e.durationMinutes.toFixed(1), e.totalCost]),
          })}
          onTimeRangeChange={handleTimeRange('cost')}>
          <CostEventTable
            filteredEvents={filteredEvents}
            sortKey={sortKey} setSortKey={setSortKey}
            sortDir={sortDir} setSortDir={setSortDir}
            filterCategory={filterCategory} setFilterCategory={setFilterCategory}
          />
        </ChartContainer>
      </div>

      <ChartContainer title={t('cost.llmAnalysis')}
        onExport={() => ({ headers: ['分析內容'], rows: [[llmAnalysis]] })}
        onTimeRangeChange={handleTimeRange('cost')}>
        <div className="text-xs font-mono text-text-muted whitespace-pre-wrap leading-relaxed bg-white/[0.03] p-4 rounded-lg min-h-[120px]">
          {llmAnalysis}
        </div>
      </ChartContainer>
    </div>
  );
};

function genForecastData(stations: any[], fpy: number) {
  const avgDailyOutput = stations.length > 0 ? Math.round(stations.reduce((s: any, st: any) => s + st.output, 0) / Math.max(1, 20)) : 50;
  const trend = fpy > 95 ? 'up' : fpy > 90 ? 'stable' : 'down';
  return Array.from({ length: 14 }, (_, i) => {
    const base = avgDailyOutput * (i + 1);
    const variance = trend === 'up' ? 1 + i * 0.02 : trend === 'down' ? 1 - i * 0.015 : 1;
    return {
      day: `D+${i + 1}`, date: new Date(Date.now() + i * 86400000).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }),
      optimistic: Math.round(base * variance * 1.1), pessimistic: Math.round(base * variance * 0.85),
      expected: Math.round((Math.round(base * variance * 1.1) + Math.round(base * variance * 0.85)) / 2),
    };
  });
}

function SummaryCard({ icon: Icon, label, value, color, onClick }: { icon: React.ComponentType<{ size?: number }>; label: string; value: string; color: string; onClick?: () => void }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-surface/50 p-4 ${onClick ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''}`} onClick={onClick}>
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg" style={{ background: `${color}20` }}>
          <span style={{ color }}><Icon size={18} /></span>
        </div>
        <span className="text-xs font-mono text-text-muted">{label}</span>
      </div>
      <div className="text-xl font-bold font-mono" style={{ color }}>{value}</div>
    </div>
  );
}

function CostDonutChart({ data }: { data: CostSummary['costByCategory'] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return total === 0 ? <EmptyChart /> : (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={65} outerRadius={90} dataKey="value" paddingAngle={2}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatNTD(v)} />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-4 gap-1 mt-2">
        {data.filter(d => d.value > 0).map(d => (
          <div key={d.name} className="flex items-center gap-1 text-[10px] font-mono">
            <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
            <span className="text-text-muted truncate">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryCostChart({ data }: { data: { category: string; label: string; color: string; count: number; totalCost: number }[] }) {
  return data.length === 0 ? <EmptyChart /> : (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={v => `NT$${Math.round(v/1000)}k`} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} width={70} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatNTD(v)} />
          <Bar dataKey="totalCost" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DailyCostTrend({ data }: { data: CostSummary['dailyTrend'] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLine data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={v => v.slice(5)} />
          <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={v => `NT$${Math.round(v/1000)}k`} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatNTD(v)} />
          <Line type="monotone" dataKey="cost" stroke="#D9534F" strokeWidth={2} dot={false} />
        </RechartsLine>
      </ResponsiveContainer>
    </div>
  );
}

function OEETrendChart({ data }: { data: { date: string; cost: number; oee: number }[] }) {
  const { t } = useTranslation();
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={v => v.slice(5)} />
          <YAxis yAxisId="cost" tick={{ fontSize: 10, fill: '#D9534F' }} tickFormatter={v => `NT$${Math.round(v/1000)}k`} />
          <YAxis yAxisId="oee" orientation="right" tick={{ fontSize: 10, fill: '#5BA87A' }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar yAxisId="cost" dataKey="cost" fill="#D9534F" fillOpacity={0.3} radius={[2, 2, 0, 0]} />
          <Line yAxisId="oee" type="monotone" dataKey="oee" stroke="#5BA87A" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-[10px] font-mono">
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-[#D9534F] opacity-30" /> {t('cost.dailyCost')}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-[#5BA87A]" /> {t('cost.oeePercent')}</span>
      </div>
    </div>
  );
}

function Top10OperatorChart({ data }: { data: CostSummary['top10OperatorCosts'] }) {
  const chartData = data.map(d => ({ name: d.operator, cost: d.totalCost }));
  return chartData.length === 0 ? <EmptyChart /> : (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={v => `NT$${Math.round(v/1000)}k`} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} width={60} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatNTD(v)} />
          <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
            {chartData.map((_, i) => (<Cell key={i} fill={i < 3 ? '#D9534F' : i < 6 ? '#E8A838' : '#4A90C7'} />))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Top10MachineChart({ data }: { data: CostSummary['top10MachineCosts'] }) {
  const chartData = data.map(d => ({ name: `${d.equipment} (${d.stationId})`, cost: d.totalCost }));
  return chartData.length === 0 ? <EmptyChart /> : (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={v => `NT$${Math.round(v/1000)}k`} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8' }} width={90} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatNTD(v)} />
          <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
            {chartData.map((_, i) => (<Cell key={i} fill={i < 3 ? '#D9534F' : i < 6 ? '#E8A838' : '#C9975E'} />))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StationCostChart({ data }: { data: CostSummary['costByStation'] }) {
  const chartData = data.slice(0, 10);
  return chartData.length === 0 ? <EmptyChart /> : (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={v => `NT$${Math.round(v/1000)}k`} />
          <YAxis type="category" dataKey="stationId" tick={{ fontSize: 10, fill: '#94A3B8' }} width={50} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatNTD(v)} />
          <Bar dataKey="cost" fill="#4A90C7" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TwoWeekForecast({ stations, fpy }: { stations: any[]; fpy: number }) {
  const { t } = useTranslation();
  const forecastData = genForecastData(stations, fpy);
  return (
    <div className="h-64">
      <div className="flex gap-3 mb-2 text-[10px] font-mono">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-accent-blue" /> {t('cost.optimistic')}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-text-muted" /> {t('cost.expected')}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-warning" /> {t('cost.pessimistic')}</span>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <ComposedChart data={forecastData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} />
          <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="optimistic" fill="#4A90C7" fillOpacity={0.1} stroke="none" />
          <Area type="monotone" dataKey="pessimistic" fill="#D9534F" fillOpacity={0.1} stroke="none" />
          <Line type="monotone" dataKey="optimistic" stroke="#4A90C7" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
          <Line type="monotone" dataKey="expected" stroke="#94A3B8" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="pessimistic" stroke="#D9534F" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function RoiSimulator({ categoryCost, roiCategory, setRoiCategory, roiReduction, setRoiReduction, roiSavings }: {
  categoryCost: { category: string; label: string; color: string; count: number; totalCost: number }[];
  roiCategory: string; setRoiCategory: (v: string) => void;
  roiReduction: number; setRoiReduction: (v: number) => void;
  roiSavings: { catTotal: number; reduction: number; annualProjection: number };
}) {
  return (
    <div>
      <RoiSimulatorInner categoryCost={categoryCost} roiCategory={roiCategory} setRoiCategory={setRoiCategory} roiReduction={roiReduction} setRoiReduction={setRoiReduction} roiSavings={roiSavings} />
    </div>
  );
}

function RoiSimulatorInner({ categoryCost, roiCategory, setRoiCategory, roiReduction, setRoiReduction, roiSavings }: {
  categoryCost: { category: string; label: string; color: string; count: number; totalCost: number }[];
  roiCategory: string; setRoiCategory: (v: string) => void;
  roiReduction: number; setRoiReduction: (v: number) => void;
  roiSavings: { catTotal: number; reduction: number; annualProjection: number };
}) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex items-center gap-2 mb-3"><Sliders size={15} className="text-accent-blue" /><h3 className="text-sm font-bold text-text-primary">{t('cost.roiTitle')}</h3></div>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-mono text-text-muted mb-1 block">{t('cost.targetCategory')}</label>
          <div className="flex gap-2 flex-wrap">
            {categoryCost.map(c => (
              <button key={c.category} onClick={() => setRoiCategory(c.category)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${roiCategory === c.category ? 'ring-2 ring-offset-1' : 'bg-white/5 text-text-muted hover:bg-white/10'}`}
                style={{ borderColor: c.color, borderWidth: 1, color: roiCategory === c.category ? c.color : undefined, '--tw-ring-color': c.color } as React.CSSProperties}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-mono text-text-muted mb-1 block">{t('cost.reductionRatio')}：{roiReduction}%</label>
          <input type="range" min={5} max={80} step={5} value={roiReduction} onChange={e => setRoiReduction(Number(e.target.value))} className="w-full accent-accent-blue" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/[0.03] rounded-lg p-3 text-center">
            <div className="text-[10px] font-mono text-text-muted">{t('cost.categoryTotalCost')}</div>
            <div className="text-sm font-bold font-mono text-text-primary">{formatNTD(roiSavings.catTotal)}</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 text-center">
            <div className="text-[10px] font-mono text-text-muted">{t('cost.savings')}</div>
            <div className="text-sm font-bold font-mono text-accent-green">{formatNTD(roiSavings.reduction)}</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-3 text-center">
            <div className="text-[10px] font-mono text-text-muted">{t('cost.annualSavings')}</div>
            <div className="text-sm font-bold font-mono text-accent-blue">{formatNTD(roiSavings.annualProjection)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CostEventTable({ filteredEvents, sortKey, setSortKey, sortDir, setSortDir, filterCategory, setFilterCategory }: {
  filteredEvents: CostEvent[];
  sortKey: string; setSortKey: (v: any) => void;
  sortDir: string; setSortDir: (v: any) => void;
  filterCategory: string; setFilterCategory: (v: string) => void;
}) {
  const { t } = useTranslation();
  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d: 'desc' | 'asc') => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  const sortArrow = (k: string) => sortKey === k ? (sortDir === 'desc' ? ' ▼' : ' ▲') : '';
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2"><Table2 size={15} className="text-accent-blue" /><h3 className="text-sm font-bold text-text-primary">{t('cost.costEventTable')}</h3></div>
        <div className="flex items-center gap-1">
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="bg-white/5 border border-white/10 rounded text-[10px] font-mono text-text-muted px-1.5 py-1">
            <option value="all">{t('cost.all')}</option>
            {Object.entries(CATEGORY_NAMES).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
        <table className="w-full text-[10px] font-mono">
          <thead className="sticky top-0 bg-surface z-10">
            <tr className="border-b border-white/10">
              <th className="text-left px-2 py-1.5 text-text-muted cursor-pointer select-none" onClick={() => toggleSort('startTime')}>{t('cost.time')}{sortArrow('startTime')}</th>
              <th className="text-left px-2 py-1.5 text-text-muted">{t('cost.station')}</th>
              <th className="text-left px-2 py-1.5 text-text-muted">{t('cost.operator')}</th>
              <th className="text-left px-2 py-1.5 text-text-muted">{t('cost.category')}</th>
              <th className="text-left px-2 py-1.5 text-text-muted">{t('cost.duration')}</th>
              <th className="text-right px-2 py-1.5 text-text-muted cursor-pointer select-none" onClick={() => toggleSort('totalCost')}>{t('cost.total')}{sortArrow('totalCost')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-text-muted">{t('cost.noData')}</td></tr>
            ) : filteredEvents.map(e => (
              <tr key={e.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-2 py-1.5 text-text-muted whitespace-nowrap">{e.startTime}</td>
                <td className="px-2 py-1.5 text-text-primary">{e.stationId}</td>
                <td className="px-2 py-1.5 text-text-muted">{e.operatorName}</td>
                <td className="px-2 py-1.5"><span className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: `${CATEGORY_COLORS[e.category]}20`, color: CATEGORY_COLORS[e.category] }}>{CATEGORY_NAMES[e.category] || e.category}</span></td>
                <td className="px-2 py-1.5 text-text-muted">{e.durationMinutes.toFixed(1)}m</td>
                <td className="px-2 py-1.5 text-right text-text-primary font-semibold">{formatNTD(e.totalCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[9px] font-mono text-text-muted mt-2">{t('cost.showing')} {filteredEvents.length} {t('cost.records')}</p>
    </div>
  );
}

function EmptyChart() {
  const { t } = useTranslation();
  return <div className="flex items-center justify-center h-64 text-text-muted text-xs">{t('cost.noData')}</div>;
}

export default CostEstimationPage;
