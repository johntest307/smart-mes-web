import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  Download, Upload, FileSpreadsheet, BarChart3, PieChart as PieIcon,
  TrendingUp, AlertTriangle, Loader2, RotateCcw, Target, Grid3X3,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ScatterChart, Scatter, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from 'recharts';

const API_BASE = 'http://localhost:8006';

const PRIORITY_COLORS: Record<string, string> = {
  P1: '#EF4444', P2: '#F59E0B', P3: '#3B82F6', P4: '#10B981',
};
const PIE_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6'];

interface PainPoint {
  痛點描述: string; 部門: string; 根本原因: string;
  影響: number; 緊迫: number; 可行: number;
  預估工時(人天): number; 影響客戶數: number;
  加權分: number; 優先級: string; 'AI 修復建議': string;
}

interface Theme {
  title: string; count: number; roi: number; dept: string;
  root_cause: string; recommendation: string;
  items: { 痛點描述: string; 加權分: number; 優先級: string }[];
}

interface ImpactEffortItem {
  name: string; dept: string; impact: number; effort: number;
  customer_impact: number; weighted: number; priority: string;
}

interface AnalysisResult {
  summary: {
    total: number; avg_impact: number; avg_urgency: number;
    avg_feasibility: number; avg_weighted: number;
    p1_count: number; p2_count: number; p3_count: number; p4_count: number;
    p1_pct: number;
  };
  critical_dept: string;
  themes: Theme[];
  dept_distribution: { name: string; value: number }[];
  priority_distribution: { name: string; value: number }[];
  dept_avg_scores: Record<string, { 影響: number; 緊迫: number; 可行: number; 加權分: number }>;
  top10: PainPoint[];
  scatter_data: PainPoint[];
  impact_effort_data: ImpactEffortItem[];
  radar_data: {
    department: string; impact: number; urgency: number;
    feasibility: number; weighted: number; count: number;
  }[];
  all_records: PainPoint[];
}

const tooltipStyle = {
  contentStyle: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: '#e2e8f0' },
  itemStyle: { color: '#e2e8f0' },
};

const StatCard: React.FC<{ label: string; value: string | number; color?: string; icon: React.ReactNode }> = ({ label, value, color, icon }) => (
  <div className="bg-[#1e293b] border border-white/10 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-gray-400">{icon}</span>
      <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
    </div>
    <div className={`text-2xl font-bold ${color || 'text-white'}`}>{value}</div>
  </div>
);

const priorityOrder = ['P1', 'P2', 'P3', 'P4'];

// Quadrant colors for the 2x2 matrix
const QUADRANT_COLORS = {
  quickWin: '#10B981',    // High Impact, Low Effort
  strategic: '#3B82F6',   // High Impact, High Effort
  fillIn: '#F59E0B',      // Low Impact, Low Effort
  avoid: '#EF4444',       // Low Impact, High Effort
};

