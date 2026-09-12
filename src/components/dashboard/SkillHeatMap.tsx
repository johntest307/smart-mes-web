import React, { memo, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AlertTriangle, Users, TrendingUp, Activity, Loader2, Download } from 'lucide-react';
import { useGroqAnalysis } from '../../hooks/useGroqAnalysis';
import type { SkillAnalysisReport } from '../../hooks/useGroqAnalysis';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const LEVEL_COLORS = ['#1A232E', '#5C4033', '#8B7D3C', '#2E6B8A', '#2D8A5A'];
const LEVEL_LABELS = ['未認證', '見習', '合格', '熟練', '師傅'];
const STATIONS = ['ST-01', 'ST-02', 'ST-03', 'ST-04', 'ST-05', 'ST-06', 'ST-07', 'ST-08', 'ST-09', 'ST-10', 'ST-11', 'ST-12', 'ST-13', 'ST-14', 'ST-15', 'ST-16', 'ST-17', 'ST-18', 'ST-19', 'ST-20'];
const EMPLOYEES = 200;
const STATIONS_COUNT = 20;
const VISIBLE_BUFFER = 5;

function generateSkillMatrix() {
  const rows = [];
  for (let ei = 0; ei < EMPLOYEES; ei++) {
    const row = [];
    const specialty1 = Math.floor(Math.random() * STATIONS_COUNT);
    let specialty2 = Math.floor(Math.random() * STATIONS_COUNT);
    while (specialty2 === specialty1) specialty2 = Math.floor(Math.random() * STATIONS_COUNT);
    for (let si = 0; si < STATIONS_COUNT; si++) {
      let level: number;
      if (ei < 20) {
        level = (si === specialty1 || si === specialty2) ? 4 : 3;
      } else if (ei < 60) {
        level = (si === specialty1 || si === specialty2) ? 4 : 3;
      } else if (ei < 110) {
        level = (si === specialty1 || si === specialty2) ? 3 : 2;
      } else if (ei < 150) {
        level = (si === specialty1 || si === specialty2) ? 3 : 2;
      } else {
        level = (si === specialty1 || si === specialty2) ? 2 : 1;
      }
      row.push({
        employeeId: `EMP-${String(ei + 1).padStart(3, '0')}`,
        station: STATIONS[si],
        level: level as 0 | 1 | 2 | 3 | 4,
      });
    }
    rows.push(row);
  }
  return rows;
}

interface AnalysisRow {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  color: string;
  risk?: 'high' | 'medium' | 'low';
}

interface SkillHeatMapProps {
  mode?: 'full' | 'heatmap' | 'analysis';
}

