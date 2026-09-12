import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Monitor, Upload, CheckCircle, AlertTriangle, XCircle, Cpu, Shield } from 'lucide-react';

type HealthGrade = 'PASS' | 'WARN' | 'FAIL';

const MOCK_DATA = {
  total: 180, pass: 142, warn: 28, fail: 10, avgScore: 86.4,
  processes: [
    { name: 'ITSckDat', running: 174, total: 180 },
    { name: 'TmListen', running: 168, total: 180 },
    { name: 'VisionOneConsoleTray', running: 155, total: 180 },
  ],
  software: [
    { name: 'SMART IT', installed: 172, total: 180 },
    { name: 'ApexOne', installed: 165, total: 180 },
    { name: 'VisionOne', installed: 155, total: 180 },
  ],
  topIssues: [
    { pc: 'PC-047', score: 42, grade: 'FAIL' as HealthGrade, issues: ['ITSckDat 未運行', '時區錯誤', '驅動程式缺少 x3'] },
    { pc: 'PC-112', score: 55, grade: 'FAIL' as HealthGrade, issues: ['安全更新 > 60 天', 'TmListen 未運行'] },
    { pc: 'PC-089', score: 68, grade: 'WARN' as HealthGrade, issues: ['驅動程式缺少 x2', '時間同步失敗'] },
    { pc: 'PC-156', score: 72, grade: 'WARN' as HealthGrade, issues: ['VisionOneConsoleTray 未運行'] },
    { pc: 'PC-023', score: 88, grade: 'PASS' as HealthGrade, issues: ['安全更新 > 60 天'] },
  ],
};

const GRADE_CONFIG = {
  PASS: { color: 'accent-green', icon: CheckCircle, label: 'PASS ≥ 90' },
  WARN: { color: 'warning', icon: AlertTriangle, label: 'WARN 70-89' },
  FAIL: { color: 'danger', icon: XCircle, label: 'FAIL < 70' },
};

const DEDUCTION_RULES = [
  { rule: 'ITSckDat 未運行', points: -10 },
  { rule: 'TmListen 未運行', points: -10 },
  { rule: 'VisionOneConsoleTray 未運行', points: -10 },
  { rule: '安全更新 > 60 天', points: -15 },
  { rule: '驅動程式缺少（每項）', points: -5 },
  { rule: '時區錯誤', points: -10 },
  { rule: '時間同步失敗', points: -10 },
];

