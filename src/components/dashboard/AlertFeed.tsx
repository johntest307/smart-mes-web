import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, AlertTriangle, Info, Check } from 'lucide-react';
import type { Alert } from '../../hooks/useDashboardData';

interface AlertFeedProps {
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
}

const levelConfig = {
  critical: { color: '#D9534F', bg: 'bg-red-500/10', border: 'border-red-500/30', Icon: AlertOctagon, label: '緊急' },
  warning: { color: '#E8A838', bg: 'bg-warning/10', border: 'border-warning/30', Icon: AlertTriangle, label: '警告' },
  info: { color: '#4A90C7', bg: 'bg-accent-blue/10', border: 'border-accent-blue/30', Icon: Info, label: '資訊' },
};

const AlertFeed: React.FC<AlertFeedProps> = ({ alerts, onAcknowledge }) => {
  return (
    <div className="space-y-2 overflow-y-auto max-h-80">
      <AnimatePresence>
        {alerts.length === 0 && (
          <div className="text-text-muted text-sm text-center py-8 font-mono">等待告警中...</div>
        )}
        {alerts.map((alert) => {
          const cfg = levelConfig[alert.level];
          const Icon = cfg.Icon;
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 30, height: 0 }}
              animate={{ opacity: alert.acknowledged ? 0.4 : 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, x: -30, height: 0 }}
              transition={{ duration: 0.3 }}
              className={`rounded-lg border ${cfg.border} ${cfg.bg} p-3 cursor-pointer transition-opacity`}
              onClick={() => onAcknowledge(alert.id)}
            >
              <div className="flex items-start gap-2.5">
                <Icon size={16} style={{ color: cfg.color }} className="mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${cfg.color}20`, color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono">{alert.station}</span>
                    <span className="text-[10px] text-text-muted ml-auto">{alert.timestamp}</span>
                  </div>
                  <div className="text-xs text-text-primary leading-snug">{alert.message}</div>
                </div>
                {alert.acknowledged && (
                  <Check size={14} className="text-accent-green flex-shrink-0" />
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default AlertFeed;
