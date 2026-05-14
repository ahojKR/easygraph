import { AggRow, KPIResult } from './periodEngine';

export interface AutoInsight {
  id:       string;
  type:     'trend' | 'anomaly' | 'summary' | 'comparison';
  title:    string;
  content:  string;
  value?:   number;
  severity: 'info' | 'warning' | 'positive';
}

// ─── 핵심 함수 ─────────────────────────────────────────

/**
 * KPI 결과를 기반으로 자동 인사이트 생성
 */
export function generateInsights(
  kpis: KPIResult[],
  aggRows: AggRow[],
  periodALabel: string,
  periodBLabel?: string
): AutoInsight[] {
  const insights: AutoInsight[] = [];

  if (!kpis.length) return insights;

  // 1. 전체 합계
  const totalA = kpis.reduce((s, k) => s + k.totalA, 0);
  const totalB = kpis.reduce((s, k) => s + k.totalB, 0);
  const overallYoY = totalB > 0
    ? Math.round(((totalA - totalB) / totalB) * 1000) / 10
    : 0;

  insights.push({
    id: 'total-summary',
    type: 'summary',
    title: `전체 합계 (${periodALabel})`,
    content: `전체 합계는 ${totalA.toLocaleString()}으로${
      totalB > 0
        ? ` 전년(${totalB.toLocaleString()}) 대비 ${overallYoY > 0 ? '+' : ''}${overallYoY}% 변화했습니다.`
        : '.'
    }`,
    value: overallYoY,
    severity: overallYoY >= 0 ? 'positive' : 'warning',
  });

  // 2. 최고 성장 Subsidiary
  const sorted = [...kpis].sort((a, b) => b.yoyGrowth - a.yoyGrowth);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  if (best && best.totalB > 0) {
    insights.push({
      id: 'best-growth',
      type: 'trend',
      title: `최고 성장: ${best.subsidiary}`,
      content: `${best.subsidiary}는 ${periodALabel} 기준 ${best.totalA.toLocaleString()}으로 YoY ${best.yoyGrowth > 0 ? '+' : ''}${best.yoyGrowth}% 성장했습니다.`,
      value: best.yoyGrowth,
      severity: 'positive',
    });
  }

  // 3. 주의 필요 Subsidiary (하락)
  if (worst && worst.yoyGrowth < 0 && worst.totalB > 0) {
    insights.push({
      id: 'worst-growth',
      type: 'anomaly',
      title: `성장 주의: ${worst.subsidiary}`,
      content: `${worst.subsidiary}는 ${periodALabel} 기준 ${worst.totalA.toLocaleString()}으로 전년 대비 ${worst.yoyGrowth}% 하락했습니다.`,
      value: worst.yoyGrowth,
      severity: 'warning',
    });
  }

  // 4. Category 비중 분석 (HS/ES/MS)
  const categories = [...new Set(aggRows.map(r => r.category))];
  if (categories.length > 1) {
    const totalByCategory = categories.map(cat => ({
      cat,
      total: aggRows
        .filter(r => r.category === cat && r.periodId === aggRows[0]?.periodId)
        .reduce((s, r) => s + r.value, 0),
    }));
    totalByCategory.sort((a, b) => b.total - a.total);
    const topCat = totalByCategory[0];
    const grandTotal = totalByCategory.reduce((s, c) => s + c.total, 0);
    if (topCat && grandTotal > 0) {
      const share = Math.round((topCat.total / grandTotal) * 1000) / 10;
      insights.push({
        id: 'top-category',
        type: 'comparison',
        title: `주요 카테고리: ${topCat.cat}`,
        content: `${topCat.cat}가 전체의 ${share}%를 차지하며 가장 큰 비중을 보입니다 (${topCat.total.toLocaleString()}).`,
        severity: 'info',
      });
    }
  }

  // 5. 두 기간 비교 요약
  if (periodBLabel && totalB > 0) {
    const growing = kpis.filter(k => k.yoyGrowth > 0).length;
    const total = kpis.length;
    insights.push({
      id: 'yoy-overview',
      type: 'comparison',
      title: 'YoY 비교 요약',
      content: `${total}개 Subsidiary 중 ${growing}개가 전년(${periodBLabel}) 대비 성장했습니다. 전체 성장률 ${overallYoY > 0 ? '+' : ''}${overallYoY}%.`,
      value: overallYoY,
      severity: overallYoY >= 0 ? 'positive' : 'warning',
    });
  }

  return insights;
}
