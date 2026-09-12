import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ReferenceLine, Legend,
} from 'recharts';
import ChartContainer from '../components/common/ChartContainer';
import type { TimeRange } from '../components/common/ChartContainer';
import TorqueChart from '../components/dashboard/TorqueChart';
import ProductionProgressCard from '../components/monitor/ProductionProgressCard';
import { useDashboard } from '../hooks/DashboardContext';
import GuideLink from '../components/ui/GuideLink';
const DEFECT_CAUSES = [
  { cause: 'operator_error', label: '人員操作失誤', weight: 0.35 },
  { cause: 'machine_fault', label: '機台故障', weight: 0.25 },
  { cause: 'material_issue', label: '材料異常', weight: 0.18 },
  { cause: 'process_deviation', label: '製程偏移', weight: 0.15 },
  { cause: 'environmental', label: '環境因素', weight: 0.07 },
];
const STATION_NAMES = ['ST-01','ST-02','ST-03','ST-04','ST-05','ST-06','ST-07','ST-08','ST-09','ST-10','ST-11','ST-12','ST-13','ST-14','ST-15','ST-16','ST-17','ST-18','ST-19','ST-20'];

const CAUSE_COLORS: Record<string, string> = { operator_error: '#D9534F', machine_fault: '#E8A838', material_issue: '#4A90C7', process_deviation: '#C9975E', environmental: '#5BA87A' };

const tooltipStyle = { background: '#1A232E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: '#FFFFFF' };
const tooltipLabel = { color: '#FFFFFF' };

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

const PageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-background pt-20 px-4 pb-8 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
      <p className="text-text-muted text-sm">Loading data...</p>
    </div>
  </div>
);

