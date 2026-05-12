import { Row } from '@/context/ChartContext';

export interface StatResult {
  mean: number;
  min: number;
  max: number;
  stddev: number;
  sum: number;
  count: number;
}

export interface MoMResult {
  period: string;
  value: number;
  prevValue: number | null;
  change: number | null;
  changePercent: number | null;
  isUp: boolean | null;
}

// Basic stats for a numeric array
export function calcStats(values: number[]): StatResult {
  const valid = values.filter(v => !isNaN(v));
  if (valid.length === 0) return { mean: 0, min: 0, max: 0, stddev: 0, sum: 0, count: 0 };
  const sum = valid.reduce((a, b) => a + b, 0);
  const mean = sum / valid.length;
  const variance = valid.reduce((acc, v) => acc + (v - mean) ** 2, 0) / valid.length;
  return {
    mean,
    min: Math.min(...valid),
    max: Math.max(...valid),
    stddev: Math.sqrt(variance),
    sum,
    count: valid.length,
  };
}

// YTD (year-to-date) cumulative average per row
export function calcYTDAverage(data: Row[], xCol: string, yCol: string): Row[] {
  let runningSum = 0;
  let count = 0;
  return data.map(row => {
    const val = Number(row[yCol]);
    if (!isNaN(val)) {
      runningSum += val;
      count++;
    }
    return { ...row, [`${yCol}_ytd_avg`]: count > 0 ? runningSum / count : null };
  });
}

// N-period rolling average
export function calcRollingAverage(data: Row[], yCol: string, n: number): Row[] {
  return data.map((row, i) => {
    const window = data.slice(Math.max(0, i - n + 1), i + 1);
    const vals = window.map(r => Number(r[yCol])).filter(v => !isNaN(v));
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    return { ...row, [`${yCol}_rolling_${n}`]: avg };
  });
}

// Month-over-Month change
export function calcMoMChanges(data: Row[], xCol: string, yCol: string): MoMResult[] {
  return data.map((row, i) => {
    const value = Number(row[yCol]);
    const prevRow = i > 0 ? data[i - 1] : null;
    const prevValue = prevRow ? Number(prevRow[yCol]) : null;
    const change = prevValue !== null && !isNaN(prevValue) && !isNaN(value)
      ? value - prevValue : null;
    const changePercent = change !== null && prevValue !== null && prevValue !== 0
      ? (change / Math.abs(prevValue)) * 100 : null;
    return {
      period: String(row[xCol]),
      value,
      prevValue,
      change,
      changePercent,
      isUp: changePercent !== null ? changePercent >= 0 : null,
    };
  });
}

// YoY change (same period, previous year)
export function calcYoYChanges(data: Row[], xCol: string, yCol: string): MoMResult[] {
  return data.map((row, i) => {
    const value = Number(row[yCol]);
    const prevRow = i >= 12 ? data[i - 12] : null;
    const prevValue = prevRow ? Number(prevRow[yCol]) : null;
    const change = prevValue !== null && !isNaN(prevValue) && !isNaN(value)
      ? value - prevValue : null;
    const changePercent = change !== null && prevValue !== null && prevValue !== 0
      ? (change / Math.abs(prevValue)) * 100 : null;
    return {
      period: String(row[xCol]),
      value,
      prevValue,
      change,
      changePercent,
      isUp: changePercent !== null ? changePercent >= 0 : null,
    };
  });
}

// Outlier detection (beyond N standard deviations)
export function detectOutliers(data: Row[], yCol: string, threshold = 2): Set<number> {
  const vals = data.map(r => Number(r[yCol])).filter(v => !isNaN(v));
  const { mean, stddev } = calcStats(vals);
  const outlierIndices = new Set<number>();
  data.forEach((row, i) => {
    const v = Number(row[yCol]);
    if (!isNaN(v) && Math.abs(v - mean) > threshold * stddev) {
      outlierIndices.add(i);
    }
  });
  return outlierIndices;
}

// Enrich data with all statistical overlays
export function enrichData(
  data: Row[],
  xCol: string,
  yCols: string[],
  opts: {
    ytdAvg?: boolean;
    rollingAvg?: boolean;
    rollingN?: number;
  }
): Row[] {
  let enriched = [...data];
  for (const yCol of yCols) {
    if (opts.ytdAvg) enriched = calcYTDAverage(enriched, xCol, yCol);
    if (opts.rollingAvg && opts.rollingN) enriched = calcRollingAverage(enriched, yCol, opts.rollingN);
  }
  return enriched;
}

// Format number for display
export function formatNumber(n: number | null, decimals = 1): string {
  if (n === null || isNaN(n)) return '-';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(decimals) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(decimals) + 'K';
  return n.toFixed(decimals);
}

export function formatPercent(n: number | null): string {
  if (n === null || isNaN(n)) return '-';
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}
