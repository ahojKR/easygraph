/**
 * autoChartCases.ts
 * 업로드된 데이터를 분석해 여러 케이스의 차트 설정을 자동 생성합니다.
 */

import { Row, ColumnDef, ChartType, TransformType } from '@/context/ChartContext';
import { detectDataSchema } from './schemaDetect';
import {
  aggregateByPeriod, toChartData, PeriodDef,
} from './periodEngine';

// ─── 타입 ─────────────────────────────────────────────
export interface ChartCase {
  id:          string;
  title:       string;
  description: string;
  emoji:       string;
  chartType:   ChartType;
  data:        Row[];
  xAxis:       string;
  yAxes:       string[];
  colorScheme: string;
  transformType: TransformType;
  stacked:     boolean;
  showDataLabels: boolean;
  periodPairs?: [string, string][];  // YoY 표시용
}

// ─── 유틸 ─────────────────────────────────────────────
function numVal(v: unknown): number { return Number(v) || 0; }

function groupByX(
  data: Row[], xCol: string, yCols: string[]
): Row[] {
  const buckets: Record<string, Record<string, number>> = {};
  const order: string[] = [];
  data.forEach(row => {
    const key = String(row[xCol] ?? '');
    if (!buckets[key]) { buckets[key] = {}; order.push(key); }
    yCols.forEach(y => {
      buckets[key][y] = (buckets[key][y] ?? 0) + numVal(row[y]);
    });
  });
  return order.map(k => {
    const r: Row = { [xCol]: k };
    yCols.forEach(y => { r[y] = Math.round(buckets[k][y] ?? 0); });
    return r;
  });
}

function toPercent(data: Row[], xCol: string, yCols: string[]): Row[] {
  return data.map(row => {
    const total = yCols.reduce((s, y) => s + numVal(row[y]), 0);
    const nr: Row = { [xCol]: row[xCol] };
    yCols.forEach(y => {
      nr[y] = total > 0 ? Math.round((numVal(row[y]) / total) * 1000) / 10 : 0;
    });
    return nr;
  });
}

// ─── 기간 자동 설정 ───────────────────────────────────
function buildDefaultPeriods(schema: ReturnType<typeof detectDataSchema>): PeriodDef[] {
  const years = schema.col.years;
  if (!years.length) return [];
  const latestYear = years[years.length - 1];
  const prevYear   = years.length >= 2 ? years[years.length - 2] : 0;
  const latestCols = schema.col.yearColMap[latestYear] ?? [];
  const lastMonth  = latestCols.length || 7;
  const midMonth   = Math.min(7, lastMonth);

  const periods: PeriodDef[] = [
    {
      id: 'A', label: `Jan–${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][midMonth-1]}`,
      year: latestYear, fromMonth: 1, toMonth: midMonth,
      monthCount: midMonth,
    },
  ];
  if (lastMonth > midMonth) {
    periods.push({
      id: 'B',
      label: `${['Aug','Sep','Oct','Nov','Dec'][lastMonth - 8] ?? 'Dec'}`,
      year: latestYear, fromMonth: midMonth + 1, toMonth: lastMonth,
      monthCount: lastMonth - midMonth,
    });
  }
  if (prevYear > 0) {
    periods.push({
      id: 'C', label: `${prevYear} Jan–Jul (전년)`,
      year: prevYear, fromMonth: 1, toMonth: 7, monthCount: 7,
    });
  }
  return periods;
}

