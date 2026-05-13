import { Row, ColumnDef } from '@/context/ChartContext';

export type IssueType =
  | 'fill-down-year'    // 연도가 첫 셀에만 있고 나머지 빈값
  | 'remove-subheader'  // 첫 데이터 행이 월 서브헤더(1,2,3...)
  | 'rename-month-cols' // 컬럼4~12 → 24년 1월~12월
  | 'fill-down-category'; // 카테고리가 첫 행에만 있고 나머지 빈값

export interface RepairIssue {
  id: string;
  type: IssueType;
  severity: 'error' | 'warning';
  title: string;
  description: string;
  affectedColumns?: string[];
  preview?: string;   // 수정 후 예시
}

export interface RepairResult {
  data: Row[];
  headers: ColumnDef[];
}

// ─── 감지 ─────────────────────────────────────────────
export function detectIssues(data: Row[], headers: ColumnDef[]): RepairIssue[] {
  const issues: RepairIssue[] = [];
  if (!data.length || !headers.length) return issues;

  const numCols  = headers.filter(h => h.type === 'number');
  const catCols  = headers.filter(h => h.type !== 'number');

  // ── 1. 연도 컬럼 감지: 숫자 컬럼인데 첫 행만 값이 있고 나머지 빈값
  //       첫 행 값이 연도(2000~2100)처럼 보이는 경우
  const yearCols = numCols.filter(col => {
    const first = Number(data[0]?.[col.name]);
    if (!(first >= 2000 && first <= 2100)) return false;
    const nullCount = data.slice(1).filter(r => r[col.name] === null || r[col.name] === undefined || r[col.name] === '').length;
    return nullCount >= data.length / 2;
  });

  if (yearCols.length > 0) {
    issues.push({
      id: 'fill-down-year',
      type: 'fill-down-year',
      severity: 'warning',
      title: '연도 데이터가 일부 행에만 있습니다',
      description: `"${yearCols.map(c => c.name).join(', ')}" 컬럼이 첫 행에만 연도값이 있고 나머지는 비어있습니다. Excel 병합 셀로 인한 현상입니다. 연도를 아래 행으로 자동 채울 수 있습니다.`,
      affectedColumns: yearCols.map(c => c.name),
      preview: `모든 행에 "${Number(data[0]?.[yearCols[0].name])}"로 채워짐`,
    });
  }

  // ── 2. 서브헤더 행 감지: 첫 데이터 행의 숫자 컬럼 값이 1~12 연속
  const firstRowNums = numCols.map(col => Number(data[0]?.[col.name])).filter(v => !isNaN(v));
  const isSequentialMonths = firstRowNums.length >= 6 &&
    firstRowNums.slice(0, 12).every((v, i) => v === i + 1 || v === firstRowNums[0] + i);

  if (isSequentialMonths) {
    issues.push({
      id: 'remove-subheader',
      type: 'remove-subheader',
      severity: 'warning',
      title: '첫 번째 행이 월 서브헤더로 보입니다',
      description: `첫 번째 데이터 행의 값이 (${firstRowNums.slice(0, 5).join(', ')}...)으로, 실제 데이터가 아닌 월 번호(1월=1, 2월=2...)처럼 보입니다. 이 행을 제거하고 컬럼 이름에 반영할 수 있습니다.`,
      preview: `1행 제거 후 데이터는 2행부터 시작`,
    });
  }

  // ── 3. 컬럼명+월 번호로 실제 컬럼명 재구성 제안
  //    연도 컬럼 + 서브헤더 월 번호가 있으면 "24년 1월" 형태 제안
  if (yearCols.length > 0 && isSequentialMonths) {
    const year = Number(data[0]?.[yearCols[0].name]);
    const shortYear = String(year).slice(2); // "24"
    const monthCols = numCols.filter(c => !yearCols.includes(c));
    const newNames = firstRowNums.slice(0, monthCols.length).map((m, i) =>
      `${shortYear}년 ${m}월`
    );

    issues.push({
      id: 'rename-month-cols',
      type: 'rename-month-cols',
      severity: 'warning',
      title: '컬럼명을 연도+월로 재구성할 수 있습니다',
      description: `연도(${year})와 월 서브헤더를 합쳐 컬럼명을 의미있게 바꿀 수 있습니다.`,
      affectedColumns: monthCols.slice(0, 5).map(c => c.name),
      preview: `${monthCols[0]?.name} → ${newNames[0]}, ${monthCols[1]?.name} → ${newNames[1]}...`,
    });
  }

  // ── 4. 카테고리 컬럼 fill-down (컬럼1처럼 가끔만 값이 있는 경우)
  const sparseCatCols = catCols.filter(col => {
    const nullCount = data.filter(r => !r[col.name] || r[col.name] === '-').length;
    return nullCount > 0 && nullCount < data.length && nullCount >= data.length * 0.3;
  });

  if (sparseCatCols.length > 0) {
    issues.push({
      id: 'fill-down-category',
      type: 'fill-down-category',
      severity: 'warning',
      title: '일부 항목명이 비어있습니다',
      description: `"${sparseCatCols.map(c => c.name).join(', ')}" 컬럼에 빈 값이 많습니다. Excel의 병합 셀로 인한 현상일 수 있습니다. 위쪽 값을 아래로 자동으로 채울 수 있습니다.`,
      affectedColumns: sparseCatCols.map(c => c.name),
      preview: `빈 셀을 위 행의 값으로 채움 (예: "-" → 앞 행 값)`,
    });
  }

  return issues;
}

