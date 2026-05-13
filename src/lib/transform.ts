import { Row, TransformType } from '@/context/ChartContext';

// ─────────────────────────────────────────────
// 1. 열(기간/연도) 기준 비중 %
// ─────────────────────────────────────────────
export function transformColPct(data: Row[], yAxes: string[]): Row[] {
  const colTotals: Record<string, number> = {};
  yAxes.forEach(y => {
    colTotals[y] = data.reduce((s, r) => s + (Number(r[y]) || 0), 0);
  });
  return data.map(row => {
    const n: Row = { ...row };
    yAxes.forEach(y => {
      const t = colTotals[y];
      n[y] = t > 0 ? Math.round(((Number(row[y]) || 0) / t) * 1000) / 10 : 0;
    });
    return n;
  });
}

// ─────────────────────────────────────────────
// 2. 행(항목) 기준 비중 %
// ─────────────────────────────────────────────
export function transformRowPct(data: Row[], yAxes: string[]): Row[] {
  return data.map(row => {
    const total = yAxes.reduce((s, y) => s + (Number(row[y]) || 0), 0);
    const n: Row = { ...row };
    yAxes.forEach(y => {
      n[y] = total > 0 ? Math.round(((Number(row[y]) || 0) / total) * 1000) / 10 : 0;
    });
    return n;
  });
}

// ─────────────────────────────────────────────
// 3. 전체 합계 기준 비중 %
// ─────────────────────────────────────────────
export function transformTotalPct(data: Row[], yAxes: string[]): Row[] {
  const grand = data.reduce((s, r) => s + yAxes.reduce((a, y) => a + (Number(r[y]) || 0), 0), 0);
  return data.map(row => {
    const n: Row = { ...row };
    yAxes.forEach(y => {
      n[y] = grand > 0 ? Math.round(((Number(row[y]) || 0) / grand) * 1000) / 10 : 0;
    });
    return n;
  });
}

// ─────────────────────────────────────────────
// 4. 순위 변환
// ─────────────────────────────────────────────
export function transformRank(data: Row[], yAxes: string[]): Row[] {
  const result = data.map(r => ({ ...r }));
  yAxes.forEach(y => {
    const sorted = [...data]
      .map((r, i) => ({ i, v: Number(r[y]) || 0 }))
      .sort((a, b) => b.v - a.v);
    sorted.forEach((item, rank) => { result[item.i][y] = rank + 1; });
  });
  return result;
}

// ─────────────────────────────────────────────
// 5. 누적 합계 (각 Y축을 누적)
// ─────────────────────────────────────────────
export function transformCumulative(data: Row[], yAxes: string[]): Row[] {
  const acc: Record<string, number> = {};
  yAxes.forEach(y => { acc[y] = 0; });
  return data.map(row => {
    const n: Row = { ...row };
    yAxes.forEach(y => {
      acc[y] += Number(row[y]) || 0;
      n[y] = Math.round(acc[y] * 10) / 10;
    });
    return n;
  });
}

// ─────────────────────────────────────────────
// 6. 기간 집계 (월 → 분기 or 반기)
//    xAxis 값 형태: "1월", "2024-01", "Jan" 등에서 월 번호 추출
// ─────────────────────────────────────────────
function getMonthNum(val: string): number | null {
  const m = String(val).match(/(\d{1,2})월|(\d{4}[-/](\d{1,2}))|^(\d{1,2})$/);
  if (!m) return null;
  const raw = m[1] ?? m[3] ?? m[4];
  const n = parseInt(raw, 10);
  return n >= 1 && n <= 12 ? n : null;
}

function periodLabel(month: number, type: 'quarter' | 'half'): string {
  if (type === 'quarter') {
    const q = Math.ceil(month / 3);
    return `Q${q}`;
  }
  return month <= 6 ? '상반기' : '하반기';
}

export function transformPeriod(
  data: Row[],
  xAxis: string,
  yAxes: string[],
  type: 'quarter' | 'half'
): Row[] {
  const buckets: Record<string, Record<string, number>> = {};
  const order: string[] = [];

  data.forEach(row => {
    const month = getMonthNum(String(row[xAxis]));
    if (month === null) return;
    const label = periodLabel(month, type);
    if (!buckets[label]) { buckets[label] = {}; order.push(label); }
    yAxes.forEach(y => {
      buckets[label][y] = (buckets[label][y] ?? 0) + (Number(row[y]) || 0);
    });
  });

  return order.map(label => {
    const r: Row = { [xAxis]: label };
    yAxes.forEach(y => { r[y] = Math.round((buckets[label][y] ?? 0) * 10) / 10; });
    return r;
  });
}

// ─────────────────────────────────────────────
// Entry: 변환 타입에 따른 분기
// ─────────────────────────────────────────────
export function applyTransform(
  data: Row[],
  yAxes: string[],
  transformType: TransformType,
  xAxis = ''
): Row[] {
  switch (transformType) {
    case 'col-pct':        return transformColPct(data, yAxes);
    case 'row-pct':        return transformRowPct(data, yAxes);
    case 'total-pct':      return transformTotalPct(data, yAxes);
    case 'rank':           return transformRank(data, yAxes);
    case 'cumulative':     return transformCumulative(data, yAxes);
    case 'period-quarter': return transformPeriod(data, xAxis, yAxes, 'quarter');
    case 'period-half':    return transformPeriod(data, xAxis, yAxes, 'half');
    default:               return data;
  }
}

// ─────────────────────────────────────────────
// 데이터 구조 자연어 설명
// ─────────────────────────────────────────────
export function describeData(
  data: Row[],
  xAxis: string,
  yAxes: string[]
): { summary: string; suggestion: string } {
  if (!data.length || !xAxis || !yAxes.length)
    return { summary: '', suggestion: '' };

  const rowCount = data.length;
  const sampleX  = data.slice(0, 3).map(r => String(r[xAxis])).join(', ');
  const yLabel   = yAxes.slice(0, 3).join(', ') + (yAxes.length > 3 ? '...' : '');

  // Detect monthly data
  const isMonthly = data.slice(0, 5).every(r => getMonthNum(String(r[xAxis])) !== null);

  const summary =
    `현재 데이터: **${xAxis}** 기준 ${rowCount}개 항목 (${sampleX}...)에 대해 **${yLabel}** 수치가 있습니다.`;

  const suggestion = isMonthly
    ? '월별 데이터이므로 분기 또는 반기로 집계하거나, 누적 추이를 확인하기 좋습니다.'
    : yAxes.length > 1
    ? `여러 지표(${yLabel})가 있어 항목별 비중 비교에 적합합니다.`
    : `${xAxis}별 ${yLabel} 절대값 대신 전체 대비 비중(%)으로 비교해 보세요.`;

  return { summary, suggestion };
}