function computeStats(skillMatrixData: ReturnType<typeof generateSkillMatrix>) {
  const levelCounts = [0, 0, 0, 0, 0];
  const stationLevels: number[][] = Array.from({ length: STATIONS_COUNT }, () => []);
  const stationDist: Record<string, number[]> = {};
  STATIONS.forEach(s => { stationDist[s] = [0, 0, 0, 0, 0]; });
  let total = 0;

  for (const row of skillMatrixData) {
    for (const cell of row) {
      levelCounts[cell.level]++;
      stationLevels[STATIONS.indexOf(cell.station)].push(cell.level);
      stationDist[cell.station][cell.level]++;
      total++;
    }
  }

  const pct = (n: number) => ((n / total) * 100).toFixed(1);
  const seniorCount = levelCounts[3] + levelCounts[4];
  const apprenticeCount = levelCounts[1];
  const uncertifiedCount = levelCounts[0];

  const stationAvgs = stationLevels.map((levels, i) => ({
    station: STATIONS[i],
    avg: levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 0,
    noQualified: levels.filter(l => l >= 2).length === 0,
    hasMaster: levels.filter(l => l >= 3).length > 0,
  }));

  const gapStations = stationAvgs.filter(s => s.noQualified);
  const weakStations = stationAvgs.filter(s => s.avg < 1.5 && !s.noQualified);
  const noMasterStations = stationAvgs.filter(s => !s.hasMaster);

  const rows: AnalysisRow[] = [
    {
      label: '總人數', value: `${EMPLOYEES} 人`, detail: '涵蓋 8 個工站的技能矩陣',
      icon: <Users size={16} />, color: '#4A90C7',
    },
    {
      label: '師傅級人數', value: `${levelCounts[4]} 人 (${pct(levelCounts[4])}%)`,
      detail: '等級 4 — 可獨立作業與指導',
      icon: <TrendingUp size={16} />, color: '#2D8A5A',
    },
    {
      label: '熟練級人數', value: `${levelCounts[3]} 人 (${pct(levelCounts[3])}%)`,
      detail: '等級 3 — 可獨立作業',
      icon: <TrendingUp size={16} />, color: '#2E6B8A',
    },
    {
      label: '合格級人數', value: `${levelCounts[2]} 人 (${pct(levelCounts[2])}%)`,
      detail: '等級 2 — 可上線作業',
      icon: <Activity size={16} />, color: '#8B7D3C',
    },
    {
      label: '見習級人數', value: `${levelCounts[1]} 人 (${pct(levelCounts[1])}%)`,
      detail: '等級 1 — 需指導作業',
      icon: <AlertTriangle size={16} />, color: '#5C4033',
      risk: apprenticeCount > seniorCount ? 'high' : 'medium',
    },
    {
      label: '未認證人數', value: `${levelCounts[0]} 人 (${pct(levelCounts[0])}%)`,
      detail: '等級 0 — 不具備該工站資格',
      icon: <AlertTriangle size={16} />, color: '#8896A6',
      risk: uncertifiedCount > total * 0.3 ? 'high' : uncertifiedCount > total * 0.15 ? 'medium' : 'low',
    },
    {
      label: '資深/見習比', value: `${seniorCount}:${apprenticeCount}`,
      detail: `師傅+熟練 ${seniorCount}人 vs 見習 ${apprenticeCount}人`,
      icon: <Users size={16} />, color: '#E8A838',
      risk: seniorCount < apprenticeCount ? 'high' : seniorCount < apprenticeCount * 1.5 ? 'medium' : 'low',
    },
    {
      label: '技能傳承風險',
      value: gapStations.length > 0 ? `${gapStations.length} 站無合格人員` : noMasterStations.length > 0 ? `${noMasterStations.length} 站無師傅級` : '正常',
      detail: gapStations.length > 0
        ? `⚠ ${gapStations.map(s => s.station).join(', ')} 無等級≥2 人員`
        : noMasterStations.length > 0
          ? `${noMasterStations.map(s => s.station).join(', ')} 無師傅/熟練級`
          : '各站均有師傅級人員覆蓋',
      icon: <AlertTriangle size={16} />,
      color: gapStations.length > 0 ? '#E84A4A' : noMasterStations.length > 0 ? '#E8A838' : '#5BA87A',
      risk: gapStations.length > 0 ? 'high' : noMasterStations.length > 0 ? 'medium' : 'low',
    },
  ];

  const stationLevelDist = STATIONS.map(station => ({
    station,
    data: stationDist[station].map((count, level) => ({
      name: LEVEL_LABELS[level], value: count, level, color: LEVEL_COLORS[level],
    })),
  }));

  return { levelCounts, seniorCount, apprenticeCount, stationAvgs, gapStations, weakStations, rows, total, stationLevelDist };
}

const CellView = memo(function CellView({ cell, onHover }: {
  cell: { employeeId: string; station: string; level: number };
  onHover: (v: { emp: string; station: string; level: number } | null) => void;
}) {
  return (
    <div
      className="relative rounded cursor-default flex items-center justify-center"
      style={{
        background: LEVEL_COLORS[cell.level],
        border: cell.level === 0 ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(255,255,255,0.1)',
        aspectRatio: '1',
        minHeight: '28px',
      }}
      onMouseEnter={() => onHover({ emp: cell.employeeId, station: cell.station, level: cell.level })}
      onMouseLeave={() => onHover(null)}
    >
      <span className="text-[10px] font-bold" style={{
        color: cell.level === 0 ? '#3A4A5A' : '#E8ECEF',
        opacity: cell.level === 0 ? 0.3 : 1,
      }}>
        {cell.level || '─'}
      </span>
    </div>
  );
});

