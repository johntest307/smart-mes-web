import React, { memo } from 'react';
import { motion } from 'framer-motion';

interface FpyGaugeProps {
  fpy: number;
}

const FpyGauge: React.FC<FpyGaugeProps> = memo(({ fpy }) => {
  const RADIUS = 65;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const offset = CIRCUMFERENCE - (fpy / 100) * CIRCUMFERENCE;

  const color = fpy >= 95 ? '#5BA87A' : fpy >= 90 ? '#E8A838' : '#D9534F';

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative">
        <svg width="160" height="160" viewBox="0 0 160 160">
          {/* Background circle */}
          <circle cx="80" cy="80" r={RADIUS} fill="none" stroke="#1A232E" strokeWidth="14" />
          {/* Progress arc */}
          <motion.circle
            cx="80" cy="80" r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            transform="rotate(-90 80 80)"
            style={{ filter: `drop-shadow(0 0 8px ${color})` }}
          />
          {/* Center value */}
          <text x="80" y="75" textAnchor="middle" className="font-mono" fill={color} fontSize="32" fontWeight="bold" fontFamily="JetBrains Mono, monospace">
            {fpy.toFixed(1)}%
          </text>
          <text x="80" y="100" textAnchor="middle" fill="#8896A6" fontSize="13" fontFamily="Noto TC, sans-serif">
            良品率 FPY
          </text>
        </svg>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${fpy < 90 ? 'animate-pulse' : ''}`} style={{ backgroundColor: color }} />
        <span className="text-xs font-mono text-text-muted">
          {fpy >= 95 ? '良好' : fpy >= 90 ? '警告' : '危險'}
        </span>
      </div>
    </div>
  );
});

export default FpyGauge;
