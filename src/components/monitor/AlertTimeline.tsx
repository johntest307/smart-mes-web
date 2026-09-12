import React, { memo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, AlertTriangle, Info, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Alert, MonitorEvent } from '../../hooks/useDashboardData';

type FeedItem = Alert | (MonitorEvent & { acknowledged?: boolean });

interface AlertTimelineProps {
  alerts: Alert[];
  monitorEvents: MonitorEvent[];
  onAcknowledge: (id: string) => void;
}

const levelConfig = {
  critical: { color: '#D9534F', bg: 'bg-red-500/10', border: 'border-red-500/30', Icon: AlertOctagon, labelKey: 'monitor.critical' as string },
  warning: { color: '#E8A838', bg: 'bg-warning/10', border: 'border-warning/30', Icon: AlertTriangle, labelKey: 'monitor.warning' as string },
  info: { color: '#4A90C7', bg: 'bg-accent-blue/10', border: 'border-accent-blue/30', Icon: Info, labelKey: 'monitor.info' as string },
};

function getLevel(item: FeedItem): 'critical' | 'warning' | 'info' {
  return 'level' in item ? item.level : item.type;
}

function getStation(item: FeedItem): string {
  return item.station;
}

function getMessage(item: FeedItem): string {
  return item.message;
}

function getTimestamp(item: FeedItem): string {
  return item.timestamp;
}

function getId(item: FeedItem): string {
  return item.id;
}

function isAcknowledged(item: FeedItem): boolean {
  return 'acknowledged' in item && item.acknowledged === true;
}

const TABS = [
  { key: 'alerts' as const, labelKey: 'monitor.tabAlerts' as const, countKey: 'alerts' as const },
  { key: 'events' as const, labelKey: 'monitor.tabEvents' as const, countKey: 'events' as const },
];

const AlertTimeline: React.FC<AlertTimelineProps> = memo(({ alerts, monitorEvents, onAcknowledge }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'alerts' | 'events'>('alerts');
  const listRef = useRef<HTMLDivElement>(null);

  const items: FeedItem[] = activeTab === 'alerts' ? alerts : monitorEvents;
  const hasCriticalUnack = alerts.some(a => a.level === 'critical' && !a.acknowledged);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [items]);

  return (
    <div className="rounded-xl border border-white/10 bg-surface p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full bg-danger ${hasCriticalUnack ? 'animate-pulse' : ''}`} />
          <span className="text-sm font-semibold text-text-primary">{t('monitor.alertPanel')}</span>
        </div>
        <span className="text-[10px] font-mono text-text-muted">{items.length} {t('chart.records')}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const count = tab.countKey === 'alerts' ? alerts.length : monitorEvents.length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`text-[10px] font-mono px-2.5 py-1 rounded-md transition-colors ${
                isActive
                  ? 'bg-accent-blue/15 text-accent-blue font-semibold'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/5'
              }`}
            >
              {t(tab.labelKey)} ({count})
            </button>
          );
        })}
      </div>

      {/* Feed list */}
      <div ref={listRef} className="relative flex-1 overflow-y-auto space-y-1.5 min-h-0 max-h-[30rem]">
        <AnimatePresence initial={false}>
          {items.length === 0 && (
            <div className="text-text-muted text-xs text-center py-8 font-mono">{t('cost.noData')}...</div>
          )}
          {items.map((item, i) => {
            const level = getLevel(item);
            const cfg = levelConfig[level];
            const Icon = cfg.Icon;
            const acknowledged = isAcknowledged(item);
            const isLatest = i === 0;

            return (
              <motion.div
                key={getId(item)}
                initial={{ opacity: 0, x: 20, height: 0 }}
                animate={{ opacity: acknowledged ? 0.4 : 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex items-start gap-2 rounded-lg border ${cfg.border} ${cfg.bg} p-3 transition-opacity ${
                  activeTab === 'alerts' ? 'cursor-pointer' : ''
                }`}
                onClick={activeTab === 'alerts' ? () => onAcknowledge(getId(item)) : undefined}
              >
                {/* Timeline dot */}
                <div className="flex flex-col items-center gap-0.5 pt-0.5">
                  <motion.div
                    animate={isLatest && getLevel(item) === 'critical' ? { scale: [1, 1.4, 1] } : {}}
                    transition={{ duration: 0.6, repeat: isLatest && getLevel(item) === 'critical' ? Infinity : 0 }}
                    className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }}
                  />
                  {i < items.length - 1 && <div className="w-px h-full min-h-[20px] bg-white/5" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <Icon size={16} style={{ color: cfg.color }} className="mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${cfg.color}20`, color: cfg.color }}>
                          {t(cfg.labelKey)}
                        </span>
                        <span className="text-[10px] text-text-muted font-mono">{getStation(item)}</span>
                        <span className="text-[10px] text-text-muted ml-auto">{getTimestamp(item)}</span>
                      </div>
                      <div className="text-xs text-text-primary leading-snug">{getMessage(item)}</div>
                    </div>
                    {acknowledged && (
                      <Check size={14} className="text-accent-green flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {activeTab === 'alerts' && (
        <p className="text-text-muted text-[10px] mt-3">{t('monitor.clickToAcknowledge')} ↑</p>
      )}
    </div>
  );
});

export default AlertTimeline;