// ─── 수정 적용 ─────────────────────────────────────────
export function applyRepairs(
  data: Row[],
  headers: ColumnDef[],
  accepted: string[]   // accepted issue IDs
): RepairResult {
  let rows = data.map(r => ({ ...r }));
  let cols = headers.map(h => ({ ...h }));

  const numCols = cols.filter(h => h.type === 'number');
  const catCols = cols.filter(h => h.type !== 'number');

  // ── yearCols 재계산
  const yearCols = numCols.filter(col => {
    const first = Number(rows[0]?.[col.name]);
    if (!(first >= 2000 && first <= 2100)) return false;
    const nullCount = rows.slice(1).filter(r => r[col.name] === null || r[col.name] === undefined || r[col.name] === '').length;
    return nullCount >= rows.length / 2;
  });

  const yearValue = yearCols.length > 0 ? Number(rows[0]?.[yearCols[0].name]) : null;
  const shortYear = yearValue ? String(yearValue).slice(2) : '';

  // ── 첫 행이 서브헤더인지 확인 (월 번호 순서)
  const monthCols = numCols.filter(c => !yearCols.includes(c));
  const firstRowNums = monthCols.map(col => Number(rows[0]?.[col.name]));
  const isSeqMonths = firstRowNums.length >= 6 &&
    firstRowNums.slice(0, 12).every((v, i) => v === i + 1);

  // 1) 컬럼명 재구성 (rename-month-cols) — 서브헤더 제거 전에 월 번호 파악
  const monthMapping: Record<string, string> = {};
  if (accepted.includes('rename-month-cols') && isSeqMonths && yearValue) {
    monthCols.forEach((col, i) => {
      const m = firstRowNums[i];
      if (m >= 1 && m <= 12) {
        monthMapping[col.name] = `${shortYear}년 ${m}월`;
      }
    });
    // rename in cols
    cols = cols.map(c => ({
      ...c,
      name: monthMapping[c.name] ?? c.name,
    }));
    // rename in rows
    rows = rows.map(r => {
      const nr: Row = {};
      Object.keys(r).forEach(k => { nr[monthMapping[k] ?? k] = r[k]; });
      return nr;
    });
    // remove yearCols from cols (they're now merged into column names)
    if (accepted.includes('rename-month-cols')) {
      yearCols.forEach(yc => {
        const newName = monthMapping[yc.name] ?? yc.name;
        cols = cols.filter(c => c.name !== yc.name && c.name !== newName);
        rows = rows.map(r => { const nr = { ...r }; delete nr[yc.name]; delete nr[newName]; return nr; });
      });
    }
  }

  // 2) 서브헤더 제거 (remove-subheader)
  if (accepted.includes('remove-subheader')) {
    rows = rows.slice(1);
  }

  // 3) 연도 fill-down (fill-down-year)
  if (accepted.includes('fill-down-year') && !accepted.includes('rename-month-cols')) {
    yearCols.forEach(yc => {
      let last: string | number | null = rows[0]?.[yc.name] as string | number | null;
      rows = rows.map(r => {
        const v = r[yc.name];
        if (v !== null && v !== undefined && v !== '') {
          last = v as string | number | null;
        }
        return { ...r, [yc.name]: last };
      });
    });
  }

  // 4) 카테고리 fill-down (fill-down-category)
  if (accepted.includes('fill-down-category')) {
    const sparseCatCols = cols.filter(col => col.type !== 'number');
    sparseCatCols.forEach(col => {
      let last: string | number | null = null;
      rows = rows.map(r => {
        const v = r[col.name];
        if (v && v !== '-' && v !== '') last = v as string | number | null;
        return { ...r, [col.name]: last ?? v };
      });
    });
  }

  return { data: rows, headers: cols };
}
