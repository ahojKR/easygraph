import { Row } from '@/context/ChartContext';
import { DataSchema, isSummaryRow, getColsForPeriod } from './schemaDetect';

// ─── 타입 ────────────────────────────────────────────────
export interface PeriodDef {
  id:        string;   // 고유 ID
  label:     string;   // 표시명 (예: "Jan–Jul")
  year:      number;   // 데이터 연도
  fromMonth: number;   // 시작 월 (1-12)
  toMonth:   number;   // 종료 월 (1-12)
  monthCount: number;  // 포함 월 수
}

export interface AggRow {
  subsidiary: string;
  category:   string;
  periodId:   string;
  periodLabel: string;
  value:       number;   // 집계값 (월 평균 또는 합계)
  valueType:   'sum' | 'avg';
}

export interface KPIResult {
  subsidiary: string;
  periodA:    string;  // 기준 기간 레이블
  periodB:    string;  // 비교 기간 레이블 (YoY의 경우 이전 연도)
  totalA:     number;
  totalB:     number;
  yoyGrowth:  number;  // %
}

// ─── 합계 집계 ─────────────────────────────────────────
function sumCols(row: Row, cols: string[]): number {
  return cols.reduce((sum, col) => sum + (Number(row[col]) || 0), 0);
}

// ─── Custom Period 집계 ────────────────────────────────
/**
 * 데이터를 Subsidiary × Category × Period 단위로 집계합니다.
 * 소계행(요약)은 제외하고 원시 HS/ES/MS 행만 사용합니다.
 */
export function aggregateByPeriod(
  data: Row[],
  schema: DataSchema,
  periods: PeriodDef[],
  useMonthlyAverage = true   // true: 월 평균, false: 기간 합계
): AggRow[] {
  const { row: rowSchema, col: colSchema } = schema;
  if (!rowSchema.subsidiaryCol) return [];

  const result: AggRow[] = [];

  // 소계행 제외
  const rawRows = data.filter(r => !isSummaryRow(r, rowSchema));

  // Subsidiary 목록 (fill-down 적용 가정)
  const subsidiaries = [...new Set(
    rawRows.map(r => String(r[rowSchema.subsidiaryCol!] ?? '')).filter(Boolean)
  )];

  subsidiaries.forEach(subsidiary => {
    const subRows = rawRows.filter(
      r => String(r[rowSchema.subsidiaryCol!] ?? '') === subsidiary
    );

    periods.forEach(period => {
      const cols = getColsForPeriod(colSchema, period.year, period.fromMonth, period.toMonth);
      if (cols.length === 0) return;

      if (rowSchema.categoryCol) {
        // Category별 집계 (HS / ES / MS)
        const categories = [...new Set(
          subRows.map(r => String(r[rowSchema.categoryCol!] ?? '')).filter(Boolean)
        )];

        categories.forEach(category => {
          const catRows = subRows.filter(
            r => String(r[rowSchema.categoryCol!] ?? '') === category
          );
          const total = catRows.reduce((s, r) => s + sumCols(r, cols), 0);
          const value = useMonthlyAverage ? Math.round(total / period.monthCount) : total;

          result.push({
            subsidiary,
            category,
            periodId: period.id,
            periodLabel: period.label,
            value,
            valueType: useMonthlyAverage ? 'avg' : 'sum',
          });
        });
      } else {
        // Category 없음: 전체 합계
        const total = subRows.reduce((s, r) => s + sumCols(r, cols), 0);
        result.push({
          subsidiary,
          category: '전체',
          periodId: period.id,
          periodLabel: period.label,
          value: useMonthlyAverage ? Math.round(total / period.monthCount) : total,
          valueType: useMonthlyAverage ? 'avg' : 'sum',
        });
      }
    });
  });

  return result;
}

// ─── YoY 성장률 계산 ───────────────────────────────────
export function calculateYoY(current: number, prior: number): number {
  if (!prior || prior === 0) return 0;
  return Math.round(((current - prior) / prior) * 1000) / 10; // 소수점 1자리
}