export default function OldBapmPage() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filename, setFilename] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'matrix' | 'analysis' | 'top10' | 'table'>('overview');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/template`);
      if (!resp.ok) throw new Error('Download failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bapm_template_50.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('下載範本失敗，請確認後端服務是否啟動 (port 8006)');
    }
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    setLoading(true);
    setError('');
    setFilename(file.name);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: formData });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || 'Upload failed');
      }
      const result = await resp.json();
      setAnalysis(result.analysis);
      setSessionId(result.session_id);
      setActiveSubTab('overview');
    } catch (e: any) {
      setError(e.message || '上傳失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setAnalysis(null);
    setSessionId(null);
    setFilename('');
    setActiveSubTab('overview');
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  }, [handleUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);

  const radarChartData = useMemo(() => {
    if (!analysis) return [];
    return analysis.radar_data.map(d => ({
      department: d.department, 影響: d.impact, 緊迫: d.urgency, 可行: d.feasibility,
    }));
  }, [analysis]);

  const priorityBarData = useMemo(() => {
    if (!analysis) return [];
    return priorityOrder
      .filter(p => analysis.priority_distribution.some(d => d.name === p))
      .map(p => {
        const item = analysis.priority_distribution.find(d => d.name === p);
        return { name: p, value: item?.value || 0, fill: PRIORITY_COLORS[p] };
      });
  }, [analysis]);

  const scatterFormatted = useMemo(() => {
    if (!analysis) return [];
    return analysis.scatter_data.map(d => ({
      x: d.影響, y: d.緊迫, z: d.加權分,
      name: d.痛點描述?.substring(0, 20), dept: d.部門, priority: d.優先級,
    }));
  }, [analysis]);

  // Impact vs Effort matrix data with quadrant classification
  const matrixData = useMemo(() => {
    if (!analysis?.impact_effort_data) return { quickWins: [], strategic: [], fillIns: [], avoid: [], medianImpact: 5, medianEffort: 20, scatterPoints: [] };
    const items = analysis.impact_effort_data;
    const medianImpact = items.length > 0
      ? items.map(i => i.impact).sort((a, b) => a - b)[Math.floor(items.length / 2)]
      : 5;
    const medianEffort = items.length > 0
      ? items.map(i => i.effort).sort((a, b) => a - b)[Math.floor(items.length / 2)]
      : 20;

    const quickWins: ImpactEffortItem[] = [];
    const strategic: ImpactEffortItem[] = [];
    const fillIns: ImpactEffortItem[] = [];
    const avoid: ImpactEffortItem[] = [];

    items.forEach(item => {
      if (item.impact >= medianImpact && item.effort <= medianEffort) quickWins.push(item);
      else if (item.impact >= medianImpact && item.effort > medianEffort) strategic.push(item);
      else if (item.impact < medianImpact && item.effort <= medianEffort) fillIns.push(item);
      else avoid.push(item);
    });

    const scatterPoints = items.map(item => {
      let quadrant = 'fillIn';
      let color = QUADRANT_COLORS.fillIn;
      if (item.impact >= medianImpact && item.effort <= medianEffort) { quadrant = 'quickWin'; color = QUADRANT_COLORS.quickWin; }
      else if (item.impact >= medianImpact && item.effort > medianEffort) { quadrant = 'strategic'; color = QUADRANT_COLORS.strategic; }
      else if (item.impact < medianImpact && item.effort > medianEffort) { quadrant = 'avoid'; color = QUADRANT_COLORS.avoid; }
      return { ...item, quadrant, color };
    });

    return { quickWins, strategic, fillIns, avoid, medianImpact, medianEffort, scatterPoints };
  }, [analysis]);

  const subTabs = [
    { key: 'overview', label: '總覽' },
    { key: 'matrix', label: 'Impact vs Effort', icon: <Grid3X3 size={12} /> },
    { key: 'analysis', label: '綜合分析' },
    { key: 'top10', label: 'TOP10 痛點' },
    { key: 'table', label: '完整清單' },
  ] as const;

  return (
    <div
      className="min-h-screen bg-[#0f172a] text-white"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />

      {/* ===== HEADER BAR ===== */}
      <div className="sticky top-0 z-10 bg-[#0f172a]/95 backdrop-blur border-b border-white/10 px-4 md:px-6 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold flex items-center gap-1.5">
              <BarChart3 className="text-blue-400" size={15} /> 跨部門痛點分析
            </h1>
            {filename && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <FileSpreadsheet size={11} /> {filename}
                <span className="text-green-400">({analysis?.summary.total || 0} 筆)</span>
              </span>
            )}
            {sessionId && (
              <button onClick={handleReset} className="flex items-center gap-1 px-1.5 py-0.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors">
                <RotateCcw size={11} /> 重置
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-colors"
            >
              <Download size={12} /> 下載範本
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600/80 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              <Upload size={12} /> 上傳 XLSX
            </button>
          </div>
        </div>
      </div>

      {/* ===== ERROR ===== */}
      {error && (
        <div className="mx-4 md:mx-6 mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* ===== LOADING ===== */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-blue-400" />
          <span className="ml-3 text-gray-400 text-sm">正在分析痛點資料並生成戰略報告...</span>
        </div>
      )}

      {/* ===== EMPTY STATE ===== */}
      {!analysis && !loading && (
        <div className="px-4 md:px-6 py-16">
          <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center hover:border-blue-400/30 transition-colors">
            <Upload size={40} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 text-lg mb-1">拖放 XLSX 檔案到此處</p>
            <p className="text-gray-600 text-sm mb-4">或點擊右上角「上傳 XLSX」按鈕選擇檔案</p>
            <button
              onClick={handleDownloadTemplate}
              className="text-blue-400 text-sm hover:underline"
            >
              先下載範本填寫 →
            </button>
          </div>
        </div>
      )}

      {/* ===== CHARTS (after upload) ===== */}
      {analysis && !loading && (
        <div className="px-4 md:px-6 py-4 space-y-4">
          {/* Sub Tabs */}
          <div className="flex gap-1 border-b border-white/10 pb-1 overflow-x-auto">
            {subTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-t-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeSubTab === tab.key
                    ? 'bg-[#1e293b] text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ===== Overview ===== */}
          {activeSubTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="痛點總數" value={analysis.summary.total} icon={<FileSpreadsheet size={14} />} />
                <StatCard label="P1 緊急" value={analysis.summary.p1_count} color="text-red-400" icon={<AlertTriangle size={14} />} />
                <StatCard label="平均加權分" value={analysis.summary.avg_weighted} color="text-yellow-400" icon={<TrendingUp size={14} />} />
                <StatCard label="關鍵部門" value={analysis.critical_dept} color="text-purple-400" icon={<PieIcon size={14} />} />
              </div>

              {analysis.themes && analysis.themes.length > 0 && (
                <div className="bg-[#1e293b] border border-blue-500/30 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                    <Target size={15} /> AI 戰略聚類分析
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    系統已將 {analysis.summary.total} 個痛點收斂為 {analysis.themes.length} 個核心戰略主題
                  </p>
                  <div className="space-y-3">
                    {analysis.themes.map((theme, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-blue-400">{theme.title}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">{theme.count} 項</span>
                          </div>
                          <span className="text-xs font-bold text-green-400">ROI: {theme.roi}</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-1"><strong>根因:</strong> {theme.root_cause}</p>
                        <p className="text-xs text-gray-400 mb-2"><strong>建議:</strong> {theme.recommendation}</p>
                        <div className="flex flex-wrap gap-1">
                          {theme.items.map((item, j) => (
                            <span key={j} className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-gray-300 max-w-[200px] truncate">
                              {item.痛點描述.substring(0, 25)}...
                              <span className="ml-1" style={{ color: PRIORITY_COLORS[item.優先級] }}>{item.優先級}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-[#1e293b] border border-white/10 rounded-xl p-5">
                <h3 className="text-xs font-semibold text-gray-300 mb-3">優先級分佈</h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priorityBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                      <Tooltip {...tooltipStyle} />
                      <Bar dataKey="value" name="數量" radius={[4, 4, 0, 0]}>
                        {priorityBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#1e293b] border border-white/10 rounded-xl p-5">
                  <h3 className="text-xs font-semibold text-gray-300 mb-3">部門分佈</h3>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={analysis.dept_distribution} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {analysis.dept_distribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip {...tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-[#1e293b] border border-white/10 rounded-xl p-5">
                  <h3 className="text-xs font-semibold text-gray-300 mb-3">部門維度雷達圖</h3>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarChartData}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="department" tick={{ fill: '#9CA3AF', fontSize: 9 }} />
                        <PolarRadiusAxis tick={{ fill: '#9CA3AF', fontSize: 9 }} />
                        <Radar name="影響" dataKey="影響" stroke="#EF4444" fill="#EF4444" fillOpacity={0.15} />
                        <Radar name="緊迫" dataKey="緊迫" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} />
                        <Radar name="可行" dataKey="可行" stroke="#10B981" fill="#10B981" fillOpacity={0.15} />
                        <Legend wrapperStyle={{ fontSize: 10, color: '#9CA3AF' }} />
                        <Tooltip {...tooltipStyle} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== Impact vs Effort Matrix ===== */}
          {activeSubTab === 'matrix' && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Quick Wins" value={matrixData.quickWins.length} color="text-emerald-400" icon={<Target size={14} />} />
                <StatCard label="Strategic" value={matrixData.strategic.length} color="text-blue-400" icon={<Target size={14} />} />
                <StatCard label="Fill-in" value={matrixData.fillIns.length} color="text-yellow-400" icon={<Target size={14} />} />
                <StatCard label="Avoid" value={matrixData.avoid.length} color="text-red-400" icon={<Target size={14} />} />
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: QUADRANT_COLORS.quickWin }}></span> Quick Win ({matrixData.quickWins.length})</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: QUADRANT_COLORS.strategic }}></span> Strategic Initiative ({matrixData.strategic.length})</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: QUADRANT_COLORS.fillIn }}></span> Fill-in ({matrixData.fillIns.length})</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: QUADRANT_COLORS.avoid }}></span> Avoid / Postpone ({matrixData.avoid.length})</span>
              </div>

              {/* 2x2 Matrix Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Quick Wins */}
                <div className="bg-[#1e293b] border-2 rounded-xl p-4" style={{ borderColor: QUADRANT_COLORS.quickWin + '60' }}>
                  <h4 className="text-sm font-bold mb-2" style={{ color: QUADRANT_COLORS.quickWin }}>Quick Wins</h4>
                  <p className="text-xs text-gray-500 mb-3">高影響、低工時 — 立即處理</p>
                  <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
                    {matrixData.quickWins.length === 0 && <p className="text-xs text-gray-600">無</p>}
                    {matrixData.quickWins.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-1.5 bg-white/5 rounded text-xs">
                        <div className="flex-1 min-w-0 truncate">
                          <span className="text-gray-300">{item.name}</span>
                          <span className="text-gray-500 ml-1">({item.dept})</span>
                        </div>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          <span className="text-gray-400">{item.effort}d</span>
                          <span className="text-green-400 font-bold">{item.weighted}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strategic */}
                <div className="bg-[#1e293b] border-2 rounded-xl p-4" style={{ borderColor: QUADRANT_COLORS.strategic + '60' }}>
                  <h4 className="text-sm font-bold mb-2" style={{ color: QUADRANT_COLORS.strategic }}>Strategic Initiatives</h4>
                  <p className="text-xs text-gray-500 mb-3">高影響、高工時 — 規劃執行</p>
                  <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
                    {matrixData.strategic.length === 0 && <p className="text-xs text-gray-600">無</p>}
                    {matrixData.strategic.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-1.5 bg-white/5 rounded text-xs">
                        <div className="flex-1 min-w-0 truncate">
                          <span className="text-gray-300">{item.name}</span>
                          <span className="text-gray-500 ml-1">({item.dept})</span>
                        </div>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          <span className="text-gray-400">{item.effort}d</span>
                          <span className="text-blue-400 font-bold">{item.weighted}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fill-ins */}
                <div className="bg-[#1e293b] border-2 rounded-xl p-4" style={{ borderColor: QUADRANT_COLORS.fillIn + '60' }}>
                  <h4 className="text-sm font-bold mb-2" style={{ color: QUADRANT_COLORS.fillIn }}>Fill-in</h4>
                  <p className="text-xs text-gray-500 mb-3">低影響、低工時 — 有空再做</p>
                  <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
                    {matrixData.fillIns.length === 0 && <p className="text-xs text-gray-600">無</p>}
                    {matrixData.fillIns.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-1.5 bg-white/5 rounded text-xs">
                        <div className="flex-1 min-w-0 truncate">
                          <span className="text-gray-300">{item.name}</span>
                          <span className="text-gray-500 ml-1">({item.dept})</span>
                        </div>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          <span className="text-gray-400">{item.effort}d</span>
                          <span className="text-yellow-400 font-bold">{item.weighted}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Avoid */}
                <div className="bg-[#1e293b] border-2 rounded-xl p-4" style={{ borderColor: QUADRANT_COLORS.avoid + '60' }}>
                  <h4 className="text-sm font-bold mb-2" style={{ color: QUADRANT_COLORS.avoid }}>Avoid / Postpone</h4>
                  <p className="text-xs text-gray-500 mb-3">低影響、高工時 — 暫緩或放棄</p>
                  <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
                    {matrixData.avoid.length === 0 && <p className="text-xs text-gray-600">無</p>}
                    {matrixData.avoid.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-1.5 bg-white/5 rounded text-xs">
                        <div className="flex-1 min-w-0 truncate">
                          <span className="text-gray-300">{item.name}</span>
                          <span className="text-gray-500 ml-1">({item.dept})</span>
                        </div>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          <span className="text-gray-400">{item.effort}d</span>
                          <span className="text-red-400 font-bold">{item.weighted}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scatter version of the matrix */}
              <div className="bg-[#1e293b] border border-white/10 rounded-xl p-5">
                <h3 className="text-xs font-semibold text-gray-300 mb-1">Impact vs Effort 散佈圖</h3>
                <p className="text-xs text-gray-500 mb-3">X = 預估工時(人天), Y = 影響程度 — 中位數分界線劃分四象限</p>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" dataKey="effort" name="工時" tick={{ fill: '#9CA3AF', fontSize: 11 }}
                        label={{ value: '預估工時 (人天)', position: 'insideBottom', offset: -15, fill: '#9CA3AF' }} />
                      <YAxis type="number" dataKey="impact" name="影響" tick={{ fill: '#9CA3AF', fontSize: 11 }}
                        label={{ value: '影響程度', angle: -90, position: 'insideLeft', offset: 10, fill: '#9CA3AF' }} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }}
                        formatter={(value: any, name: string) => [value, name === 'effort' ? '工時(天)' : name === 'impact' ? '影響' : '客戶數']}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''}
                        contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                      <Scatter
                        name="痛點"
                        data={matrixData.scatterPoints}
                        shape={(props: any) => {
                          const { cx, cy, payload } = props;
                          if (!cx || !cy) return null;
                          return (
                            <circle
                              cx={cx} cy={cy} r={5}
                              fill={payload.color || QUADRANT_COLORS.fillIn}
                              fillOpacity={0.75}
                              stroke="rgba(255,255,255,0.2)"
                              strokeWidth={1}
                            />
                          );
                        }}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ===== 綜合分析 (部門 + 優先級 + 緊迫矩陣) ===== */}
          {activeSubTab === 'analysis' && (
            <div className="space-y-6">
              {/* Priority Section */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">優先級分佈</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {priorityOrder.map(p => {
                    const item = analysis.priority_distribution.find(d => d.name === p);
                    const count = item?.value || 0;
                    return (
                      <div key={p} className="bg-[#1e293b] border border-white/10 rounded-xl p-3 text-center">
                        <div className="text-xs text-gray-400 mb-1">{p} 級</div>
                        <div className="text-2xl font-bold" style={{ color: PRIORITY_COLORS[p] }}>{count}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{(count / analysis.summary.total * 100).toFixed(1)}%</div>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-[#1e293b] border border-white/10 rounded-xl p-5 mt-3">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={priorityBarData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                        <Tooltip {...tooltipStyle} />
                        <Bar dataKey="value" name="數量" radius={[6, 6, 0, 0]}>
                          {priorityBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10" />

              {/* Dept Section */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">部門分析</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 bg-[#1e293b] border border-white/10 rounded-xl p-5">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-2 px-3 text-gray-400">部門</th>
                            <th className="text-center py-2 px-3 text-gray-400">痛點數</th>
                            <th className="text-center py-2 px-3 text-gray-400">平均影響</th>
                            <th className="text-center py-2 px-3 text-gray-400">平均緊迫</th>
                            <th className="text-center py-2 px-3 text-gray-400">平均可行</th>
                            <th className="text-center py-2 px-3 text-gray-400">加權分</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...analysis.radar_data].sort((a, b) => b.weighted - a.weighted).map(d => (
                            <tr key={d.department} className="border-b border-white/5 hover:bg-white/5">
                              <td className="py-2 px-3 font-medium">{d.department}</td>
                              <td className="py-2 px-3 text-center">{d.count}</td>
                              <td className="py-2 px-3 text-center">{d.impact}</td>
                              <td className="py-2 px-3 text-center">{d.urgency}</td>
                              <td className="py-2 px-3 text-center">{d.feasibility}</td>
                              <td className="py-2 px-3 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                                  d.weighted >= 7.5 ? 'bg-red-500/20 text-red-400' :
                                  d.weighted >= 6.5 ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-blue-500/20 text-blue-400'
                                }`}>{d.weighted}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="bg-[#1e293b] border border-white/10 rounded-xl p-5">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarChartData}>
                          <PolarGrid stroke="rgba(255,255,255,0.1)" />
                          <PolarAngleAxis dataKey="department" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                          <PolarRadiusAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                          <Radar name="影響" dataKey="影響" stroke="#EF4444" fill="#EF4444" fillOpacity={0.2} />
                          <Radar name="緊迫" dataKey="緊迫" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} />
                          <Radar name="可行" dataKey="可行" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
                          <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
                          <Tooltip {...tooltipStyle} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10" />

              {/* Scatter Section */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">影響 vs 緊迫矩陣</h3>
                <p className="text-xs text-gray-500 mb-3">X = 影響程度, Y = 緊迫程度, 氣泡大小 = 加權分</p>
                <div className="bg-[#1e293b] border border-white/10 rounded-xl p-5">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" dataKey="x" name="影響" tick={{ fill: '#9CA3AF', fontSize: 11 }}
                          label={{ value: '影響程度', position: 'insideBottom', offset: -10, fill: '#9CA3AF' }} />
                        <YAxis type="number" dataKey="y" name="緊迫" tick={{ fill: '#9CA3AF', fontSize: 11 }}
                          label={{ value: '緊迫程度', angle: -90, position: 'insideLeft', offset: 10, fill: '#9CA3AF' }} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }}
                          formatter={(value: any, name: string) => [value, name === 'x' ? '影響' : name === 'y' ? '緊迫' : '加權分']}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''}
                          contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                        <Scatter data={scatterFormatted} fill="#2563EB">
                          {scatterFormatted.map((entry, i) => (
                            <Cell key={i} fill={PRIORITY_COLORS[entry.priority] || '#2563EB'} fillOpacity={0.7} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== Top10 ===== */}
          {activeSubTab === 'top10' && (
            <div className="bg-[#1e293b] border border-white/10 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-gray-300 mb-3">TOP 10 最高加權分痛點</h3>
              <div className="space-y-2">
                {analysis.top10.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <span className="text-sm font-bold text-gray-500 w-5 text-right">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{item.痛點描述}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-gray-400">{item.部門}</span>
                        <span className="text-xs px-1 py-0.5 rounded" style={{ background: PRIORITY_COLORS[item.優先級] + '33', color: PRIORITY_COLORS[item.優先級] }}>
                          {item.優先級}
                        </span>
                        {item['預估工時(人天)'] && (
                          <span className="text-xs text-gray-500">{item['預估工時(人天)']}天</span>
                        )}
                        {item['影響客戶數'] && (
                          <span className="text-xs text-gray-500">{item['影響客戶數']}客戶</span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-yellow-400">{item.加權分}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== Table ===== */}
          {activeSubTab === 'table' && (
            <div className="bg-[#1e293b] border border-white/10 rounded-xl p-5 overflow-x-auto">
              <h3 className="text-xs font-semibold text-gray-300 mb-3">完整痛點清單 ({analysis.summary.total} 筆)</h3>
              <table className="w-full text-xs min-w-[850px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-2 text-gray-400">#</th>
                    <th className="text-left py-2 px-2 text-gray-400">痛點描述</th>
                    <th className="text-left py-2 px-2 text-gray-400">部門</th>
                    <th className="text-center py-2 px-2 text-gray-400">影響</th>
                    <th className="text-center py-2 px-2 text-gray-400">緊迫</th>
                    <th className="text-center py-2 px-2 text-gray-400">可行</th>
                    <th className="text-center py-2 px-2 text-gray-400">工時</th>
                    <th className="text-center py-2 px-2 text-gray-400">客戶數</th>
                    <th className="text-center py-2 px-2 text-gray-400">加權分</th>
                    <th className="text-center py-2 px-2 text-gray-400">優先級</th>
                    <th className="text-left py-2 px-2 text-gray-400">AI 建議</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.all_records.map((item, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-1.5 px-2 text-gray-500">{i + 1}</td>
                      <td className="py-1.5 px-2 max-w-[180px] truncate">{item.痛點描述}</td>
                      <td className="py-1.5 px-2 text-gray-300">{item.部門}</td>
                      <td className="py-1.5 px-2 text-center">{item.影響}</td>
                      <td className="py-1.5 px-2 text-center">{item.緊迫}</td>
                      <td className="py-1.5 px-2 text-center">{item.可行}</td>
                      <td className="py-1.5 px-2 text-center text-gray-400">{item['預估工時(人天)']}</td>
                      <td className="py-1.5 px-2 text-center text-gray-400">{item['影響客戶數']}</td>
                      <td className="py-1.5 px-2 text-center font-bold text-yellow-400">{item.加權分}</td>
                      <td className="py-1.5 px-2 text-center">
                        <span className="px-1 py-0.5 rounded text-xs font-bold text-white" style={{ background: PRIORITY_COLORS[item.優先級] }}>
                          {item.優先級}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-xs text-gray-400 max-w-[150px] truncate">{item['AI 修復建議']}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
