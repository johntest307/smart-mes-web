import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ProductionProgress } from '../../hooks/useDashboardData';
import { TrendingUp, Clock, Calendar } from 'lucide-react';

const STATUS_LABEL_KEYS: Record<string, string> = {
  '提早': 'yield.early',
  '準時': 'yield.onTime',
  '延遲': 'yield.delayed',
};

const statusConfig: Record<ProductionProgress['status'], { color: string }> = {
  '提早': { color: '#5BA87A' },
  '準時': { color: '#4A90C7' },
  '延遲': { color: '#D9534F' },
};

const ProductionProgressCard: React.FC<{ data: ProductionProgress }> = ({ data }) => {
  const { t } = useTranslation();
  const safeStatus: ProductionProgress['status'] = data.status === '提早' || data.status === '準時' || data.status === '延遲' ? data.status : '準時';
  const sc = statusConfig[safeStatus];
  const fillWidth = Math.min(data.percent, 100);

  return (
    <div className="rounded-lg border border-white/10 bg-surface p-3">
      <div className="text-[9px] font-mono text-text-muted mb-2 tracking-wider">{t('yield.productionProgress')}</div>

      <div className="flex items-end justify-between mb-2">
        <div>
          <span className="text-lg font-bold font-mono text-text-primary">{data.percent}%</span>
          <span className="text-[9px] font-mono text-text-muted ml-1.5">
            {data.completed.toLocaleString()} / {data.target.toLocaleString()}
          </span>
        </div>
        <div className="text-[10px] font-bold font-mono px-2 py-0.5 rounded border"
          style={{ color: sc.color, borderColor: `${sc.color}50`, background: `${sc.color}15` }}>
          {t(STATUS_LABEL_KEYS[safeStatus] || '')}
        </div>
      </div>

      <div className="w-full h-2 rounded-full bg-white/5 mb-3 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${fillWidth}%`, background: `linear-gradient(90deg, ${sc.color}80, ${sc.color})` }} />
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] font-mono">
        <div className="flex items-center gap-1 text-text-muted">
          <Calendar size={10} />
          <span>{t('yield.target')} {data.deadline}</span>
        </div>
        <div className="flex items-center gap-1 text-text-muted">
          <Clock size={10} />
          <span>{t('yield.estimatedCompletion')} {data.estimatedCompletion}</span>
        </div>
        <div className="flex items-center gap-1 text-text-muted">
          <TrendingUp size={10} />
          <span>{t('yield.dailyTarget')} {data.dailyRate}</span>
        </div>
        <div className="flex items-center gap-1 text-text-muted">
          <TrendingUp size={10} />
          <span>{t('yield.dailyEffectiveOutput')} {data.effectiveDailyRate}</span>
        </div>
      </div>
    </div>
  );
};

export default ProductionProgressCard;