// ─── Stacked Chart 데이터 변환 ────────────────────────
/**
 * AggRow[] → Recharts StackedBar 형태로 변환
 * X축: "LGEIN Jan–Jul", "LGEIN Aug–Oct", ...
 * 데이터 키: HS, ES, MS
 */
export interface ChartDataPoint {
  x:          string;   // "Subsidiary Period"
  subsidiary: string;
  periodLabel: string;
  [category: string]: string | number;  // HS: 120, ES: 50, MS: 30
  _total:     number;   // 총합 (라벨용)
  _prevTotal: number;   // 이전 기간 총합 (YoY 계산용, 없으면 0)
  _yoy:       number;   // YoY 성장률 %
}

export function toChartData(
  aggRows: AggRow[],
  periodPairs?: [string, string][]  // [현재 periodId, 비교 periodId] 쌍
): ChartDataPoint[] {
  const points: ChartDataPoint[] = [];
  const subsidiaries = [...new Set(aggRows.map(r => r.subsidiary))];
  const periods      = [...new Set(aggRows.map(r => r.periodId))];
  const categories   = [...new Set(aggRows.map(r => r.category))];

  subsidiaries.forEach(sub => {
    periods.forEach(periodId => {
      const rows = aggRows.filter(r => r.subsidiary === sub && r.periodId === periodId);
      if (rows.length === 0) return;

      const periodLabel = rows[0].periodLabel;
      const point: ChartDataPoint = {
        x: `${sub}\n${periodLabel}`,
        subsidiary: sub,
        periodLabel,
        _total: 0,
        _prevTotal: 0,
        _yoy: 0,
      };

      categories.forEach(cat => {
        const catRow = rows.find(r => r.category === cat);
        point[cat] = catRow?.value ?? 0;
      });

      point._total = categories.reduce((s, cat) => s + (Number(point[cat]) || 0), 0);

      // YoY: 비교 기간 찾기
      if (periodPairs) {
        const pair = periodPairs.find(([curr]) => curr === periodId);
        if (pair) {
          const prevRows = aggRows.filter(r => r.subsidiary === sub && r.periodId === pair[1]);
          const prevTotal = categories.reduce((s, cat) => {
            const pr = prevRows.find(r => r.category === cat);
            return s + (pr?.value ?? 0);
          }, 0);
          point._prevTotal = prevTotal;
          point._yoy = calculateYoY(point._total, prevTotal);
        }
      }

      points.push(point);
    });
  });

  return points;
}

// ─── KPI 요약 ─────────────────────────────────────────
export function buildKPIs(
  aggRows: AggRow[],
  currentPeriodId: string,
  priorPeriodId?: string
): KPIResult[] {
  const subsidiaries = [...new Set(aggRows.map(r => r.subsidiary))];
  const categories   = [...new Set(aggRows.map(r => r.category))];

  return subsidiaries.map(sub => {
    const curRows  = aggRows.filter(r => r.subsidiary === sub && r.periodId === currentPeriodId);
    const prevRows = priorPeriodId
      ? aggRows.filter(r => r.subsidiary === sub && r.periodId === priorPeriodId)
      : [];

    const totalA = categories.reduce((s, cat) => {
      const r = curRows.find(c => c.category === cat); return s + (r?.value ?? 0);
    }, 0);
    const totalB = categories.reduce((s, cat) => {
      const r = prevRows.find(c => c.category === cat); return s + (r?.value ?? 0);
    }, 0);

    const periodALabel = curRows[0]?.periodLabel ?? currentPeriodId;
    const periodBLabel = prevRows[0]?.periodLabel ?? priorPeriodId ?? '';

    return {
      subsidiary: sub,
      periodA: periodALabel,
      periodB: periodBLabel,
      totalA,
      totalB,
      yoyGrowth: calculateYoY(totalA, totalB),
    };
  });
}