const YieldAnalysisPage: React.FC = () => {
  const { t } = useTranslation();
  const { stations, kpis, torqueData, defects, hourlyYield, productionProgress, loading } = useDashboard();
  const [ranges, setRanges] = useState<Record<string, TimeRange>>({});

  const handleTimeRange = useCallback((chartKey: string) => (range: TimeRange) => {
    setRanges(prev => ({ ...prev, [chartKey]: range }));
  }, []);

  const defectsRange = ranges['defects'] || 'realtime';
  const yieldRange = ranges['yield'] || 'realtime';
  const torqueRange = ranges['torque'] || 'realtime';

  const filteredDefects = useMemo(() => filterByRange(defects, defectsRange, d => d.timestamp), [defects, defectsRange]);
  const filteredYield = useMemo(() => filterByRange(hourlyYield, yieldRange, d => d.hour), [hourlyYield, yieldRange]);
  const filteredTorque = useMemo(() => filterByRange(torqueData, torqueRange, d => d.time), [torqueData, torqueRange]);

  const causeCounts = new Map<string, number>();
  const stationDefects = new Map<string, number>();
  const operatorDefects = new Map<string, number>();
  const operatorCauseMap = new Map<string, Map<string, number>>();
  for (const d of filteredDefects) {
    causeCounts.set(d.cause, (causeCounts.get(d.cause) || 0) + 1);
    stationDefects.set(d.station, (stationDefects.get(d.station) || 0) + 1);
    operatorDefects.set(d.operator, (operatorDefects.get(d.operator) || 0) + 1);
    if (!operatorCauseMap.has(d.operator)) operatorCauseMap.set(d.operator, new Map());
    const cm = operatorCauseMap.get(d.operator)!;
    cm.set(d.cause, (cm.get(d.cause) || 0) + 1);
  }

  const totalDefects = filteredDefects.length;
  const latestYield = filteredYield.length > 0 ? filteredYield[filteredYield.length - 1] : null;

  const paretoData = [...causeCounts.entries()]
    .map(([cause, count]) => ({ cause: DEFECT_CAUSES.find(c => c.cause === cause)?.label || cause, causeKey: cause, count }))
    .sort((a, b) => b.count - a.count);
  const paretoTotal = paretoData.reduce((s, d) => s + d.count, 0);
  let cumSum = 0;
  const paretoWithCum = paretoData.map(d => { cumSum += d.count; return { ...d, cumPct: paretoTotal > 0 ? parseFloat((cumSum / paretoTotal * 100).toFixed(1)) : 0 }; });

  const stationData: { station: string; defects: number }[] = STATION_NAMES.map(s => ({ station: s, defects: stationDefects.get(s) || 0 }));

  const operatorData = [...operatorDefects.entries()]
    .map(([op, cnt]) => ({ operator: op, count: cnt }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const operatorChartData = operatorData.map(op => {
    const cm = operatorCauseMap.get(op.operator) || new Map();
    const causes = DEFECT_CAUSES.map(c => ({ cause: c.cause, label: c.label, count: cm.get(c.cause) || 0 })).filter(c => c.count > 0);
    return { operator: op.operator, total: op.count, causes };
  });

  const pieData = [...causeCounts.entries()].map(([cause, count]) => ({
    name: DEFECT_CAUSES.find(c => c.cause === cause)?.label || cause,
    value: count,
    color: CAUSE_COLORS[cause] || '#4A5568',
  }));

  const kpiValue = (label: string): string => {
    const running = stations.filter(s => s.status === 'running').length;
    const errors = stations.filter(s => s.status === 'error').length;
    const totalOutput = stations.reduce((a, s) => a + s.output, 0);
    const keyMap: Record<string, keyof typeof kpis | 'running' | 'error' | 'totalOutput'> = {
      totalOutput: 'totalOutput', running: 'running', error: 'error',
      fpy: 'fpy', onlineWorkers: 'onlineWorkers', alertCount: 'alertCount', torquePass: 'torquePassRate',
    };
    const sMap: Record<string, string> = {
      totalOutput: `${totalOutput}`, running: `${running} ${t('yield.stationsSuffix')}`,
      error: `${errors} ${t('yield.stationsSuffix')}`,
      fpy: `${kpis.fpy.toFixed(1)}%`, onlineWorkers: `${kpis.onlineWorkers} ${t('yield.peopleSuffix')}`,
      alertCount: `${kpis.alertCount} ${t('yield.timesSuffix')}`, torquePass: `${kpis.torquePassRate}%`,
    };
    for (const [key] of Object.entries(keyMap)) {
      if (label === t(`yield.${key}`)) return sMap[key] || '--';
    }
    return '--';
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="min-h-screen bg-background pt-20 px-4 pb-8">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-xl font-bold text-text-primary">{t('yield.title')}</h1>
          <p className="text-[11px] font-mono text-text-muted mt-0.5">{t('yield.subtitle')}</p>
        </motion.div>

        <div className="flex items-center gap-4 mb-4">
          <GuideLink section="yield-analysis" label="良率分析公式" />
          <GuideLink section="chart-thresholds" label="閾值定義" />
          <GuideLink section="production-progress" label="生產進度公式" />
        </div>

        <ChartContainer title={t('yield.kpi')}
          onExport={() => ({
            headers: [t('yield.kpi'), t('cost.total')],
            rows: [[t('yield.totalOutput'), stations.reduce((a, s) => a + s.output, 0).toString()], [t('yield.running'), `${stations.filter(s => s.status === 'running').length} ${t('yield.stationsSuffix')}`], [t('yield.error'), `${stations.filter(s => s.status === 'error').length} ${t('yield.stationsSuffix')}`], ['FPY', `${kpis.fpy.toFixed(1)}%`], [t('yield.onlineWorkers'), `${kpis.onlineWorkers} ${t('yield.peopleSuffix')}`], [t('yield.alertCount'), `${kpis.alertCount} ${t('yield.timesSuffix')}`], [t('yield.torquePass'), `${kpis.torquePassRate}%`]],
          })}
          onTimeRangeChange={handleTimeRange('kpi')}>
          <div className="grid grid-cols-7 gap-2">
            {[
              { key: 'yield.totalOutput', color: '#4A90C7' },
              { key: 'yield.running', color: '#5BA87A' },
              { key: 'yield.error', color: '#D9534F' },
              { key: 'yield.fpy', color: '#5BA87A' },
              { key: 'yield.onlineWorkers', color: '#4A90C7' },
              { key: 'yield.alertCount', color: '#E8A838' },
              { key: 'yield.torquePass', color: '#C9975E' },
            ].map(({ key, color }) => (
                <div key={key} className="rounded-lg border border-white/10 bg-surface/50 p-2 text-center">
                  <div className="text-[9px] font-mono text-text-muted">{t(key)}</div>
                  <div className="text-sm font-bold font-mono mt-0.5" style={{ color }}>{kpiValue(t(key))}</div>
                </div>
            ))}
          </div>
        </ChartContainer>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 mt-4">
          <ChartContainer title={t('yield.productionProgress')}
            onExport={() => ({
              headers: [t('yield.target'), t('cost.total')],
              rows: [[t('yield.target'), productionProgress.target.toString()], [t('yield.completed'), productionProgress.completed.toString()], [t('yield.progress'), `${productionProgress.percent}%`], [t('yield.dailyTarget'), productionProgress.dailyRate.toFixed(1).toString()], [t('yield.dailyEffectiveOutput'), productionProgress.effectiveDailyRate.toFixed(1).toString()], [t('yield.estimatedCompletion'), productionProgress.estimatedCompletion]],
            })}
            onTimeRangeChange={handleTimeRange('yield')}>
            <ProductionProgressCard data={productionProgress} />
          </ChartContainer>
          <ChartContainer title={t('yield.defectSummary')}
            onExport={() => ({
              headers: [t('yield.kpi'), t('cost.total')],
              rows: [[t('yield.defectCount'), totalDefects.toString()], [t('yield.currentFpy'), latestYield ? `${latestYield.fpy}%` : '--'], [t('yield.mainDefect'), paretoData[0]?.cause || '--'], [t('yield.defectStation'), (stationData.reduce((max, s) => s.defects > max.defects ? s : max, stationData[0])?.station || '--')]],
            })}
            onTimeRangeChange={handleTimeRange('defects')}>
            <div className="grid grid-cols-4 gap-3">
              {[
                { key: 'yield.defectCount', value: totalDefects, color: '#D9534F' },
                { key: 'yield.currentFpy', value: latestYield ? `${latestYield.fpy}%` : '--', color: '#5BA87A' },
                { key: 'yield.mainDefect', value: paretoData[0]?.cause || '--', color: '#E8A838' },
                { key: 'yield.defectStation', value: stationData.reduce((max, s) => s.defects > max.defects ? s : max, stationData[0])?.station || '--', color: '#4A90C7' },
              ].map(k => (
                <div key={k.key} className="rounded-lg border border-white/10 bg-surface/50 p-3 text-center">
                  <div className="text-[9px] font-mono text-text-muted">{t(k.key)}</div>
                  <div className="text-sm font-bold font-mono mt-0.5 truncate" style={{ color: k.color }}>{k.value}</div>
                </div>
              ))}
            </div>
          </ChartContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2">
            <ChartContainer
              title={t('yield.paretoChart')}
              onExport={() => ({
                headers: [t('yield.errorCauses'), t('yield.defectNumber'), t('yield.cumPercent')],
                rows: paretoWithCum.map(d => [d.cause, d.count, d.cumPct]),
              })}
              onTimeRangeChange={handleTimeRange('defects')}
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paretoWithCum} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="cause" tick={{ fill: '#8896A6', fontSize: 10 }} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fill: '#8896A6', fontSize: 10 }} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: '#8896A6', fontSize: 10 }} tickLine={false} unit="%" />
                    <Tooltip contentStyle={{ background: '#1A232E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#E2E8F0' }} />
                    <Bar yAxisId="left" dataKey="count" name={t('yield.defectNumber')} radius={[4, 4, 0, 0]}>
                      {paretoWithCum.map((entry: { causeKey: string }, i: number) => (<Cell key={i} fill={CAUSE_COLORS[entry.causeKey] || '#4A5568'} />))}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="cumPct" stroke="#4A90C7" strokeWidth={2} dot={false} name={t('yield.cumPercent')} />
                    <ReferenceLine yAxisId="right" y={80} stroke="#D9534F" strokeDasharray="4 4" strokeOpacity={0.5} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartContainer>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <ChartContainer
              title={t('yield.defectPie')}
              onExport={() => ({
                headers: [t('yield.errorCauses'), t('yield.defectNumber')],
                rows: pieData.map(d => [d.name, d.value]),
              })}
              onTimeRangeChange={handleTimeRange('defects')}
            >
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                      {pieData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1A232E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 10, color: '#8896A6' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartContainer>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <ChartContainer
            title={t('yield.yieldTrend')}
            onExport={() => ({
              headers: [t('yield.time'), 'FPY (%)', t('yield.totalOutput'), t('yield.defectNumber')],
              rows: filteredYield.map(y => [y.hour, y.fpy, y.total, y.defects]),
            })}
            onTimeRangeChange={handleTimeRange('yield')}
          >
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredYield} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="hour" tick={{ fill: '#8896A6', fontSize: 9 }} tickLine={false} />
                  <YAxis domain={[88, 100]} tick={{ fill: '#8896A6', fontSize: 10 }} tickLine={false} unit="%" />
                  <Tooltip contentStyle={{ background: '#1A232E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#E2E8F0' }} />
                  <Line type="monotone" dataKey="fpy" stroke="#5BA87A" strokeWidth={2} dot={{ r: 2, fill: '#5BA87A' }} activeDot={{ r: 5 }} name="FPY" isAnimationActive={false} />
                  <ReferenceLine y={95} stroke="#5BA87A" strokeDasharray="4 4" strokeOpacity={0.3} label={{ value: t('yield.target95'), fill: '#5BA87A', fontSize: 10 }} />
                  <ReferenceLine y={90} stroke="#E8A838" strokeDasharray="4 4" strokeOpacity={0.3} label={{ value: t('yield.warning90'), fill: '#E8A838', fontSize: 10 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 mt-4">
          <ChartContainer
            title={t('yield.torqueChart')}
            onExport={() => {
              if (filteredTorque.length === 0) return null;
              return {
                headers: [t('yield.time'), 'Torque (Nm)', t('yield.station'), t('yield.status')],
                rows: filteredTorque.map(p => [p.time, p.value, p.station, p.status === 'ok' ? t('yield.ok') : p.status === 'over' ? t('yield.over') : t('yield.under')]),
              };
            }}
            onTimeRangeChange={handleTimeRange('torque')}
          >
            <TorqueChart data={filteredTorque} />
          </ChartContainer>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <ChartContainer
              title={t('yield.stationDefectRate')}
              onExport={() => ({
                headers: [t('yield.station'), t('yield.defectNumber')],
                rows: stationData.map(d => [d.station, d.defects]),
              })}
              onTimeRangeChange={handleTimeRange('defects')}
            >
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stationData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" tick={{ fill: '#8896A6', fontSize: 10 }} tickLine={false} />
                    <YAxis type="category" dataKey="station" tick={{ fill: '#8896A6', fontSize: 10 }} tickLine={false} width={45} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabel} />
                    <Bar dataKey="defects" name="缺陷數" radius={[0, 4, 4, 0]}>
                      {stationData.map((entry: { defects: number }, i: number) => {
                        const maxDef = Math.max(...stationData.map((s: { defects: number }) => s.defects), 1);
                        const intensity = entry.defects / maxDef;
                        return <Cell key={i} fill={intensity > 0.7 ? '#D9534F' : intensity > 0.4 ? '#E8A838' : '#5BA87A'} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartContainer>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <ChartContainer
              title={t('yield.operatorErrorRank')}
              onExport={() => ({
                headers: ['#', t('monitor.operator'), t('yield.errorCount')],
                rows: operatorData.map((op, i) => [i + 1, op.operator, op.count]),
              })}
              onTimeRangeChange={handleTimeRange('defects')}
            >
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={operatorChartData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" tick={{ fill: '#8896A6', fontSize: 10 }} tickLine={false} />
                    <YAxis type="category" dataKey="operator" tick={{ fill: '#8896A6', fontSize: 10 }} tickLine={false} width={60} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabel}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload[0]) return null;
                        const d = payload[0].payload;
                        return (
                          <div style={tooltipStyle} className="p-2.5 space-y-1">
                            <div className="text-xs font-bold text-white font-mono">{d.operator}</div>
                            <div className="text-[11px] text-white">{t('yield.totalErrors')}：{d.total} {t('yield.timesSuffix')}</div>
                            {d.causes && d.causes.length > 0 && (
                              <div className="border-t border-white/10 pt-1 mt-1">
                                <div className="text-[10px] text-white/70 mb-1">{t('yield.errorCauses')}：</div>
                                {d.causes.map((c: { cause: string; label: string; count: number }) => (
                                  <div key={c.cause} className="flex items-center gap-1.5 text-[10px] font-mono">
                                    <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: CAUSE_COLORS[c.cause] || '#4A5568' }} />
                                    <span className="text-white">{c.label}</span>
                                    <span className="ml-auto text-white/70">{c.count} {t('yield.timesSuffix')}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="total" name={t('yield.errorCount')} radius={[0, 4, 4, 0]}>
                      {operatorChartData.map((_entry, i) => (
                        <Cell key={i} fill={i < 3 ? '#D9534F' : i < 6 ? '#E8A838' : '#4A90C7'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartContainer>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default YieldAnalysisPage;
