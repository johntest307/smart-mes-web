import React, { createContext, useContext } from 'react';
import { useSupabaseData } from './useSupabaseData';
import type { DashboardDataWithLoading } from './useSupabaseData';
type DataType = string;
type TimeRange = 'realtime' | '60min' | '12h' | 'week' | 'month';

export type { DataType, TimeRange };
export { calcCostSummary } from './useDashboardData';

interface DashboardContextValue extends DashboardDataWithLoading {
  fpy: number;
  getHistory: (type: DataType, period: TimeRange) => Promise<{ type: string; period: string; count: number; data: never[] }>;
  acknowledgeAlert: (id: string) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const data = useSupabaseData();

  const ctxValue: DashboardContextValue = {
    ...data,
    fpy: data.kpis.fpy,
    getHistory: () => Promise.resolve({ type: '', period: '', count: 0, data: [] }),
    acknowledgeAlert: () => {},
  };

  return <DashboardContext.Provider value={ctxValue}>{children}</DashboardContext.Provider>;
};

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}