import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Settings, Users, Wrench, Shield, Thermometer, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';

type TabId = 'overview' | 'man' | 'machine' | 'method' | 'environment';

const ELEMENTS: { id: TabId; icon: React.FC<{ size?: number; className?: string }>; color: string }[] = [
  { id: 'overview', icon: Settings, color: 'accent-blue' },
  { id: 'man', icon: Users, color: 'accent-green' },
  { id: 'machine', icon: Wrench, color: 'accent-purple' },
  { id: 'method', icon: Shield, color: 'warning' },
  { id: 'environment', icon: Thermometer, color: 'danger' },
];

const QA_VS_PROD: Record<TabId, { qa: string[]; prod: string[]; conflict: string; evidence: string } | null> = {
  overview: null,
  man: {
    qa: ['人員技能檢定與上崗資質', 'SOP 遵從度稽核', '首件檢查與自檢落實度'],
    prod: ['產線人力出勤率與瓶頸站支援', '新手/熟練工平衡', 'UPPH 與 SOP 執行速度'],
    conflict: '作業員漏鎖螺絲：品管判定不良，領班認為 SOP 描述模糊',
    evidence: 'AI 視覺影像 + 技能矩陣對照；SOP 發布日誌 ECN 簽核紀錄',
  },
  machine: {
    qa: ['設備校正與點檢紀錄', 'CPK 製程能力指數', '防呆機制驗證'],
    prod: ['OEE 稼動率與停機時間', 'PM 保養排程', '換模/換線 SMED 效率'],
    conflict: 'SMT 抛料率 0.15%：品管要求停機，領班主張更換料捲即可',
    evidence: '交叉換料驗證 Swapping Test；拋料率 Ppm 數據',
  },
  method: {
    qa: ['WI/SOP 版本控制 ECN/ECO', '測試參數與溫度曲線合規', 'AQL / IPC 標準執行'],
    prod: ['排程達成率', '異常時 MRB/特採流程', '標準工時 vs 實際工時差距'],
    conflict: 'ICT 測試 Yield 飆升 8%：品管判定產品不良，領班懷疑治具過殺',
    evidence: '黃金樣板 Golden Sample 測試；Gage R&R 重複性實驗',
  },
  environment: {
    qa: ['溫濕度與潔淨度監控', 'MSD 濕敏元件暴露時間', '5S 執行與良品/不良品隔離'],
    prod: ['作業環境安全性 OSHA', 'WIP 暫存區流暢度', '環境異常停機工時報廢'],
    conflict: '暴雨天濕度飆至 75% RH：品管要求停產烘烤，領班認為僅超標 1 小時',
    evidence: 'IoT 溫濕度持續追蹤履歷；MSD 過溫/過濕管控表',
  },
};

const CASES = [
  { id: 1, tag: 'machine', nameKey: 'c1', steps: ['交叉換料驗證 Swapping Test', '確認原站位吸嘴真空度衰退', '整組更換備用吸嘴組（12 分鐘）', '首件檢查 FAI 500pcs，拋料率 0.01%'], note: '禁止盲目停機，用 Swapping Test 切斷「料 vs 機」模糊空間' },
  { id: 2, tag: 'man/method', nameKey: 'c2', steps: ['20 台疑慮品貼 HOLD 標籤移至隔離區', 'AI 視覺影像確認漏鎖', '熟練工 100% 扭力重檢', '作業員暫離進行 0.5hr SOP 再教育'], note: '嚴禁「後補作業」，新手比率不超過 15%' },
  { id: 3, tag: 'method', nameKey: 'c3', steps: ['黃金樣板 Golden Sample 連測 10 次', '3 次 FAIL 證實治具異常', '清潔探針 + 更換磨損針腳 + 校正', '重測 PASS 率恢復 99.8%'], note: 'Golden Sample 妥善保管，重測仍 FAIL 須送 X-Ray' },
  { id: 4, tag: 'environment', nameKey: 'c4', steps: ['品管開立環境異常通知單', '依據 IPC/JEDEC J-STD-033 強制停件', 'BGA 送 125°C 烘烤 20 小時', '備用除濕機組 15 分鐘恢復 50% RH'], note: 'IoT 感測器應與 MES 連動，濕度超標 15 分鐘自動鎖定打件' },
  { id: 5, tag: 'method/machine', nameKey: 'c5', steps: ['DCC 系統確認 ECN 已生效', '緊急 MRB 會議決議線上重新燒錄', '300 台拆箱刷 BIOS v2.0 + FVT', '品管逐台抽驗簽核放行'], note: '燒錄站應導入雲端 FW 自動比對，不符即鎖定' },
];

function pickLang(lang: string): 'zh-TW' | 'en' | 'ja' {
  if (lang.startsWith('ja')) return 'ja';
  if (lang.startsWith('en')) return 'en';
  return 'zh-TW';
}

const LinePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  pickLang(i18n.language);
  const [activeTab, setActiveTab] = React.useState<TabId>('overview');
  const [expandedCase, setExpandedCase] = React.useState<number | null>(null);

  const tLine = (key: string) => t(`linePage.${key}`);

  return (
    <div className="min-h-screen bg-background pt-20 px-4 pb-16">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="text-accent-blue" size={24} />
            <h1 className="text-2xl font-bold text-text-primary">{tLine('title')}</h1>
          </div>
          <p className="text-text-muted text-sm">{tLine('subtitle')}</p>
        </motion.div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {ELEMENTS.map(({ id, icon: Icon, color }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === id
                  ? `bg-${color}/15 text-${color} border border-${color}/30`
                  : 'bg-surface text-text-muted hover:text-text-primary border border-transparent'
              }`}>
              <Icon size={16} />
              {tLine(`tabs.${id}`)}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Overview */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="bg-surface rounded-xl border border-white/5 p-6 mb-6">
                <h2 className="text-lg font-bold text-text-primary mb-3">{tLine('overview.title')}</h2>
                <p className="text-text-muted text-sm leading-relaxed mb-6">{tLine('overview.desc')}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(['man', 'machine', 'method', 'environment'] as TabId[]).map((id) => {
                    const el = ELEMENTS.find(e => e.id === id)!;
                    const Icon = el.icon;
                    return (
                      <button key={id} onClick={() => setActiveTab(id)}
                        className="bg-base rounded-lg p-4 border border-white/5 hover:border-accent-blue/30 transition-all text-left group">
                        <Icon size={20} className={`text-${el.color} mb-2 group-hover:scale-110 transition-transform`} />
                        <h3 className="text-sm font-bold text-text-primary mb-1">{tLine(`tabs.${id}`)}</h3>
                        <ChevronRight size={14} className="text-text-muted group-hover:text-accent-blue transition-colors" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3-level escalation */}
              <div className="bg-surface rounded-xl border border-white/5 p-6">
                <h2 className="text-lg font-bold text-text-primary mb-4">{tLine('escalation.title')}</h2>
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map((level) => (
                    <div key={level} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        level === 1 ? 'bg-accent-blue/20 text-accent-blue'
                        : level === 2 ? 'bg-warning/20 text-warning'
                        : 'bg-danger/20 text-danger'
                      }`}>{level}</div>
                      <p className="text-sm text-text-muted pt-1">{tLine(`escalation.level${level}`)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Man / Machine / Method / Environment */}
          {activeTab !== 'overview' && QA_VS_PROD[activeTab] && (
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* QA side */}
                <div className="bg-surface rounded-xl border border-white/5 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield size={18} className="text-accent-green" />
                    <h3 className="text-sm font-bold text-accent-green">{tLine('roles.qa')}</h3>
                  </div>
                  <ul className="space-y-2">
                    {QA_VS_PROD[activeTab]!.qa.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                        <CheckCircle size={14} className="text-accent-green mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Production side */}
                <div className="bg-surface rounded-xl border border-white/5 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Wrench size={18} className="text-accent-purple" />
                    <h3 className="text-sm font-bold text-accent-purple">{tLine('roles.prod')}</h3>
                  </div>
                  <ul className="space-y-2">
                    {QA_VS_PROD[activeTab]!.prod.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                        <CheckCircle size={14} className="text-accent-purple mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Conflict */}
              <div className="bg-surface rounded-xl border border-warning/20 p-6 mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={18} className="text-warning" />
                  <h3 className="text-sm font-bold text-warning">{tLine('roles.conflict')}</h3>
                </div>
                <p className="text-sm text-text-muted mb-3">{QA_VS_PROD[activeTab]!.conflict}</p>
                <div className="bg-base rounded-lg p-4">
                  <p className="text-xs text-text-muted font-mono">{QA_VS_PROD[activeTab]!.evidence}</p>
                </div>
              </div>

              {/* Related cases */}
              <h3 className="text-lg font-bold text-text-primary mb-4">{tLine('cases.title')}</h3>
              <div className="space-y-3">
                {CASES.filter(c => c.tag.includes(activeTab)).map((c) => (
                  <div key={c.id} className="bg-surface rounded-xl border border-white/5 overflow-hidden">
                    <button onClick={() => setExpandedCase(expandedCase === c.id ? null : c.id)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-accent-blue/10 text-accent-blue">{c.tag}</span>
                        <span className="text-sm font-medium text-text-primary">{tLine(`cases.${c.nameKey}.name`)}</span>
                      </div>
                      <ChevronRight size={16} className={`text-text-muted transition-transform ${expandedCase === c.id ? 'rotate-90' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {expandedCase === c.id && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                          <div className="px-4 pb-4 border-t border-white/5 pt-4">
                            <ol className="space-y-2 mb-4">
                              {c.steps.map((step, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                                  <span className="text-accent-blue font-mono text-xs mt-0.5">{i + 1}.</span>
                                  {step}
                                </li>
                              ))}
                            </ol>
                            <div className="bg-warning/5 border border-warning/20 rounded-lg p-3">
                              <p className="text-xs text-warning font-medium">{c.note}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LinePage;
