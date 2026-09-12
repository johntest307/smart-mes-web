import React, { useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Maximize2, Clock, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { exportCSV } from '../../utils/csvExport';

export type TimeRange = 'realtime' | '60min' | '12h' | 'week' | 'month';

interface ChartContainerProps {
  title: React.ReactNode;
  children: React.ReactNode;
  onExport?: () => { headers: string[]; rows: (string | number)[][] } | null;
  onTimeRangeChange?: (range: TimeRange) => void;
  defaultTimeRange?: TimeRange;
  loading?: boolean;
  historyCount?: number;
  exportUrl?: string;
}

const TIME_KEYS: { key: TimeRange; tKey: string }[] = [
  { key: 'realtime', tKey: 'chart.realtime' },
  { key: '60min', tKey: 'chart.60min' },
  { key: '12h', tKey: 'chart.12h' },
  { key: 'week', tKey: 'chart.week' },
  { key: 'month', tKey: 'chart.month' },
];

const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  children,
  onExport,
  onTimeRangeChange,
  defaultTimeRange = 'realtime',
  loading = false,
  historyCount,
  exportUrl,
}) => {
  const { t } = useTranslation();
  const [enlarged, setEnlarged] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange);
  const chartRef = useRef<HTMLDivElement>(null);
  const TIME_RANGES = useMemo(() => TIME_KEYS.map(tr => ({ key: tr.key, label: t(tr.tKey) })), [t]);

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range);
    onTimeRangeChange?.(range);
  }, [onTimeRangeChange]);

  const handleExport = useCallback(() => {
    if (exportUrl) {
      window.open(exportUrl, '_blank');
      return;
    }
    if (!onExport) return;
    const result = onExport();
    if (!result) return;
    const { headers, rows } = result;
    const titleStr = typeof title === 'string' ? title : '';
    exportCSV(headers, rows, `${titleStr}_${new Date().toISOString().slice(0, 10)}.csv`);
  }, [onExport, title, exportUrl]);

  return (
    <>
      <div className="rounded-xl border border-white/10 bg-surface p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-text-primary">
            {title}
            {historyCount !== undefined && timeRange !== 'realtime' && (
              <span className="text-[9px] font-mono text-text-muted ml-2">({historyCount} {t('chart.records')})</span>
            )}
            {loading && <Loader2 size={10} className="inline ml-1 animate-spin text-accent-blue" />}
          </div>
          <div className="flex items-center gap-2">
            {/* Time range selector */}
            <div className="flex items-center gap-0.5 bg-base rounded-md p-0.5">
              <Clock size={10} className="text-text-muted ml-1" />
              {TIME_RANGES.map(tr => (
                <button
                  key={tr.key}
                  onClick={() => handleTimeRangeChange(tr.key)}
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                    timeRange === tr.key
                      ? 'bg-accent-blue/15 text-accent-blue font-semibold'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {tr.label}
                </button>
              ))}
            </div>
            {/* Enlarge button */}
            <button
              onClick={() => setEnlarged(true)}
              className="text-text-muted hover:text-text-primary transition-colors p-1"
              title={t('chart.enlarge')}
            >
              <Maximize2 size={12} />
            </button>
            {/* Export button */}
            {onExport && (
              <button
                onClick={handleExport}
                className="text-text-muted hover:text-accent-blue transition-colors p-1"
                title={t('chart.export')}
              >
                <Download size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Chart content */}
        <div ref={chartRef} className="cursor-pointer" onClick={() => setEnlarged(true)}>
          {children}
        </div>
      </div>

      {/* Enlarged modal */}
      <AnimatePresence>
        {enlarged && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8"
            onClick={() => setEnlarged(false)}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-surface rounded-xl border border-white/10 p-6 w-full max-w-5xl max-h-[90vh] overflow-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-text-primary">{title}</div>
                <button
                  onClick={() => setEnlarged(false)}
                  className="text-text-muted hover:text-text-primary transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="w-full" style={{ minHeight: '400px' }}>
                {children}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChartContainer;
