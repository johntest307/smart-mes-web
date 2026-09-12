import { useState, useMemo, useCallback } from 'react';

export type TimeRange = 'realtime' | '60min' | '12h' | 'week' | 'month';

const RANGE_MS: Record<TimeRange, number> = {
  realtime: 0,
  '60min': 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  'week': 7 * 24 * 60 * 60 * 1000,
  'month': 30 * 24 * 60 * 60 * 1000,
};

export function useTimeRange() {
  const [ranges, setRanges] = useState<Record<string, TimeRange>>({});

  const setRange = useCallback((key: string, range: TimeRange) => {
    setRanges(prev => ({ ...prev, [key]: range }));
  }, []);

  const getRange = useCallback((key: string): TimeRange => {
    return ranges[key] || 'realtime';
  }, [ranges]);

  return { ranges, setRange, getRange };
}

export function useFilteredData<T extends Record<string, any>>(
  data: T[],
  range: TimeRange,
  getTimestamp: (item: T) => string | undefined,
): T[] {
  return useMemo(() => {
    if (range === 'realtime' || !data.length) return data;
    const now = Date.now();
    const ms = RANGE_MS[range];
    return data.filter(item => {
      const ts = getTimestamp(item);
      if (!ts) return true;
      const t = new Date(ts).getTime();
      return !isNaN(t) && (now - t) <= ms;
    });
  }, [data, range]);
}
