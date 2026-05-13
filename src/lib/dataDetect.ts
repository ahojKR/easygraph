import { ColumnDef, Row } from '@/context/ChartContext';

export interface AxisIntent {
  id: string;
  icon: string;
  title: string;
  desc: string;
  preview: string;
  xAxis: string;
  xLabel: string;
  yAxes: string[];
  yLabel: string;
  chartType: 'line' | 'bar' | 'stacked-bar' | 'area';
  requiresPivot: boolean;
  pivotConfig?: { keyColumns: string[]; valueColumns: string[]; xLabel: string };
}

export interface DataProfile {
  format: 'wide' | 'long' | 'ambiguous';
  categoryColumns: ColumnDef[];
  numericColumns: ColumnDef[];
  rowCount: number;
  colCount: number;
  isMonthly: boolean;
  description: string;
  intents: AxisIntent[];
}

/** 월별 데이터 컬럼인지 추측 (1월~12월 키워드 포함) */
function looksMonthly(cols: ColumnDef[], data: Row[]): boolean {
  const monthKw = /[Jj]an|[Ff]eb|[Mm]ar|[Aa]pr|[Mm]ay|[Jj]un|[Jj]ul|[Aa]ug|[Ss]ep|[Oo]ct|[Nn]ov|[Dd]ec|월|\d{1,2}월/;
  // Check column names
  if (cols.some(c => monthKw.test(c.name))) return true;
  // Check X-like category values
  const catCols = cols.filter(c => c.type !== 'number');
  if (catCols.length > 0) {
    const vals = data.slice(0, 5).map(r => String(r[catCols[0].name] ?? ''));
    if (vals.some(v => monthKw.test(v))) return true;
  }
  return false;
}

/** 피벗: wide → long 변환 */
export function pivotWideToLong(
  data: Row[],
  keyColumns: string[],
  valueColumns: string[],
  xLabel: string
): Row[] {
  return valueColumns.map(vc => {
    const row: Row = { [xLabel]: vc };
    data.forEach(dataRow => {
      const name = keyColumns.map(k => dataRow[k]).filter(Boolean).join(' · ');
      if (name) row[name] = Number(dataRow[vc]) || 0;
    });
    return row;
  });
}