const SkillHeatMap: React.FC<SkillHeatMapProps> = memo(({ mode = 'full' }) => {
  const [tooltip, setTooltip] = useState<{ emp: string; station: string; level: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  const skillMatrixData = useMemo(() => generateSkillMatrix(), []);

  const stats = useMemo(() => computeStats(skillMatrixData), []);

  const { report: groqReport, loading: groqLoading, error: groqError } = useGroqAnalysis(skillMatrixData, mode === 'analysis', stats);

  const handleDownloadXlsx = useCallback(async () => {
    const { exportCSV } = await import('../../utils/csvExport');
    const levelNames = ['未認證', '見習', '合格', '熟練', '師傅'];
    const header = [
      '員工編號', '平均等級', '最強工站', '最弱工站', '需關注',
      ...STATIONS.map(s => `${s} 等級`), ...STATIONS.map(s => `${s} 狀態`)
    ];
    const rows = skillMatrixData.map(row => {
      const levels: number[] = row.map(c => c.level);
      const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
      const max = Math.max(...levels);
      const min = Math.min(...levels);
      const maxStations = row.filter(c => c.level === max).map(c => c.station).join('/');
      const minStations = row.filter(c => c.level === min).map(c => c.station).join('/');
      const needsAttention = min < 2 ? '是' : '否';
      const statuses = row.map(c => levelNames[c.level]);
      return [row[0].employeeId, avg.toFixed(1), maxStations, minStations, needsAttention, ...levels, ...statuses];
    });
    exportCSV(header, rows, '技能矩陣報表.csv');
  }, [skillMatrixData]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => { setScrollTop(el.scrollTop); setContainerHeight(el.clientHeight); };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const rowHeight = 32;
  const totalHeight = skillMatrixData.length * rowHeight;
  const visibleStart = Math.max(0, Math.floor(scrollTop / rowHeight) - VISIBLE_BUFFER);
  const visibleEnd = Math.min(skillMatrixData.length, Math.ceil((scrollTop + containerHeight) / rowHeight) + VISIBLE_BUFFER);
  const visibleRows = skillMatrixData.slice(visibleStart, visibleEnd);

  return (
    <div className="space-y-6">
      {mode !== 'analysis' && <div className="overflow-x-auto">
        <div className="flex flex-wrap items-center gap-3 mb-2 pb-2 border-b border-white/5">
          <div className="flex items-center gap-1.5 text-xs font-mono mr-2">
            {LEVEL_LABELS.map((label, i) => (
              <span key={i} className="flex items-center gap-0.5 px-1 py-0.5 rounded" style={{ background: `${LEVEL_COLORS[i]}20` }}>
                <span className="w-2.5 h-2.5 rounded inline-block" style={{ background: LEVEL_COLORS[i] }} />
                <span className="text-text-muted">{i}</span>
                <span className="text-text-primary font-bold">{label}</span>
                <span className="text-text-muted/60">{stats.levelCounts[i]}</span>
              </span>
            ))}
          </div>
          <button onClick={handleDownloadXlsx}
            className="flex items-center gap-1 text-[10px] font-mono text-accent-blue hover:text-accent-blue/80 transition-colors ml-auto">
            <Download size={12} /> CSV
          </button>
        </div>
        <div className="grid mb-1" style={{ gridTemplateColumns: `80px repeat(${STATIONS_COUNT}, 1fr)`, gap: '3px' }}>
          <div />
          {STATIONS.map(s => (
            <div key={s} className="text-[10px] text-center text-text-muted font-mono">{s}</div>
          ))}
        </div>
        <div ref={scrollRef} className="max-h-[600px] overflow-y-auto" style={{ willChange: 'scroll-position' }}>
          <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
            {visibleRows.map((row, vi) => {
              const ei = visibleStart + vi;
              return (
                <div
                  key={ei}
                  className="grid"
                  style={{
                    gridTemplateColumns: `80px repeat(${STATIONS_COUNT}, 1fr)`,
                    gap: '3px',
                    position: 'absolute',
                    top: `${ei * rowHeight}px`,
                    left: 0,
                    right: 0,
                    height: `${rowHeight}px`,
                  }}
                >
                  <div className="text-[10px] text-text-muted font-mono flex items-center pr-1 truncate">
                    {row[0].employeeId}
                  </div>
                  {row.map((cell, si) => (
                    <CellView key={si} cell={cell} onHover={setTooltip} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
        {tooltip && (
          <div className="fixed z-50 pointer-events-none" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <div className="bg-surface border border-white/20 rounded-lg px-3 py-2 text-xs shadow-xl">
              <div className="font-bold text-text-primary">{tooltip.emp} × {tooltip.station}</div>
              <div className="text-text-muted mt-0.5">
                等級 {tooltip.level} — <span style={{ color: tooltip.level === 0 ? '#8896A6' : '#E8ECEF' }}>{LEVEL_LABELS[tooltip.level]}</span>
              </div>
            </div>
          </div>
        )}
      </div>}

      {/* Analysis Panel */}
      {mode !== 'heatmap' && (groqLoading ? (
        <div className="border border-white/10 rounded-xl bg-surface/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Activity size={16} className="text-accent-blue" />
              技能矩陣現況分析
            </h3>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="text-accent-blue animate-spin mr-3" />
            <span className="text-text-muted text-sm">LLM 分析中...</span>
          </div>
        </div>
      ) : groqError && mode === 'analysis' ? (
        <div className="border border-white/10 rounded-xl bg-surface/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Activity size={16} className="text-accent-blue" />
              技能矩陣現況分析 <span className="text-[10px] text-danger font-mono ml-2">(LLM 異常，使用靜態分析)</span>
            </h3>
          </div>
          <StaticAnalysis analysis={stats} stationsCount={STATIONS_COUNT} />
        </div>
      ) : groqReport && mode === 'analysis' ? (
        <GroqAnalysisPanel report={groqReport} stationLevelDist={stats.stationLevelDist} />
      ) : (
        <div className="border border-white/10 rounded-xl bg-surface/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Activity size={16} className="text-accent-blue" />
              技能矩陣現況分析
            </h3>
          </div>
          <StaticAnalysis analysis={stats} stationsCount={STATIONS_COUNT} />
        </div>
      ))}
    </div>
  );
});

const riskBadge = (risk?: 'high' | 'medium' | 'low') => {
  if (!risk) return null;
  const map = {
    high: { bg: 'bg-red-500/15', text: 'text-red-400', label: '高風險' },
    medium: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: '需關注' },
    low: { bg: 'bg-green-500/15', text: 'text-green-400', label: '正常' },
  };
  const m = map[risk];
  return <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${m.bg} ${m.text}`}>{m.label}</span>;
};

const StaticAnalysis: React.FC<{ analysis: ReturnType<typeof Object>; stationsCount: number }> = ({ analysis, stationsCount }) => {
  const a = analysis as any;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5">
        {[
          { label: '總認證數', value: `${a.total - a.levelCounts[0]}`, sub: `${((1 - a.levelCounts[0] / a.total) * 100).toFixed(1)}% 持有率`, color: '#4A90C7' },
          { label: '師傅+熟練', value: `${a.seniorCount}`, sub: `${((a.seniorCount / a.total) * 100).toFixed(1)}% 佔比`, color: '#2D8A5A' },
          { label: '見習', value: `${a.apprenticeCount}`, sub: `${((a.apprenticeCount / a.total) * 100).toFixed(1)}% 佔比`, color: '#5C4033' },
          { label: '無人員缺口站', value: `${stationsCount - a.gapStations.length} / ${stationsCount}`, sub: a.gapStations.length === 0 ? '全站覆蓋' : `缺口: ${a.gapStations.map((s: any) => s.station).join(', ')}`, color: a.gapStations.length === 0 ? '#5BA87A' : '#E84A4A' },
        ].map((item, i) => (
          <div key={i} className="px-4 py-3 bg-base">
            <div className="text-[10px] text-text-muted font-mono">{item.label}</div>
            <div className="text-lg font-bold font-mono mt-0.5" style={{ color: item.color }}>{item.value}</div>
            <div className="text-[10px] text-text-muted mt-0.5 truncate">{item.sub}</div>
          </div>
        ))}
      </div>
      <div className="divide-y divide-white/5">
        {a.rows.map((row: any, i: number) => (
          <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span style={{ color: row.color }}>{row.icon}</span>
              <div className="min-w-0">
                <div className="text-xs font-medium text-text-primary">{row.label}</div>
                <div className="text-[10px] text-text-muted truncate">{row.detail}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-bold font-mono text-text-primary">{row.value}</span>
              {riskBadge(row.risk)}
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-white/5">
        <div className="text-[10px] font-mono text-text-muted mb-2">各工站平均技能等級</div>
        <div className="flex flex-wrap gap-2">
          {a.stationAvgs.map((s: any, i: number) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <span className="font-mono text-text-muted">{s.station}</span>
              <div className="w-16 h-2 rounded-full bg-base overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{
                  width: `${(s.avg / 4) * 100}%`,
                  background: s.avg >= 2.5 ? '#2D8A5A' : s.avg >= 1.5 ? '#8B7D3C' : '#5C4033',
                }} />
              </div>
              <span className="font-mono" style={{ color: s.avg >= 2.5 ? '#5BA87A' : s.avg >= 1.5 ? '#E8A838' : '#C9975E' }}>
                {s.avg.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5">
        <div className="text-[10px] font-mono text-text-muted mb-1">分析結論</div>
        <p className="text-xs text-text-primary leading-relaxed">
          {a.gapStations.length > 0
            ? `⚠ 高風險：${a.gapStations.map((s: any) => s.station).join('、')} 目前無合格（等級≥2）人員，需立即安排培訓或調度。`
            : a.weakStations.length > 0
              ? `⚠ 需關注：${a.weakStations.map((s: any) => s.station).join('、')} 平均等級偏低（<1.5），建議安排師傅級人員帶領。`
              : '✓ 各工站均有合格人員覆蓋。'}
          {' '}{a.seniorCount < a.apprenticeCount
            ? `資深人員（${a.seniorCount}人）少於見習人員（${a.apprenticeCount}人），技能傳承壓力較大，建議加速見習人員培訓。`
            : a.seniorCount < a.apprenticeCount * 1.5
              ? `資深/見習比 ${a.seniorCount}:${a.apprenticeCount} 略低，建議維持培訓節奏。`
              : `資深/見習比 ${a.seniorCount}:${a.apprenticeCount} 合理，技能傳承結構穩健。`}
          {a.levelCounts[0] > a.total * 0.2
            ? ` 未認證比例偏高（${((a.levelCounts[0] / a.total) * 100).toFixed(1)}%），建議優先安排認證考試。`
            : ''}
        </p>
      </div>
    </>
  );
};

const GroqAnalysisPanel: React.FC<{ report: SkillAnalysisReport; stationLevelDist?: { station: string; data: { name: string; value: number; level: number; color: string }[] }[] }> = ({ report, stationLevelDist }) => {
  const levelColors = ['#8896A6', '#5C4033', '#8B7D3C', '#2E6B8A', '#2D8A5A'];
  const levelDescriptions = ['不具備資格', '需指導作業', '可獨立上線', '可指導他人', '專家級可審核'];

  return (
    <div className="border border-white/10 rounded-xl bg-surface/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
          <Activity size={16} className="text-accent-blue" />
          技能矩陣現況分析 <span className="text-[10px] text-accent-green font-mono ml-2">(LLM 分析)</span>
        </h3>
      </div>

      {/* 標準說明 */}
      <details open className="px-4 py-2 border-b border-white/5 group cursor-pointer">
        <summary className="text-[10px] font-mono text-text-muted hover:text-text-primary transition-colors">
          ⓘ 評估標準說明
        </summary>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-text-muted">
          <div className="flex items-start gap-1.5"><span className="text-accent-blue shrink-0">▸</span>各工站平均等級：&ge;2.5 良好、1.5~2.4 普通、&lt;1.5 偏低</div>
          <div className="flex items-start gap-1.5"><span className="text-accent-blue shrink-0">▸</span>資深人員：等級 3 (熟練) 或 4 (師傅) 的員工</div>
          <div className="flex items-start gap-1.5"><span className="text-accent-blue shrink-0">▸</span>技能傳承比：資深/見習 &ge;1.5 穩健、1.0~1.49 需關注、&lt;1.0 高風險</div>
          <div className="flex items-start gap-1.5"><span className="text-accent-blue shrink-0">▸</span>人員缺口：該工站無合格（等級&ge;2）人員即為缺口</div>
          <div className="flex items-start gap-1.5"><span className="text-accent-blue shrink-0">▸</span>無師傅級：該工站無師傅或熟練（等級&ge;3）人員</div>
          <div className="flex items-start gap-1.5"><span className="text-accent-blue shrink-0">▸</span>風險判定：高風險(紅)、需關注(黃)、正常(綠)</div>
        </div>
      </details>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5">
        {[
          { label: '總認證數', value: report.summary.totalCertifications.toString(), sub: `${report.summary.certificationRate} 持有率`, color: '#4A90C7' },
          { label: '師傅+熟練', value: report.summary.seniorCount.toString(), sub: `${report.summary.seniorPct} 佔比`, color: '#2D8A5A' },
          { label: '見習', value: report.summary.apprenticeCount.toString(), sub: `${report.summary.apprenticePct} 佔比`, color: '#5C4033' },
          { label: '資深/見習比', value: report.seniorApprenticeRatio.ratio, sub: report.seniorApprenticeRatio.assessment, color: '#E8A838' },
        ].map((item, i) => (
          <div key={i} className="px-4 py-3 bg-base">
            <div className="text-[10px] text-text-muted font-mono">{item.label}</div>
            <div className="text-lg font-bold font-mono mt-0.5" style={{ color: item.color }}>{item.value}</div>
            <div className="text-[10px] text-text-muted mt-0.5 truncate">{item.sub}</div>
          </div>
        ))}
      </div>

      <div className="divide-y divide-white/5">
        {report.levelDistribution.filter(d => d.level > 0).map((d, i) => (
          <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-3 h-3 rounded flex-shrink-0" style={{ background: levelColors[d.level] }} />
              <div className="min-w-0">
                <div className="text-xs font-medium text-text-primary">{d.label} <span className="text-text-muted font-normal">— 等級 {d.level}</span></div>
                <div className="text-[10px] text-text-muted truncate">{d.count} 人 ({d.percentage}) · {levelDescriptions[d.level]}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-20 h-2 rounded-full bg-base overflow-hidden">
                <div className="h-full rounded-full" style={{ width: d.percentage, background: levelColors[d.level] }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-white/5">
        <div className="text-[10px] font-mono text-text-muted mb-2">各工站分析</div>
        <div className="flex flex-wrap gap-2">
          {report.stationAnalysis.map((s, i) => (
            <div key={i} className="px-2 py-1 rounded border border-white/10 text-xs" style={{ borderColor: s.hasMaster ? '#2D8A5A40' : s.hasQualified ? '#8B7D3C40' : '#5C403340' }}>
              <div className="font-mono text-text-primary font-bold">{s.station}</div>
              <div className="text-text-muted text-[10px]">平均 {s.averageLevel.toFixed(1)}</div>
              <div className="text-text-muted text-[10px] truncate max-w-32">{s.assessment}</div>
            </div>
          ))}
        </div>
      </div>

      {stationLevelDist && (
        <div className="px-4 py-3 border-t border-white/5">
          <div className="text-[10px] font-mono text-text-muted mb-3">各工站等級佔比</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stationLevelDist.map(({ station, data }) => {
              const total = data.reduce((s, d) => s + d.value, 0);
              if (total === 0) return null;
              return (
                <div key={station} className="flex flex-col items-center">
                  <span className="text-[10px] font-mono text-text-muted mb-1">{station}</span>
                  <ResponsiveContainer width="100%" height={80}>
                    <PieChart>
                      <Pie data={data} cx="50%" cy="50%" innerRadius={20} outerRadius={35} dataKey="value" paddingAngle={1}>
                        {data.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-1.5 mt-1 justify-center">
                    {data.filter(d => d.value > 0).map((d, idx) => (
                      <span key={idx} className="text-[8px] font-mono flex items-center gap-0.5" style={{ color: d.color }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: d.color }} />
                        {d.name}({d.value})
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {report.gaps.length > 0 && (
        <div className="divide-y divide-white/5">
          {report.gaps.map((g, i) => (
            <div key={i} className="px-4 py-2 flex items-start gap-2">
              <span className={`text-[10px] font-mono px-1 py-0.5 rounded flex-shrink-0 ${g.type === 'high' ? 'bg-red-500/15 text-red-400' : g.type === 'medium' ? 'bg-amber-500/15 text-amber-400' : 'bg-green-500/15 text-green-400'}`}>
                {g.type === 'high' ? '高風險' : g.type === 'medium' ? '需關注' : '正常'}
              </span>
              <div>
                <div className="text-xs text-text-primary">{g.description}</div>
                {g.affectedStations.length > 0 && (
                  <div className="text-[10px] text-text-muted font-mono">{g.affectedStations.join(', ')}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5">
        <div className="text-[10px] font-mono text-text-muted mb-1">分析結論</div>
        <p className="text-xs text-text-primary leading-relaxed">{report.conclusion}</p>
      </div>
    </div>
  );
};

export default SkillHeatMap;
