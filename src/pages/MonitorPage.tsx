import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StationCard from '../components/monitor/StationCard';
import AlertTimeline from '../components/monitor/AlertTimeline';
import ChartContainer from '../components/common/ChartContainer';
import { useDashboard } from '../hooks/DashboardContext';
import GuideLink from '../components/ui/GuideLink';

const STATUS_LABEL: Record<string, { labelKey: string; color: string }> = {
  running: { labelKey: 'monitor.statusRunning', color: '#5BA87A' },
  waiting: { labelKey: 'monitor.statusWaiting', color: '#E8A838' },
  error: { labelKey: 'monitor.statusError', color: '#D9534F' },
  offline: { labelKey: 'monitor.statusOffline', color: '#4A5568' },
};

const PageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-background pt-20 px-4 pb-8 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
      <p className="text-text-muted text-sm">Loading data...</p>
    </div>
  </div>
);

const MonitorPage: React.FC = () => {
  const { t } = useTranslation();
  const { stations, alerts, monitorEvents, acknowledgeAlert, loading } = useDashboard();
  const [clock, setClock] = useState(new Date());
  const [selectedStation, setSelectedStation] = useState<string | null>(null);

  useEffect(() => { const id = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(id); }, []);

  const handleTimeRange = (_chartKey: string) => (_range: string) => {
    // History not available without Flask backend
  };

  const station = selectedStation ? stations.find(s => s.id === selectedStation) : null;

  if (loading) return <PageSkeleton />;

  return (
    <div className="min-h-screen bg-background pt-20 px-4 pb-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-3 w-3">
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-green" />
                </div>
                <span className="text-accent-green font-mono text-xs font-bold tracking-widest">LIVE</span>
              </div>
            <h1 className="text-xl font-bold text-text-primary">{t('monitor.title')}</h1>
            <p className="text-[10px] font-mono text-text-muted">{t('monitor.subtitle')}</p>
          </div>
          <div className="text-right">
            <div className="text-text-muted text-[10px] font-mono">{t('monitor.lastUpdate')}</div>
            <div className="text-accent-blue font-mono text-base font-bold">
              {clock.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </div>
          </div>
        </motion.div>

        <div className="flex items-center gap-4 mb-4">
          <GuideLink section="monitor-page" label="監控頁面說明" />
          <GuideLink section="chart-thresholds" label="閾值定義" />
        </div>

        {/* Line overview */}
        <ChartContainer title={t('monitor.stationOverview')} onTimeRangeChange={handleTimeRange('stations')}>
          <div className="grid grid-cols-5 gap-1.5">
            {stations.map((st, idx) => (
              <StationCard key={st.id} station={st} index={idx} onClick={e => { e.stopPropagation(); setSelectedStation(st.id); }} />
            ))}
          </div>
        </ChartContainer>

        {/* Alert panel */}
        <div className="mt-6">
          <ChartContainer title={t('monitor.alertPanel')} onTimeRangeChange={handleTimeRange('alerts')}>
            <AlertTimeline alerts={alerts} onAcknowledge={acknowledgeAlert} monitorEvents={monitorEvents} />
          </ChartContainer>
        </div>

      </div>

      {/* Station detail modal */}
      <AnimatePresence>
        {station && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setSelectedStation(null)}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-surface rounded-xl border border-white/10 p-6 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: STATUS_LABEL[station.status]?.color || '#4A5568' }} />
                  <span className="text-lg font-bold text-text-primary">{station.id}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${STATUS_LABEL[station.status]?.color}20`, color: STATUS_LABEL[station.status]?.color }}>
                    {t(STATUS_LABEL[station.status]?.labelKey) || station.status}
                  </span>
                </div>
                <button onClick={() => setSelectedStation(null)} className="text-text-muted hover:text-text-primary transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                    <div className="text-[10px] font-mono text-text-muted">{t('monitor.stationModel')}</div>
                    <div className="text-xs font-bold font-mono text-text-primary mt-1">{station.model}</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                    <div className="text-[10px] font-mono text-text-muted">{t('monitor.operator')}</div>
                    <div className="text-xs font-bold font-mono text-text-primary mt-1">{station.operator}</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                    <div className="text-[10px] font-mono text-text-muted">{t('monitor.output')}</div>
                    <div className="text-sm font-bold font-mono text-accent-blue mt-1">{station.output}</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                    <div className="text-[10px] font-mono text-text-muted">Cycle Time</div>
                    <div className="text-sm font-bold font-mono mt-1" style={{ color: station.cycleTime > 28 ? '#D9534F' : station.cycleTime > 22 ? '#E8A838' : '#5BA87A' }}>{station.cycleTime > 0 ? `${station.cycleTime.toFixed(1)}s` : '--'}</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                    <div className="text-[10px] font-mono text-text-muted">{t('monitor.temperature')}</div>
                    <div className="text-sm font-bold font-mono mt-1" style={{ color: station.temperature > 42 ? '#D9534F' : station.temperature > 39 ? '#E8A838' : '#5BA87A' }}>{station.temperature.toFixed(1)}°C</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                    <div className="text-[10px] font-mono text-text-muted">{t('monitor.torque')}</div>
                    <div className="text-sm font-bold font-mono mt-1" style={{ color: station.torque > 5.5 || station.torque < 3.5 ? '#D9534F' : '#5BA87A' }}>{station.torque.toFixed(2)} Nm</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MonitorPage;