export function profileData(
  data: Row[],
  headers: ColumnDef[]
): DataProfile {
  const catCols = headers.filter(h => h.type === 'date' || h.type === 'category');
  const numCols = headers.filter(h => h.type === 'number');
  const rowCount = data.length;
  const colCount = headers.length;

  // Wide: many numeric cols (>=4), few category cols
  const isWide = numCols.length >= 4 && catCols.length <= 4;
  const isLong = numCols.length < 4 && catCols.length >= 1;
  const isMonthly = looksMonthly(headers, data);

  const intents: AxisIntent[] = [];

  if (isWide) {
    // Intent 1: 기간별 추이 (pivot wide → long)
    const keyColumns = catCols.slice(0, 2).map(c => c.name);
    const pivotedSeriesNames: string[] = [];
    data.slice(0, 5).forEach(row => {
      const name = keyColumns.map(k => row[k]).filter(Boolean).join(' · ');
      if (name && !pivotedSeriesNames.includes(name)) pivotedSeriesNames.push(name);
    });

    intents.push({
      id: 'time-trend',
      icon: '📈',
      title: '기간별 추이',
      desc: '시간(열)을 가로축으로, 각 항목의 변화 추이를 선으로 봅니다',
      preview: `가로: ${numCols.slice(0, 3).map(c => c.name).join(', ')}… | 세로: ${pivotedSeriesNames.slice(0, 2).join(', ')} 등`,
      xAxis: '기간',
      xLabel: '기간',
      yAxes: pivotedSeriesNames,
      yLabel: catCols[0]?.name ?? '항목',
      chartType: 'line',
      requiresPivot: true,
      pivotConfig: { keyColumns, valueColumns: numCols.map(c => c.name), xLabel: '기간' },
    });

    // Intent 2: 항목별 비교
    intents.push({
      id: 'item-compare',
      icon: '📊',
      title: '항목별 비교',
      desc: '각 행(항목)을 가로축으로, 특정 기간의 수치를 막대로 비교합니다',
      preview: `가로: ${catCols[0]?.name ?? '항목'} | 세로: ${numCols[0]?.name ?? '수치'}`,
      xAxis: catCols[0]?.name ?? numCols[0]?.name ?? '',
      xLabel: catCols[0]?.name ?? '항목',
      yAxes: [numCols[0]?.name ?? ''],
      yLabel: '수치',
      chartType: 'bar',
      requiresPivot: false,
    });
  } else if (isLong) {
    // Intent 1: 시계열 추이
    intents.push({
      id: 'time-series',
      icon: '📈',
      title: isMonthly ? '월별 추이' : '시계열 추이',
      desc: `${catCols[0]?.name ?? 'X축'}을 가로로, ${numCols.map(c => c.name).join('·')} 수치 변화를 봅니다`,
      preview: `가로: ${catCols[0]?.name} | 세로: ${numCols.map(c => c.name).join(', ')}`,
      xAxis: catCols[0]?.name ?? '',
      xLabel: catCols[0]?.name ?? '시간',
      yAxes: numCols.map(c => c.name),
      yLabel: '수치',
      chartType: numCols.length > 1 ? 'line' : 'bar',
      requiresPivot: false,
    });

    // Intent 2: 항목별 비교 (if multiple category columns)
    if (catCols.length > 1) {
      intents.push({
        id: 'item-compare',
        icon: '📊',
        title: '항목별 비교',
        desc: `${catCols[1]?.name}별로 ${numCols[0]?.name} 수치를 막대로 비교합니다`,
        preview: `가로: ${catCols[1]?.name} | 세로: ${numCols[0]?.name}`,
        xAxis: catCols[1]?.name ?? '',
        xLabel: catCols[1]?.name ?? '항목',
        yAxes: [numCols[0]?.name ?? ''],
        yLabel: numCols[0]?.name ?? '수치',
        chartType: 'bar',
        requiresPivot: false,
      });
    }
  } else {
    // Ambiguous: basic suggestion
    intents.push({
      id: 'basic',
      icon: '📊',
      title: '기본 시각화',
      desc: '자동 감지된 X/Y축으로 차트를 생성합니다',
      preview: `가로: ${catCols[0]?.name ?? numCols[0]?.name} | 세로: ${numCols.map(c => c.name).join(', ')}`,
      xAxis: catCols[0]?.name ?? numCols[0]?.name ?? '',
      xLabel: catCols[0]?.name ?? '항목',
      yAxes: numCols.map(c => c.name),
      yLabel: '수치',
      chartType: 'line',
      requiresPivot: false,
    });
  }

  // Always add "직접 설정"
  intents.push({
    id: 'manual',
    icon: '⚙️',
    title: '직접 설정',
    desc: 'X축과 Y축 컬럼을 직접 선택합니다',
    preview: `${colCount}개 컬럼에서 직접 선택`,
    xAxis: catCols[0]?.name ?? '',
    xLabel: '직접 선택',
    yAxes: numCols.map(c => c.name),
    yLabel: '직접 선택',
    chartType: 'bar',
    requiresPivot: false,
  });

  const format = isWide ? 'wide' : isLong ? 'long' : 'ambiguous';
  const description =
    `${rowCount}행 × ${colCount}열 · 범주형 ${catCols.length}개 · 숫자형 ${numCols.length}개` +
    (isWide ? ' · 📋 가로형(Wide) 데이터로 감지됨' : '') +
    (isMonthly ? ' · 📅 월별 데이터로 추정됨' : '');

  return { format, categoryColumns: catCols, numericColumns: numCols, rowCount, colCount, isMonthly, description, intents };
}
