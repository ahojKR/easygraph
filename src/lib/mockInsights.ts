import { Row } from '@/context/ChartContext';
import { calcStats, calcMoMChanges, formatNumber, formatPercent } from './statistics';
import { InsightItem } from '@/context/ChartContext';

export function generateMockInsights(
  data: Row[],
  xCol: string,
  yCols: string[],
  fileName: string
): InsightItem[] {
  if (!data.length || !yCols.length) return [];

  const insights: InsightItem[] = [];
  const yCol = yCols[0];
  const vals = data.map(r => Number(r[yCol])).filter(v => !isNaN(v));

  if (!vals.length) return [];

  const stats = calcStats(vals);
  const momChanges = calcMoMChanges(data, xCol, yCol);
  const lastIdx = data.length - 1;
  const lastVal = vals[vals.length - 1];
  const lastPeriod = String(data[lastIdx]?.[xCol] ?? '');
  const prevVal = vals.length > 1 ? vals[vals.length - 2] : null;

  // Summary insight
  insights.push({
    type: 'summary',
    severity: 'info',
    text: `📊 ${fileName ? `'${fileName}'` : '업로드된 데이터'}의 ${yCol} 기준으로 총 ${data.length}개 기간을 분석했습니다. 전체 평균 ${formatNumber(stats.mean)}, 최댓값 ${formatNumber(stats.max)}, 최솟값 ${formatNumber(stats.min)}입니다.`,
  });

  // Latest MoM
  if (prevVal !== null) {
    const change = lastVal - prevVal;
    const pct = prevVal !== 0 ? (change / Math.abs(prevVal)) * 100 : 0;
    const isUp = change >= 0;
    insights.push({
      type: 'trend',
      severity: isUp ? 'positive' : 'warning',
      text: `${isUp ? '📈' : '📉'} ${lastPeriod} ${yCol}은 ${formatNumber(lastVal)}으로, 직전 기간 대비 ${formatNumber(Math.abs(change))} (${formatPercent(pct)}) ${isUp ? '증가' : '감소'}했습니다.`,
    });
  }

  // Best period
  const maxIdx = vals.indexOf(stats.max);
  if (maxIdx >= 0) {
    const maxPeriod = String(data[maxIdx]?.[xCol] ?? '');
    insights.push({
      type: 'summary',
      severity: 'positive',
      text: `🏆 분석 기간 중 ${yCol} 최고치는 ${maxPeriod}의 ${formatNumber(stats.max)}입니다.`,
    });
  }

  // Trend direction (first half vs second half avg)
  if (vals.length >= 4) {
    const half = Math.floor(vals.length / 2);
    const firstHalf = vals.slice(0, half);
    const secondHalf = vals.slice(half);
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const trendPct = firstAvg !== 0 ? ((secondAvg - firstAvg) / Math.abs(firstAvg)) * 100 : 0;
    const isImproving = secondAvg > firstAvg;
    insights.push({
      type: 'trend',
      severity: isImproving ? 'positive' : 'warning',
      text: `${isImproving ? '✅' : '⚠️'} 전체 추세: 후반부 평균(${formatNumber(secondAvg)})이 전반부 평균(${formatNumber(firstAvg)}) 대비 ${formatPercent(trendPct)} ${isImproving ? '상승' : '하락'}하여 ${isImproving ? '개선 추세' : '하락 추세'}를 보입니다.`,
    });
  }

  // Outlier alert
  const stddev = stats.stddev;
  const outliers = vals.filter(v => Math.abs(v - stats.mean) > 2 * stddev);
  if (outliers.length > 0) {
    insights.push({
      type: 'anomaly',
      severity: 'warning',
      text: `⚡ 통계적 이상값이 ${outliers.length}개 감지되었습니다. 평균 ${formatNumber(stats.mean)}에서 표준편차(${formatNumber(stddev)})의 2배 이상 벗어난 데이터가 존재합니다. 해당 기간의 데이터를 검토해보세요.`,
    });
  }

  // Multi-column comparison
  if (yCols.length > 1) {
    const col2 = yCols[1];
    const vals2 = data.map(r => Number(r[col2])).filter(v => !isNaN(v));
    if (vals2.length) {
      const stats2 = calcStats(vals2);
      insights.push({
        type: 'comparison',
        severity: 'info',
        text: `🔍 ${yCol}(평균 ${formatNumber(stats.mean)})과 ${col2}(평균 ${formatNumber(stats2.mean)})을 비교했을 때, ${stats.mean > stats2.mean ? yCol : col2}이 더 높은 평균값을 기록했습니다.`,
      });
    }
  }

  return insights;
}
