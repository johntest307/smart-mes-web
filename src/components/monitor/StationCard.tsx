import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { StationSnapshot } from '../../hooks/useDashboardData';

const STATUS_KEY: Record<string, string> = {
  running: 'monitor.statusRunning',
  waiting: 'monitor.statusWaiting',
  error: 'monitor.statusError',
  offline: 'monitor.statusOffline',
};

function CycleGauge({ value, max = 30 }: { value: number; max?: number }) {
  const pct = Math.min(value / max, 1);
  const color = value === 0 ? '#4A5568' : value > 28 ? '#D9534F' : value > 22 ? '#E8A838' : '#5BA87A';
  return (
    <svg width="48" height="28" viewBox="0 0 48 28" className="flex-shrink-0">
      <path d="M4 24 A20 20 0 0 1 44 24" fill="none" stroke="#1A232E" strokeWidth="5" strokeLinecap="round" />
      <path d="M4 24 A20 20 0 0 1 44 24" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${pct * 62.8} 62.8`} strokeDashoffset="0" />
      <text x="24" y="24" textAnchor="middle" fill={color} fontSize="9" fontFamily="monospace" fontWeight="bold">
        {value > 0 ? `${value}s` : '--'}
      </text>
    </svg>
  );
}

interface StationCardProps {
  station: StationSnapshot;
  index: number;
  onClick?: (e: React.MouseEvent) => void;
}

const StationCard: React.FC<StationCardProps> = memo(({ station, index, onClick }) => {
  const { t } = useTranslation();
  const statusLabel = t(STATUS_KEY[station.status] || '');
  const tempColor = station.temperature > 42 ? '#D9534F' : station.temperature > 39 ? '#E8A838' : '#5BA87A';
  const torqueColor = station.torque > 5.5 || station.torque < 3.5 ? '#D9534F' : '#5BA87A';
  const isError = station.status === 'error';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={
        isError
          ? {
              opacity: 1,
              scale: 1,
              borderColor: ['rgba(217,83,79,1)', 'rgba(217,83,79,0.3)', 'rgba(217,83,79,1)'],
              boxShadow: ['0 0 14px rgba(217,83,79,0.9)', '0 0 4px rgba(217,83,79,0.2)', '0 0 14px rgba(217,83,79,0.9)'],
            }
          : { opacity: 1, scale: 1 }
      }
      transition={
        isError
          ? { duration: 0.4, ease: 'easeInOut', borderColor: { repeat: Infinity, duration: 1.5 }, boxShadow: { repeat: Infinity, duration: 1.5 } }
          : { duration: 0.4, ease: 'easeInOut' }
      }
      className="rounded-xl border-2 bg-surface p-3 flex flex-col gap-2 relative overflow-hidden cursor-pointer"
      style={{ borderColor: isError ? '#D9534F' : '#2A3A4A', boxShadow: isError ? '0 0 8px rgba(217,83,79,0.5)' : 'none' }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: isError ? '#D9534F' : '#4A5568' }} />
          <span className="font-mono font-bold text-xs" style={{ color: isError ? '#D9534F' : '#8896A6' }}>{station.id}</span>
        </div>
        <span className="text-[9px] font-mono px-1 py-0.5 rounded" style={{ background: isError ? 'rgba(217,83,79,0.15)' : 'rgba(74,85,104,0.15)', color: isError ? '#D9534F' : '#8896A6' }}>
          {statusLabel}
        </span>
      </div>

      {/* Model + Operator */}
      <div className="text-[9px] text-text-muted font-mono leading-tight">
        <div>{station.model}</div>
        <div>{station.operator}</div>
      </div>

      {/* OPC-style gauges row */}
      <div className="flex items-center gap-2 mt-1">
        <CycleGauge value={station.cycleTime} />
        <div className="flex flex-col gap-0.5 text-[9px] font-mono">
          <span style={{ color: tempColor }}>{station.temperature.toFixed(1)}°C</span>
          <span style={{ color: torqueColor }}>{station.torque.toFixed(2)} Nm</span>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[9px] text-text-muted">{t('monitor.output')}</div>
          <div className="text-xs font-bold font-mono text-accent-blue">{station.output}</div>
        </div>
      </div>

      {/* Station index badge */}
      <div className="absolute top-1 right-1 text-[8px] text-text-muted/30 font-mono">#{index + 1}</div>
    </motion.div>
  );
});

export default StationCard;
