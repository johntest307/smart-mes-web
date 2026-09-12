import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { DollarSign, TrendingDown, Activity, Zap, BarChart3 } from 'lucide-react';

const MVA_KPI = [
  { label: '今日 MVA', value: 'NT$2.4M', change: '+3.2%', up: true, icon: DollarSign, color: 'accent-blue' },
  { label: 'MVA 變異', value: '-NT$180K', change: '-7.5%', up: false, icon: TrendingDown, color: 'danger' },
  { label: 'OEE', value: '91.2%', change: '+2.1%', up: true, icon: Activity, color: 'accent-green' },
  { label: 'UPH', value: '142', change: '+5', up: true, icon: Zap, color: 'accent-purple' },
];

const COST_BREAKDOWN = [
  { category: '直接人工 (DL)', amount: 820000, percent: 34.2, color: 'accent-blue' },
  { category: '設備折舊 (OH)', amount: 680000, percent: 28.3, color: 'accent-green' },
  { category: '能源消耗', amount: 380000, percent: 15.8, color: 'warning' },
  { category: '輔料耗損', amount: 280000, percent: 11.7, color: 'accent-purple' },
  { category: '測試成本', amount: 240000, percent: 10.0, color: 'danger' },
];

const ROI_PROJECTS = [
  { name: 'AI 瑕疵檢測 AOI', capex: 5000000, monthly_return: 1200000, payback: 4.2, status: 'active' },
  { name: 'AMR 搬運機器人', capex: 8000000, monthly_return: 950000, payback: 8.4, status: 'active' },
  { name: '數位雙生模擬', capex: 3000000, monthly_return: 600000, payback: 5.0, status: 'planned' },
  { name: 'PdM 預測性維護', capex: 4000000, monthly_return: 850000, payback: 4.7, status: 'active' },
];

const MvaPage: React.FC = () => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = React.useState<'today' | 'week' | 'month'>('today');

  return (
    <div className="min-h-screen bg-background pt-20 px-4 pb-16">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="text-accent-blue" size={24} />
            <h1 className="text-2xl font-bold text-text-primary">{t('nav.mva')}</h1>
          </div>
          <p className="text-text-muted text-sm">Manufacturing Value Added — OT 數據即時轉換為財務金額</p>
        </motion.div>

        {/* Time Range Selector */}
        <div className="flex gap-2 mb-6">
          {(['today', 'week', 'month'] as const).map((r) => (
            <button key={r} onClick={() => setTimeRange(r)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeRange === r ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/30' : 'bg-surface text-text-muted border border-transparent'
              }`}>
              {r === 'today' ? '今日' : r === 'week' ? '本週' : '本月'}
            </button>
          ))}
        </div>

        {/* MVA KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {MVA_KPI.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="bg-surface rounded-xl border border-white/5 p-5">
                <div className="flex items-center justify-between mb-3">
                  <Icon size={18} className={`text-${kpi.color}`} />
                  <span className={`text-xs font-mono ${kpi.up ? 'text-accent-green' : 'text-danger'}`}>
                    {kpi.change}
                  </span>
                </div>
                <div className="text-2xl font-bold text-text-primary">{kpi.value}</div>
                <div className="text-xs text-text-muted mt-1">{kpi.label}</div>
              </div>
            );
          })}
        </div>

        {/* MVA Variance Waterfall */}
        <div className="bg-surface rounded-xl border border-white/5 p-6 mb-8">
          <h2 className="text-lg font-bold text-text-primary mb-4">MVA 變異拆解（瀑布圖）</h2>
          <div className="bg-base rounded-lg p-4">
            <div className="flex items-end gap-3 h-48">
              {[
                { label: '標準 MVA', value: 2580000, color: 'accent-blue', h: 100 },
                { label: '工時變異', value: -80000, color: 'danger', h: 3 },
                { label: '稼動變異', value: -50000, color: 'danger', h: 2 },
                { label: '良率變異', value: -50000, color: 'danger', h: 2 },
                { label: '實際 MVA', value: 2400000, color: 'accent-green', h: 93 },
              ].map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className={`w-full bg-${bar.color}/30 rounded-t-md`} style={{ height: `${bar.h}%` }}>
                    <div className={`w-full bg-${bar.color} rounded-t-md`} style={{ height: i < 4 ? `${Math.abs(bar.value) / 25800}%` : '100%' }} />
                  </div>
                  <div className="text-[10px] text-text-muted mt-2 text-center">{bar.label}</div>
                  <div className={`text-xs font-mono text-${bar.color} mt-0.5`}>
                    {bar.value >= 0 ? '' : ''}{bar.value >= 0 ? `NT$${(bar.value / 10000).toFixed(0)}萬` : `-NT$${(Math.abs(bar.value) / 10000).toFixed(0)}萬`}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 text-xs text-text-muted font-mono text-center">
            MVA 變異 = 工時變異 + 稼動變異 + 良率變異 = -NT$180K (-7.5%)
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Cost Breakdown */}
          <div className="bg-surface rounded-xl border border-white/5 p-6">
            <h2 className="text-lg font-bold text-text-primary mb-4">成本結構（5 類）</h2>
            <div className="space-y-3">
              {COST_BREAKDOWN.map((c) => (
                <div key={c.category}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-muted">{c.category}</span>
                    <span className="text-text-primary">NT${(c.amount / 10000).toFixed(0)}萬 ({c.percent}%)</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full bg-${c.color} rounded-full`} style={{ width: `${c.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ROI Projects */}
          <div className="bg-surface rounded-xl border border-white/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text-primary">ROI 專案追蹤</h2>
              <BarChart3 size={16} className="text-accent-blue" />
            </div>
            <div className="space-y-3">
              {ROI_PROJECTS.map((p) => (
                <div key={p.name} className="bg-base rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-text-primary">{p.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      p.status === 'active' ? 'bg-accent-green/10 text-accent-green' : 'bg-warning/10 text-warning'
                    }`}>
                      {p.status === 'active' ? '進行中' : '規劃中'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] text-text-muted">CapEx</div>
                      <div className="text-xs font-bold text-text-primary">NT${(p.capex / 1000000).toFixed(0)}M</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-muted">月回報</div>
                      <div className="text-xs font-bold text-accent-green">NT${(p.monthly_return / 10000).toFixed(0)}萬</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-muted">回收期</div>
                      <div className="text-xs font-bold text-accent-blue">{p.payback} 月</div>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-green rounded-full" style={{ width: `${Math.min(100, (1 / p.payback) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* OEE Breakdown */}
        <div className="bg-surface rounded-xl border border-white/5 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-accent-green" />
            <h2 className="text-lg font-bold text-text-primary">OEE 結構分析</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: '稼動率 (Availability)', value: 94.5, target: 95, color: 'accent-green' },
              { label: '效率 (Performance)', value: 97.8, target: 98, color: 'accent-blue' },
              { label: '品質 (Quality)', value: 98.6, target: 99, color: 'accent-purple' },
            ].map((o) => (
              <div key={o.label} className="bg-base rounded-lg p-4">
                <div className="text-xs text-text-muted mb-2">{o.label}</div>
                <div className="flex items-end gap-2">
                  <span className={`text-2xl font-bold text-${o.color}`}>{o.value}%</span>
                  <span className="text-xs text-text-muted mb-1">/ {o.target}%</span>
                </div>
                <div className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full bg-${o.color} rounded-full`} style={{ width: `${o.value}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center text-sm text-text-muted">
            OEE = 稼動率 × 效率 × 品質 = 94.5% × 97.8% × 98.6% = <span className="text-accent-green font-bold">91.2%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MvaPage;