const PcInspectionPage: React.FC = () => {
  const { t } = useTranslation();
  const [showUpload, setShowUpload] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'detail' | 'formula'>('overview');

  const getGrade = (score: number): HealthGrade => score >= 90 ? 'PASS' : score >= 70 ? 'WARN' : 'FAIL';

  return (
    <div className="min-h-screen bg-background pt-20 px-4 pb-16">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Monitor className="text-accent-blue" size={24} />
            <h1 className="text-2xl font-bold text-text-primary">{t('nav.pc')}</h1>
          </div>
          <p className="text-text-muted text-sm">180 台產線 PC 健康檢查 · 自動化巡檢 + 評分</p>
        </motion.div>

        {/* Upload area */}
        <div className="mb-6">
          <button onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 text-sm text-accent-blue hover:text-accent-blue/80 transition-colors">
            <Upload size={16} /> 上傳檢查報告
          </button>
          {showUpload && (
            <div className="mt-3 bg-surface rounded-xl border border-dashed border-white/10 p-8 text-center">
              <Upload size={32} className="text-text-muted mx-auto mb-3" />
              <p className="text-sm text-text-muted">拖曳 .txt 報告資料夾至此</p>
              <p className="text-xs text-text-muted mt-1">支援格式：check.bat 產生的 reports/*.txt</p>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface rounded-xl border border-white/5 p-5 text-center">
            <div className="text-3xl font-bold text-accent-blue">{MOCK_DATA.total}</div>
            <div className="text-xs text-text-muted mt-1">總 PC 數</div>
          </div>
          <div className="bg-surface rounded-xl border border-accent-green/20 p-5 text-center">
            <div className="text-3xl font-bold text-accent-green">{MOCK_DATA.pass}</div>
            <div className="text-xs text-text-muted mt-1">PASS (≥90)</div>
          </div>
          <div className="bg-surface rounded-xl border border-warning/20 p-5 text-center">
            <div className="text-3xl font-bold text-warning">{MOCK_DATA.warn}</div>
            <div className="text-xs text-text-muted mt-1">WARN (70-89)</div>
          </div>
          <div className="bg-surface rounded-xl border border-danger/20 p-5 text-center">
            <div className="text-3xl font-bold text-danger">{MOCK_DATA.fail}</div>
            <div className="text-xs text-text-muted mt-1">FAIL (&lt;70)</div>
          </div>
        </div>

        {/* Average Score Bar */}
        <div className="bg-surface rounded-xl border border-white/5 p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-text-primary">平均健康評分</h2>
            <span className={`text-2xl font-bold text-${getGrade(MOCK_DATA.avgScore) === 'PASS' ? 'accent-green' : getGrade(MOCK_DATA.avgScore) === 'WARN' ? 'warning' : 'danger'}`}>
              {MOCK_DATA.avgScore}
            </span>
          </div>
          <div className="h-3 bg-white/5 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 flex">
              <div className="h-full bg-accent-green/30" style={{ width: '70%' }} />
              <div className="h-full bg-warning/30" style={{ width: '20%' }} />
              <div className="h-full bg-danger/30" style={{ width: '10%' }} />
            </div>
            <div className="absolute h-full w-1 bg-white rounded-full" style={{ left: `${MOCK_DATA.avgScore}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-text-muted mt-1">
            <span>0</span><span className="text-accent-green">PASS ≥ 90</span><span className="text-warning">WARN 70-89</span><span className="text-danger">FAIL &lt; 70</span><span>100</span>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-2 mb-6">
          {(['overview', 'detail', 'formula'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/30' : 'bg-surface text-text-muted border border-transparent'
              }`}>
              {tab === 'overview' ? '總覽' : tab === 'detail' ? 'PC 明細' : '評分公式'}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Process Status */}
            <div className="bg-surface rounded-xl border border-white/5 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Cpu size={16} className="text-accent-blue" />
                <h3 className="text-sm font-bold text-text-primary">程式狀態</h3>
              </div>
              <div className="space-y-3">
                {MOCK_DATA.processes.map((p) => (
                  <div key={p.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-muted">{p.name}</span>
                      <span className="text-text-primary">{p.running}/{p.total}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${p.running / p.total > 0.95 ? 'bg-accent-green' : p.running / p.total > 0.85 ? 'bg-warning' : 'bg-danger'}`}
                        style={{ width: `${(p.running / p.total) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Software Status */}
            <div className="bg-surface rounded-xl border border-white/5 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield size={16} className="text-accent-green" />
                <h3 className="text-sm font-bold text-text-primary">軟體安裝率</h3>
              </div>
              <div className="space-y-3">
                {MOCK_DATA.software.map((s) => (
                  <div key={s.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-muted">{s.name}</span>
                      <span className="text-text-primary">{s.installed}/{s.total} ({Math.round(s.installed / s.total * 100)}%)</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-blue rounded-full" style={{ width: `${(s.installed / s.total) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Detail Tab */}
        {activeTab === 'detail' && (
          <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-3 px-4 text-xs font-medium text-text-muted">PC</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-text-muted">評分</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-text-muted">等級</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-text-muted">問題項目</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_DATA.topIssues.map((pc) => {
                  const grade = GRADE_CONFIG[pc.grade];
                  const Icon = grade.icon;
                  return (
                    <tr key={pc.pc} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-mono text-text-primary">{pc.pc}</td>
                      <td className="py-3 px-4">
                        <span className={`text-lg font-bold text-${grade.color}`}>{pc.score}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className={`flex items-center gap-1.5 text-xs text-${grade.color}`}>
                          <Icon size={14} />
                          {pc.grade}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {pc.issues.map((issue, i) => (
                            <span key={i} className="text-[10px] bg-white/5 text-text-muted px-2 py-0.5 rounded">{issue}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Formula Tab */}
        {activeTab === 'formula' && (
          <div className="bg-surface rounded-xl border border-white/5 p-6">
            <h3 className="text-sm font-bold text-text-primary mb-4">健康評分計算公式</h3>
            <div className="bg-base rounded-lg p-4 mb-4 font-mono text-sm text-text-muted">
              Score = 100 - Σ(deductions)
            </div>
            <div className="space-y-2">
              {DEDUCTION_RULES.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-xs text-text-muted">{r.rule}</span>
                  <span className="text-xs font-mono text-danger">{r.points} pts</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {(['PASS', 'WARN', 'FAIL'] as const).map((g) => (
                <div key={g} className={`bg-${GRADE_CONFIG[g].color}/10 border border-${GRADE_CONFIG[g].color}/20 rounded-lg p-3 text-center`}>
                  <div className={`text-xs font-bold text-${GRADE_CONFIG[g].color}`}>{g}</div>
                  <div className="text-[10px] text-text-muted mt-1">{GRADE_CONFIG[g].label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PcInspectionPage;