// ─── 메인: 케이스 자동 생성 ────────────────────────────
export function generateChartCases(
  rawData: Row[],
  headers: ColumnDef[]
): ChartCase[] {
  const schema   = detectDataSchema(rawData, headers);
  const cases: ChartCase[] = [];

  // ── 계층형 (Subsidiary × Category × Year/Month) ──────
  if (schema.isHierarchical && schema.col.monthCols.length > 0) {
    const periods  = buildDefaultPeriods(schema);
    const categories = schema.row.categories;
    const currPeriods = periods.filter(p => p.id !== 'C');
    const yoyPairs: [string, string][] = periods.find(p => p.id === 'C')
      ? [['A', 'C']] : [];

    // 현재+전년 포함 집계
    const aggAbs  = aggregateByPeriod(rawData, schema, periods, true);
    const ptsFull = toChartData(aggAbs, yoyPairs.length ? yoyPairs : undefined);

    // 현재 기간만
    const aggCurr = aggregateByPeriod(rawData, schema, currPeriods, true);
    const ptsCurr = toChartData(aggCurr);

    // 비중(%)용
    const ptsPct  = toChartData(aggCurr).map(pt => {
      const total = categories.reduce((s, c) => s + numVal(pt[c]), 0);
      const nr: Row = { x: pt.x, subsidiary: pt.subsidiary, periodLabel: pt.periodLabel, _total: pt._total, _yoy: pt._yoy ?? 0, _prevTotal: pt._prevTotal ?? 0 };
      categories.forEach(c => {
        nr[c] = total > 0 ? Math.round((numVal(pt[c]) / total) * 1000) / 10 : 0;
      });
      return nr;
    });

    // ── 케이스 1: 기간별 HS/ES/MS 비중 (%) ← 목표 차트
    if (ptsPct.length && categories.length > 0) {
      cases.push({
        id: 'period-pct-stacked',
        title: '기간별 HS/ES/MS 비중 (%)',
        description: `Jan–Jul / Aug–Oct 기간별 ${categories.join('/')} 비중을 비교합니다. (월 평균 기준)`,
        emoji: '🥧',
        chartType: 'stacked-bar',
        data: ptsPct as Row[],
        xAxis: 'x',
        yAxes: categories,
        colorScheme: 'bw',
        transformType: 'col-pct',
        stacked: true,
        showDataLabels: true,
        periodPairs: yoyPairs,
      });
    }

    // ── 케이스 2: 기간별 월 매출 평균 (절대값 + YoY)
    if (ptsFull.length && categories.length > 0) {
      cases.push({
        id: 'period-abs-yoy',
        title: '기간별 월평균 + YoY 성장률',
        description: `각 기간의 월 평균 매출 (${categories.join('/')}) 합계와 전년 대비 성장률(▲%)을 표시합니다.`,
        emoji: '📊',
        chartType: 'stacked-bar',
        data: ptsFull as Row[],
        xAxis: 'x',
        yAxes: categories,
        colorScheme: 'default',
        transformType: 'none',
        stacked: true,
        showDataLabels: true,
        periodPairs: yoyPairs,
      });
    }

    // ── 케이스 3: Subsidiary 비교 (기간 합계 기준)
    const subData = schema.row.subsidiaries.map(sub => {
      const subRows = aggCurr.filter(r => r.subsidiary === sub);
      const row: Row = { subsidiary: sub };
      categories.forEach(cat => {
        row[cat] = subRows.filter(r => r.category === cat).reduce((s, r) => s + r.value, 0);
      });
      return row;
    });
    if (subData.length) {
      cases.push({
        id: 'subsidiary-compare',
        title: 'Subsidiary 비교 (기간 합계)',
        description: `${schema.row.subsidiaries.join(', ')} 매출 합계를 ${categories.join('/')}로 분류하여 비교합니다.`,
        emoji: '🏢',
        chartType: 'stacked-bar',
        data: subData,
        xAxis: 'subsidiary',
        yAxes: categories,
        colorScheme: 'ocean',
        transformType: 'none',
        stacked: true,
        showDataLabels: false,
        periodPairs: [],
      });
    }

    // ── 케이스 4: 월별 시계열 (전체 합계)
    const monthCols = schema.col.monthCols.slice(0, 24); // 최대 24개월
    if (monthCols.length > 0) {
      // 소계행 아닌 행만, 전체 합계
      const monthData = monthCols.map(col => {
        const row: Row = { 기간: col };
        categories.forEach(cat => {
          const sum = rawData
            .filter(r =>
              String(r[schema.row.categoryCol!] ?? '') === cat &&
              !String(r[schema.row.subsidiaryCol!] ?? '').match(/요약|total/i)
            )
            .reduce((s, r) => s + numVal(r[col]), 0);
          row[cat] = sum;
        });
        return row;
      });
      cases.push({
        id: 'monthly-trend',
        title: '월별 시계열 추이',
        description: `매월 ${categories.join('/')} 매출 합계의 추이를 라인 차트로 봅니다.`,
        emoji: '📈',
        chartType: 'line',
        data: monthData,
        xAxis: '기간',
        yAxes: categories,
        colorScheme: 'default',
        transformType: 'none',
        stacked: false,
        showDataLabels: false,
        periodPairs: [],
      });
    }

    // ── 케이스 5: YoY 성장률만 (막대)
    if (yoyPairs.length && ptsFull.length) {
      const yoyData = ptsFull
        .filter(pt => pt._yoy !== 0 && pt._prevTotal && pt._prevTotal > 0)
        .map(pt => ({
          x: pt.x,
          'YoY (%)': Number(pt._yoy ?? 0),
        } as Row));

      if (yoyData.length) {
        cases.push({
          id: 'yoy-bar',
          title: 'YoY 성장률 비교',
          description: '전년 동기 대비 성장률(%)을 막대로 비교합니다.',
          emoji: '📉',
          chartType: 'bar',
          data: yoyData,
          xAxis: 'x',
          yAxes: ['YoY (%)'],
          colorScheme: 'sunset',
          transformType: 'none',
          stacked: false,
          showDataLabels: true,
          periodPairs: [],
        });
      }
    }

    // ── 케이스 6: 카테고리 비중 Donut
    const catTotals: Row[] = categories.map(cat => ({
      category: cat,
      value: rawData
        .filter(r => String(r[schema.row.categoryCol!] ?? '') === cat)
        .reduce((s, r) => s + schema.col.monthCols.slice(0, 12).reduce((ms, col) => ms + numVal(r[col]), 0), 0),
    }));
    if (catTotals.some(r => numVal(r.value) > 0)) {
      cases.push({
        id: 'category-donut',
        title: '카테고리 전체 비중',
        description: `전체 기간 기준 ${categories.join('/')} 비중을 파이 차트로 봅니다.`,
        emoji: '🍩',
        chartType: 'donut',
        data: catTotals,
        xAxis: 'category',
        yAxes: ['value'],
        colorScheme: 'ocean',
        transformType: 'none',
        stacked: false,
        showDataLabels: true,
        periodPairs: [],
      });
    }

  } else {
    // ── 단순 시계열 데이터 ────────────────────────────────
    const numCols = headers.filter(h => h.type === 'number').map(h => h.name);
    const catCol  = headers.find(h => h.type !== 'number')?.name ?? numCols[0];

    if (numCols.length === 0) return cases;

    // 케이스 1: 라인
    cases.push({
      id: 'simple-line',
      title: '시계열 라인 차트',
      description: '기간에 따른 수치 변화를 라인으로 봅니다.',
      emoji: '📈',
      chartType: 'line',
      data: rawData,
      xAxis: catCol,
      yAxes: numCols.slice(0, 5),
      colorScheme: 'default',
      transformType: 'none',
      stacked: false,
      showDataLabels: false,
      periodPairs: [],
    });

    // 케이스 2: 막대
    cases.push({
      id: 'simple-bar',
      title: '항목별 막대 차트',
      description: '항목별 수치를 막대로 비교합니다.',
      emoji: '📊',
      chartType: 'bar',
      data: groupByX(rawData, catCol, numCols.slice(0, 5)),
      xAxis: catCol,
      yAxes: numCols.slice(0, 5),
      colorScheme: 'ocean',
      transformType: 'none',
      stacked: false,
      showDataLabels: false,
      periodPairs: [],
    });

    // 케이스 3: 비중 누적
    const pctData = toPercent(rawData, catCol, numCols.slice(0, 5));
    cases.push({
      id: 'simple-pct',
      title: '비중(%) 누적 막대',
      description: '전체 합계 대비 각 항목의 비중을 비교합니다.',
      emoji: '🥧',
      chartType: 'stacked-bar',
      data: pctData,
      xAxis: catCol,
      yAxes: numCols.slice(0, 5),
      colorScheme: 'sunset',
      transformType: 'col-pct',
      stacked: true,
      showDataLabels: true,
      periodPairs: [],
    });

    // 케이스 4: 면적 누적
    cases.push({
      id: 'simple-area',
      title: '누적 면적 차트',
      description: '시간 흐름에 따른 누적 추이를 면적으로 봅니다.',
      emoji: '🌊',
      chartType: 'area',
      data: rawData,
      xAxis: catCol,
      yAxes: numCols.slice(0, 5),
      colorScheme: 'forest',
      transformType: 'none',
      stacked: false,
      showDataLabels: false,
      periodPairs: [],
    });
  }

  return cases;
}
