import { Row, ColumnDef } from '@/context/ChartContext';

// ─── 타입 정의 ─────────────────────────────────────────
export interface RowSchema {
  subsidiaryCol: string | null;   // 상위 계층 컬럼 (e.g., 'Subsidiary')
  categoryCol:   string | null;   // 하위 계층 컬럼 (e.g., 'HS/ES/MS')
  summaryPattern: RegExp;         // 소계행 패턴 (e.g., /요약|Total|합계/i)
  subsidiaries:  string[];        // 감지된 Subsidiary 목록
  categories:    string[];        // 감지된 Category 목록 (HS/ES/MS 등)
}

export interface ColSchema {
  years: number[];          // 감지된 연도 목록 (e.g., [2024, 2025])
  yearColMap: Record<number, string[]>; // 연도 → 월 컬럼 목록
  summaryColumns: string[]; // 비계산 컬럼 (연간누계, 월평균 등)
  monthCols: string[];      // 실제 월 데이터 컬럼 (24년 1월 형태)
}

export interface DataSchema {
  row: RowSchema;
  col: ColSchema;
  isHierarchical: boolean;
  hasYoY: boolean;          // 2년 이상 데이터 있는 경우
}

// ─── 소계행 패턴 ────────────────────────────────────────
const SUMMARY_PATTERN = /요약|total|합계|소계|subtotal|sum/i;

// ─── 행 구조 감지 ───────────────────────────────────────
export function detectRowSchema(data: Row[], headers: ColumnDef[]): RowSchema {
  const catCols = headers.filter(h => h.type !== 'number');

  // 소계행 제외한 실제 데이터 값 수집
  const subsidiaries: string[] = [];
  const categories:   string[] = [];

  // HS/ES/MS 같은 Category 패턴 감지
  const CAT_PATTERN = /^(HS|ES|MS|HE|PE|CE|BS|B2B|B2C|HA|VD|MC)$/i;

  let subsidiaryCol: string | null = null;
  let categoryCol:   string | null = null;

  catCols.forEach(col => {
    const values = data
      .map(r => String(r[col.name] ?? '').trim())
      .filter(v => v && v !== '-' && v !== '');

    const catMatches = values.filter(v => CAT_PATTERN.test(v));
    const subMatches = values.filter(v => !CAT_PATTERN.test(v) && !SUMMARY_PATTERN.test(v));

    if (catMatches.length > 0 && catMatches.length >= values.length * 0.3) {
      categoryCol = col.name;
      catMatches.forEach(v => { if (!categories.includes(v)) categories.push(v); });
    } else if (subMatches.length > 0) {
      // 반복 패턴이 없으면 Subsidiary (각 값이 고유한 경우)
      const uniqueRatio = new Set(subMatches).size / subMatches.length;
      if (uniqueRatio > 0.3) {
        subsidiaryCol = col.name;
        subMatches.forEach(v => { if (!subsidiaries.includes(v)) subsidiaries.push(v); });
      }
    }
  });

  return {
    subsidiaryCol,
    categoryCol,
    summaryPattern: SUMMARY_PATTERN,
    subsidiaries,
    categories,
  };
}

// ─── 열 구조 감지 ───────────────────────────────────────
const MONTH_COL_PATTERN = /^(\d{2})년\s*(\d{1,2})월$/;      // "24년 1월"
const SUMMARY_COL_PATTERN = /누계|평균|total|합계|ytd/i;

export function detectColSchema(headers: ColumnDef[]): ColSchema {
  const monthCols: string[] = [];
  const summaryColumns: string[] = [];
  const yearColMap: Record<number, string[]> = {};
  const years: number[] = [];

  headers.forEach(h => {
    const m = MONTH_COL_PATTERN.exec(h.name);
    if (m) {
      const year = 2000 + parseInt(m[1], 10);
      const month = parseInt(m[2], 10);
      if (!years.includes(year)) { years.push(year); yearColMap[year] = []; }
      yearColMap[year].push(h.name);
      monthCols.push(h.name);
      return;
    }
    if (SUMMARY_COL_PATTERN.test(h.name)) {
      summaryColumns.push(h.name);
    }
  });

  // 연도별 정렬
  years.sort();
  Object.keys(yearColMap).forEach(y => {
    yearColMap[Number(y)].sort((a, b) => {
      const ma = MONTH_COL_PATTERN.exec(a);
      const mb = MONTH_COL_PATTERN.exec(b);
      return (ma ? parseInt(ma[2]) : 0) - (mb ? parseInt(mb[2]) : 0);
    });
  });

  return { years, yearColMap, summaryColumns, monthCols };
}

// ─── 종합 스키마 ────────────────────────────────────────
export function detectDataSchema(data: Row[], headers: ColumnDef[]): DataSchema {
  const row = detectRowSchema(data, headers);
  const col = detectColSchema(headers);

  return {
    row,
    col,
    isHierarchical: !!(row.subsidiaryCol && row.categoryCol),
    hasYoY: col.years.length >= 2,
  };
}

// ─── 데이터 유틸 ────────────────────────────────────────

/** 소계행 여부 */
export function isSummaryRow(row: Row, schema: RowSchema): boolean {
  const colsToCheck = [schema.subsidiaryCol, schema.categoryCol].filter(Boolean);
  return colsToCheck.some(col =>
    col && SUMMARY_PATTERN.test(String(row[col] ?? ''))
  );
}

/** 월 번호 → 컬럼명 변환 (e.g., year=2024, month=1 → "24년 1월") */
export function monthColName(year: number, month: number): string {
  const shortYear = String(year).slice(2);
  return `${shortYear}년 ${month}월`;
}

/** 특정 연도의 특정 월 범위에 해당하는 컬럼명 반환 */
export function getColsForPeriod(
  colSchema: ColSchema,
  year: number,
  fromMonth: number,
  toMonth: number
): string[] {
  const yearCols = colSchema.yearColMap[year] ?? [];
  return yearCols.filter(col => {
    const m = MONTH_COL_PATTERN.exec(col);
    if (!m) return false;
    const month = parseInt(m[2], 10);
    return month >= fromMonth && month <= toMonth;
  });
}
