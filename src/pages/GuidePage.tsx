import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BookOpen, TrendingUp, Calculator, BarChart3, Users, AlertTriangle, Wrench, Database, Activity, DollarSign, LayoutDashboard, Layers, Play } from 'lucide-react';
import guideContent from '../data/guideContent';

const sectionIds = ['landing-page', 'solution-modules', 'video-page', 'production-progress', 'monitor-page', 'yield-analysis', 'skill-matrix', 'chart-thresholds', 'critical-rules', 'cost-estimation', 'data-generation', 'data-sources'] as const;
const icons = { 'landing-page': LayoutDashboard, 'solution-modules': Layers, 'video-page': Play, 'production-progress': TrendingUp, 'monitor-page': BarChart3, 'yield-analysis': Calculator, 'skill-matrix': Users, 'chart-thresholds': Wrench, 'critical-rules': AlertTriangle, 'cost-estimation': DollarSign, 'data-generation': Database, 'data-sources': Activity } as const;

function pickLang(lang: string): keyof typeof guideContent {
  if (lang.startsWith('zh')) return 'zh-TW';
  if (lang.startsWith('ja')) return 'ja';
  if (lang.startsWith('vi')) return 'vi';
  return 'en';
}

const GuidePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = pickLang(i18n.language);
  const gc = guideContent[lang];
  const [activeSection, setActiveSection] = React.useState(() => {
    const hash = window.location.hash.replace('#', '');
    return sectionIds.includes(hash as any) ? hash : 'production-progress';
  });

  React.useEffect(() => {
    const handler = () => {
      const hash = window.location.hash.replace('#', '');
      if (sectionIds.includes(hash as any)) setActiveSection(hash);
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  return (
    <div className="min-h-screen bg-background pt-20 px-4 pb-16">
      <div className="max-w-5xl mx-auto">

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="text-accent-blue" size={24} />
            <h1 className="text-2xl font-bold text-text-primary">{t('guide.title')}</h1>
          </div>
          <p className="text-text-muted text-sm">{t('guide.subtitle')}</p>
        </motion.div>

        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Sidebar nav */}
          <div className="lg:w-44 flex-shrink-0">
            <div className="sticky top-28 space-y-1">
              {sectionIds.map((sid, i) => {
                const Icon = icons[sid];
                return (
                  <button key={sid} onClick={() => setActiveSection(sid)}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-xs font-mono transition-colors ${
                      activeSection === sid
                        ? 'bg-accent-blue/10 text-accent-blue'
                        : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                    }`}>
                    <Icon size={14} />
                    {t(`guide.sections.${i}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-6">

            {activeSection === 'landing-page' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <SectionTitle icon={LayoutDashboard} title={t('guide.sectionTitles.landing-page')} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.lp.heroKpiTitle}</h3>
                <DataTable headers={gc.lp.heroKpiHeaders} rows={gc.lp.heroKpiRows} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.lp.archTitle}</h3>
                <DataTable headers={gc.lp.archHeaders} rows={gc.lp.archRows} />
              </motion.div>
            )}

            {activeSection === 'solution-modules' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <SectionTitle icon={Layers} title={t('guide.sectionTitles.solution-modules')} />
                {gc.smd.modules.map((mod, i) => (
                  <div key={i} className="border border-white/10 rounded-lg p-4 bg-surface/30">
                    <h3 className="text-sm font-bold text-text-primary mb-1">{mod.title}</h3>
                    <p className="text-xs font-mono text-text-muted mb-2">{mod.shortDesc}</p>
                    <DataTable headers={gc.smd.kpiHeaders} rows={mod.kpis} />
                  </div>
                ))}
              </motion.div>
            )}

            {activeSection === 'video-page' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <SectionTitle icon={Play} title={t('guide.sectionTitles.video-page')} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.vp.playerTitle}</h3>
                <DataTable headers={gc.vp.playerHeaders} rows={gc.vp.playerRows} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.vp.chapterTitle}</h3>
                <DataTable headers={gc.vp.chapterHeaders} rows={gc.vp.chapterRows} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.vp.splashTitle}</h3>
                <CodeBlock title={gc.vp.splashTitle}>
{`localStorage.getItem('splashSeen') → show/hide splash
Click → play with sound
Skip → set splashSeen flag, fade to main page
videoRef.current.onEnded → auto-skip`}
                </CodeBlock>
              </motion.div>
            )}

            {activeSection === 'production-progress' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <SectionTitle icon={TrendingUp} title={t('guide.sectionTitles.production-progress')} />
                <DataTable headers={gc.pp.table1.headers} rows={gc.pp.table1.rows} />
                <CodeBlock title={gc.pp.codeTitle}>
{`function calcProductionProgress(stations: StationSnapshot[]): ProductionProgress {
  const target = 2000;
  const deadline = '2026/07/30';
  const batchStart = new Date('2026-06-01');
  const today = new Date();
  const elapsedDays = Math.max(1, Math.floor((today - batchStart) / 86400000));
  const completed = stations.reduce((s, st) => s + st.output, 0);
  const dailyRate = completed / elapsedDays;
  const errorCount = stations.filter(
    s => s.status === 'error' || s.status === 'offline'
  ).length;
  const abnormalRatio = errorCount / stations.length;
  const effectiveDailyRate = dailyRate * (1 - abnormalRatio * 0.6);
  const remaining = Math.max(0, target - completed);
  const daysToComplete = effectiveDailyRate > 0
    ? remaining / effectiveDailyRate : 999;
  const estDate = new Date(today.getTime() + daysToComplete * 86400000);
  const deadlineDate = new Date('2026-07-30');
  if (estDate > deadlineDate) status = 'delayed';
  else if (estDate < deadlineDate - 3) status = 'early';
  else status = 'onTime';
}`}
                </CodeBlock>
              </motion.div>
            )}

            {activeSection === 'monitor-page' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <SectionTitle icon={BarChart3} title={t('guide.sectionTitles.monitor-page')} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.mp.kpiTitle}</h3>
                <DataTable headers={gc.mp.kpiHeaders} rows={gc.mp.kpiRows} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.mp.statusTitle}</h3>
                <DataTable headers={gc.mp.statusHeaders} rows={gc.mp.statusRows} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.mp.layoutTitle}</h3>
                <p className="text-xs font-mono text-text-muted">{gc.mp.layoutDesc}</p>
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.mp.torqueTitle}</h3>
                <p className="text-xs font-mono text-text-muted">{gc.mp.torqueDesc}</p>
              </motion.div>
            )}

            {activeSection === 'yield-analysis' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <SectionTitle icon={Calculator} title={t('guide.sectionTitles.yield-analysis')} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ya.paretoTitle}</h3>
                <DataTable headers={gc.ya.paretoHeaders} rows={gc.ya.paretoRows} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ya.donutTitle}</h3>
                <p className="text-xs font-mono text-text-muted">{gc.ya.donutDesc}</p>
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ya.colorTitle}</h3>
                <DataTable headers={gc.ya.colorHeaders} rows={gc.ya.colorRows} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ya.stationTitle}</h3>
                <p className="text-xs font-mono text-text-muted">{gc.ya.stationDesc1}</p>
                <p className="text-xs font-mono text-text-muted">{gc.ya.stationDesc2}</p>
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ya.operatorTitle}</h3>
                <DataTable headers={gc.ya.operatorHeaders} rows={gc.ya.operatorRows} />
              </motion.div>
            )}

            {activeSection === 'skill-matrix' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <SectionTitle icon={Users} title={t('guide.sectionTitles.skill-matrix')} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.sm.levelTitle}</h3>
                <DataTable headers={gc.sm.levelHeaders} rows={gc.sm.levelRows} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.sm.scaleTitle}</h3>
                <p className="text-xs font-mono text-text-muted">{gc.sm.scaleDesc}</p>
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.sm.statTitle}</h3>
                <DataTable headers={gc.sm.statHeaders} rows={gc.sm.statRows} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.sm.stationAvgTitle}</h3>
                <p className="text-xs font-mono text-text-muted">{gc.sm.stationAvgDesc}</p>
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.sm.riskTitle}</h3>
                <DataTable headers={gc.sm.riskHeaders} rows={gc.sm.riskRows} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.sm.thresholdTitle}</h3>
                <DataTable headers={gc.sm.thresholdHeaders} rows={gc.sm.thresholdRows} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.sm.barTitle}</h3>
                <p className="text-xs font-mono text-text-muted">{gc.sm.barDesc}</p>
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.sm.llmTitle}</h3>
                <DataTable headers={gc.sm.llmHeaders} rows={gc.sm.llmRows} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.sm.xlsxTitle}</h3>
                <p className="text-xs font-mono text-text-muted">{gc.sm.xlsxDesc}</p>
              </motion.div>
            )}

            {activeSection === 'chart-thresholds' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <SectionTitle icon={Wrench} title={t('guide.sectionTitles.chart-thresholds')} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ct.torqueTitle}</h3>
                <DataTable headers={gc.ct.torqueHeaders} rows={gc.ct.torqueRows} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ct.fpyTitle}</h3>
                <DataTable headers={gc.ct.fpyHeaders} rows={gc.ct.fpyRows} />
                <p className="text-xs font-mono text-text-muted">{gc.ct.fpyDesc}</p>
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ct.stationThresholdTitle}</h3>
                <DataTable headers={gc.ct.stationThresholdHeaders} rows={gc.ct.stationThresholdRows} />
                <p className="text-xs font-mono text-text-muted">{gc.ct.cycleDesc}</p>
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ct.errorAnimTitle}</h3>
                <p className="text-xs font-mono text-text-muted">{gc.ct.errorAnimDesc}</p>
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ct.videoProgressTitle}</h3>
                <p className="text-xs font-mono text-text-muted">{gc.ct.videoProgressDesc}</p>
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ct.kpiAnimTitle}</h3>
                <p className="text-xs font-mono text-text-muted">{gc.ct.kpiAnimDesc}</p>
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ct.rangeTitle}</h3>
                <DataTable headers={gc.ct.rangeHeaders} rows={gc.ct.rangeRows} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ct.filterTitle}</h3>
                <CodeBlock title="filterByRange core flow">
{`function filterByRange<T>(data: T[], range: TimeRange, getTs: (d: T) => string | undefined): T[] {
  if (range === 'realtime') return data;
  const now = Date.now();
  const ms = { '60min': 3600000, '12h': 43200000, 'week': 604800000, 'month': 2592000000 }[range];
  return data.filter(d => {
    const ts = getTs(d);
    if (!ts) return true;
    if (typeof ts === 'string' && ts.includes(':')) {
      // handle time-only format
    }
    const t = new Date(ts).getTime();
    return (now - t) <= ms;
  });
}`}
                </CodeBlock>
                <p className="text-xs font-mono text-text-muted">{gc.ct.filterDesc}</p>
              </motion.div>
            )}

            {activeSection === 'critical-rules' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <SectionTitle icon={AlertTriangle} title={t('guide.sectionTitles.critical-rules')} />
                <DataTable headers={gc.cr.rulesHeaders} rows={gc.cr.rulesRows} />
                <CodeBlock title={gc.cr.lineExampleTitle}>
{`🚨 MES 異常通知
━━━━━━━━━━━━━━━━━━
等級: 緊急
站點: ST-03
時間: 13:30:00
訊息: AI Poka-Yoke 漏鎖螺絲

機種: R740 | 操作員: EMP-042 | 產出: 120 | 41.5°C | 4.2Nm`}
                </CodeBlock>
                <p className="text-xs font-mono text-text-muted">{gc.cr.gmailDesc}</p>
                <p className="text-xs font-mono text-text-muted">{gc.cr.frontendDesc}</p>
              </motion.div>
            )}

            {activeSection === 'cost-estimation' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <SectionTitle icon={DollarSign} title={t('guide.sectionTitles.cost-estimation')} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ce.industryTitle}</h3>
                <DataTable headers={gc.ce.industryHeaders} rows={gc.ce.industryRows} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ce.sixCostTitle}</h3>
                <DataTable headers={gc.ce.sixCostHeaders} rows={gc.ce.sixCostRows} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ce.coreTitle}</h3>
                <CodeBlock title={gc.ce.coreCodeTitle}>
{`Total = LostProduction + IdleLabor + EquipmentDepreciation 
       + EmergencyMaintenance + Scrap + EnergyWaste + Penalty

LostProduction         = outputValue/hr × (downtimeMin / 60)
IdleLabor              = wage × burdenRate(1.4) × downtimeHrs × affectedWorkers
EquipmentDepreciation  = (cost ÷ lifespan ÷ 365 ÷ 24) × downtimeHrs
EmergencyMaintenance   = baseRepair × emergencyPremium(4.8)
Scrap                  = scrapCost(500~2000)
EnergyWaste            = energyCost(200) × downtimeHrs
Penalty                = contractPenalty(if delayed)`}
                </CodeBlock>
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ce.paramsTitle}</h3>
                <DataTable headers={gc.ce.paramsHeaders} rows={gc.ce.paramsRows} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ce.timeRangeTitle}</h3>
                <p className="text-xs font-mono text-text-muted">{gc.ce.timeRangeDesc}</p>
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ce.eventStructTitle}</h3>
                <CodeBlock title={gc.ce.eventStructCodeTitle}>
{`interface CostEvent {
  id: string;
  stationId: string;
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
}`}
                </CodeBlock>
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ce.eventLogicTitle}</h3>
                <CodeBlock title={gc.ce.eventLogicCodeTitle}>
{`1. On every 2s station update, compare prev/current status
2. If transition: running→error → create CostEvent (active)
3. If transition: error→running → close CostEvent
   - duration = endTime - startTime
   - calculate 7 cost items
   - update totalCost
4. Active errors update duration every tick
5. Keep last 200 costEvents`}
                </CodeBlock>
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ce.chartsTitle}</h3>
                <DataTable headers={gc.ce.chartsHeaders} rows={gc.ce.chartsRows} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ce.llmReportTitle}</h3>
                <DataTable headers={gc.ce.llmReportHeaders} rows={gc.ce.llmReportRows} />
              </motion.div>
            )}

            {activeSection === 'data-generation' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <SectionTitle icon={Database} title={t('guide.sectionTitles.data-generation')} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.dg.timerTitle}</h3>
                <DataTable headers={gc.dg.timerHeaders} rows={gc.dg.timerRows} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.dg.stationTitle}</h3>
                <DataTable headers={gc.dg.stationHeaders} rows={gc.dg.stationRows} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.dg.torqueGenTitle}</h3>
                <p className="text-xs font-mono text-text-muted">{gc.dg.torqueGenDesc1}</p>
                <p className="text-xs font-mono text-text-muted">{gc.dg.torqueGenDesc2}</p>
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.dg.defectTitle}</h3>
                <p className="text-xs font-mono text-text-muted">{gc.dg.defectDesc}</p>
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.dg.alertTitle}</h3>
                <p className="text-xs font-mono text-text-muted">{gc.dg.alertDesc}</p>
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.dg.skillTitle}</h3>
                <p className="text-xs font-mono text-text-muted">{gc.dg.skillDesc}</p>
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.dg.yieldTitle}</h3>
                <p className="text-xs font-mono text-text-muted">{gc.dg.yieldDesc}</p>
              </motion.div>
            )}

            {activeSection === 'data-sources' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <SectionTitle icon={Activity} title={t('guide.sectionTitles.data-sources')} />
                <DataTable headers={gc.ds.containerHeaders} rows={gc.ds.containerRows} />
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ds.apiTitle}</h3>
                <DataTable headers={gc.ds.apiHeaders} rows={gc.ds.apiRows} />
                <p className="text-xs font-mono text-text-muted">{gc.ds.apiDesc}</p>
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ds.deployTitle}</h3>
                <CodeBlock title={gc.ds.deployCodeTitle}>
{`python run/deploy.py start
python run/deploy.py stop
python run/deploy.py status
python run/deploy.py clean`}
                </CodeBlock>
                <p className="text-xs font-mono text-text-muted">{gc.ds.winDesc}</p>
                <h3 className="text-sm font-bold text-text-primary mt-4">{gc.ds.rebuildTitle}</h3>
                <CodeBlock title={gc.ds.rebuildCodeTitle}>
{`docker build -t mes-platform-ui run/
docker build -t mes-platform-ui-notify run/notify/
docker build -t mes-platform-ui-data-api run/data-api/`}
                </CodeBlock>
              </motion.div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

/* ── Helper sub-components ── */

function SectionTitle({ icon: Icon, title }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string }) {
  return (
    <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
      <Icon size={18} className="text-accent-blue" />
      {title}
    </h2>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr className="bg-white/5">
            {headers.map(h => (
              <th key={h} className="text-left px-3 py-2 text-text-muted border-b border-white/10">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
              {row.map((cell, j) => (
                <td key={j} className={`px-3 py-2 ${j === 0 ? 'text-text-primary font-semibold' : j === 1 ? 'text-accent-blue' : 'text-text-muted'}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({ title, children }: { title: string; children: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-surface p-4 text-xs font-mono leading-relaxed">
      <p className="text-text-primary font-semibold mb-2">{title}</p>
      <pre className="text-[10px] text-text-muted bg-white/[0.03] p-3 rounded overflow-x-auto whitespace-pre-wrap">{children}</pre>
    </div>
  );
}

export default GuidePage;
