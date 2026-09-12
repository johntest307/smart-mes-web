import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BarChart3, Users, Clock, Target, TrendingUp, Zap, Award, BookOpen } from 'lucide-react';

const PILLARS = [
  { icon: Users, color: 'accent-blue', title: '蘋果樹多維勝任力模型', titleEn: 'Apple Tree Model',
    desc: '技能矩陣 × 品質分數 × 效率係數 × 協作貢獻，四維度交叉評估員工能力。',
    metrics: ['技能涵蓋率', '品質評分', '效率係數', '協作指數'] },
  { icon: Clock, color: 'accent-green', title: '出勤聯動動態排班', titleEn: 'Dynamic Scheduling',
    desc: 'AI 預測排班，根據員工技能權重匹配最佳班表，瓶頸工站優先配置高技能人員。',
    metrics: ['排班匹配度', '瓶頸覆蓋率', '出勤率', '加班時數'] },
  { icon: Target, color: 'accent-purple', title: '高精度產出追蹤', titleEn: 'Output Tracking',
    desc: 'MES + IoT 逐站追蹤，綁定個人員工 ID，即時掌握每人每站產出與品質。',
    metrics: ['個人產出', '站點良率', '追溯完整率', '異常回報'] },
  { icon: BookOpen, color: 'warning', title: '數位培訓與分級鑑定', titleEn: 'Digital Training',
    desc: '線上考試 + 防作弊機制，依操作員/領班分級出題，通過後取得工站資質。',
    metrics: ['培訓時數', '鑑定通過率', '上手天數', '複訓週期'] },
];

const ROI_DATA = [
  { label: '多能工覆蓋率', before: '32%', after: '88%', color: 'accent-blue' },
  { label: '組裝不良率 (Rework)', before: '5.2%', after: '0.9%', color: 'accent-green' },
  { label: '整體 OEE', before: '78%', after: '91%', color: 'accent-purple' },
  { label: '新員工上手天數', before: '14 天', after: '5 天', color: 'warning' },
];

const FINANCIAL = [
  { label: '總投資', value: 'NT$12M', icon: TrendingUp },
  { label: '年化報酬', value: 'NT$83M', icon: BarChart3 },
  { label: 'ROI', value: '591.6%', icon: Zap },
  { label: '回收期', value: '< 2 個月', icon: Award },
];

const PerformancePage: React.FC = () => {
  const { t } = useTranslation();
  const [activePillar, setActivePillar] = React.useState(0);

  return (
    <div className="min-h-screen bg-background pt-20 px-4 pb-16">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="text-accent-blue" size={24} />
            <h1 className="text-2xl font-bold text-text-primary">{t('nav.performance')}</h1>
          </div>
          <p className="text-text-muted text-sm">產線員工績效數位化轉型 — 緯穎 (Wiwynn) AI Server Assembly</p>
        </motion.div>

        {/* Financial KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {FINANCIAL.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="bg-surface rounded-xl border border-white/5 p-5 text-center">
                <Icon size={20} className="text-accent-blue mx-auto mb-2" />
                <div className="text-2xl font-bold text-text-primary">{f.value}</div>
                <div className="text-xs text-text-muted mt-1">{f.label}</div>
              </div>
            );
          })}
        </div>

        {/* ROI Before/After */}
        <div className="bg-surface rounded-xl border border-white/5 p-6 mb-8">
          <h2 className="text-lg font-bold text-text-primary mb-4">ROI 效益對比</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ROI_DATA.map((r) => (
              <div key={r.label} className="bg-base rounded-lg p-4">
                <div className="text-xs text-text-muted mb-3">{r.label}</div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-[10px] text-text-muted mb-1">Before</div>
                    <div className="text-lg font-bold text-danger">{r.before}</div>
                  </div>
                  <div className="text-accent-green text-lg">→</div>
                  <div className="flex-1 text-right">
                    <div className="text-[10px] text-text-muted mb-1">After</div>
                    <div className="text-lg font-bold text-accent-green">{r.after}</div>
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full bg-${r.color} rounded-full`} style={{ width: '75%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4 Pillars */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-text-primary mb-4">四大核心支柱</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {PILLARS.map((p, i) => {
              const Icon = p.icon;
              return (
                <button key={i} onClick={() => setActivePillar(i)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    activePillar === i
                      ? `bg-${p.color}/10 border-${p.color}/30`
                      : 'bg-surface border-white/5 hover:border-white/10'
                  }`}>
                  <Icon size={20} className={`text-${p.color} mb-2`} />
                  <h3 className="text-sm font-bold text-text-primary mb-0.5">{p.title}</h3>
                  <p className="text-[10px] text-text-muted font-mono">{p.titleEn}</p>
                </button>
              );
            })}
          </div>

          <motion.div key={activePillar} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-surface rounded-xl border border-white/5 p-6">
            <p className="text-sm text-text-muted leading-relaxed mb-4">{PILLARS[activePillar].desc}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PILLARS[activePillar].metrics.map((m, i) => (
                <div key={i} className="bg-base rounded-lg p-3 text-center">
                  <div className="text-xs text-text-muted">{m}</div>
                  <div className={`text-lg font-bold text-${PILLARS[activePillar].color} mt-1`}>
                    {[92, 87, 95, 88][i]}%
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Competency Radar */}
        <div className="bg-surface rounded-xl border border-white/5 p-6">
          <h2 className="text-lg font-bold text-text-primary mb-4">蘋果樹多維勝任力評估</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '技能矩陣', value: 88, color: 'accent-blue', icon: '🔧' },
              { label: '品質分數', value: 95, color: 'accent-green', icon: '✅' },
              { label: '效率係數', value: 91, color: 'accent-purple', icon: '⚡' },
              { label: '協作貢獻', value: 87, color: 'warning', icon: '🤝' },
            ].map((d) => (
              <div key={d.label} className="bg-base rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">{d.icon}</div>
                <div className="text-xs text-text-muted mb-1">{d.label}</div>
                <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className={`absolute h-full bg-${d.color} rounded-full`} style={{ width: `${d.value}%` }} />
                </div>
                <div className={`text-xl font-bold text-${d.color} mt-2`}>{d.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformancePage;
