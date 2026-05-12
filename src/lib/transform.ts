import { Row, TransformType } from '@/context/ChartContext';

/**
 * 열(컬럼) 기준 비중: 각 Y축 컬럼의 합계 대비 각 행의 비율 (%)
 * 예: 연도별 국가 매출 → 해당 연도 전체 합계 대비 국가 비중
 */
export function transformColPct(data: Row[], yAxes: string[]): Row[] {
  const colTotals: Record<string, number> = {};
  yAxes.forEach(y => {
    colTotals[y] = data.reduce((sum, row) => sum + (Number(row[y]) || 0), 0);
  });
  return data.map(row => {
    const newRow: Row = { ...row };
    yAxes.forEach(y => {
      const total = colTotals[y];
      newRow[y] = total > 0 ? Math.round(((Number(row[y]) || 0) / total) * 1000) / 10 : 0;
    });
    return newRow;
  });
}

/**
 * 행(항목) 기준 비중: 각 행의 Y축 합계 대비 각 컬럼의 비율 (%)
 * 예: 국가별 연도 매출 → 해당 국가의 전체 연도 합계 대비 연도별 비중
 */
export function transformRowPct(data: Row[], yAxes: string[]): Row[] {
  return data.map(row => {
    const rowTotal = yAxes.reduce((sum, y) => sum + (Number(row[y]) || 0), 0);
    const newRow: Row = { ...row };
    yAxes.forEach(y => {
      newRow[y] = rowTotal > 0 ? Math.round(((Number(row[y]) || 0) / rowTotal) * 1000) / 10 : 0;
    });
    return newRow;
  });
}

/**
 * 전체 합계 기준 비중: 전체 데이터 합계 대비 각 값의 비율 (%)
 */
export function transformTotalPct(data: Row[], yAxes: string[]): Row[] {
  const grandTotal = data.reduce((sum, row) =>
    sum + yAxes.reduce((s, y) => s + (Number(row[y]) || 0), 0), 0);
  return data.map(row => {
    const newRow: Row = { ...row };
    yAxes.forEach(y => {
      newRow[y] = grandTotal > 0 ? Math.round(((Number(row[y]) || 0) / grandTotal) * 1000) / 10 : 0;
    });
    return newRow;
  });
}

/**
 * 순위 변환: 각 Y축 컬럼에서 값을 순위로 변환 (1위가 최고값)
 */
export function transformRank(data: Row[], yAxes: string[]): Row[] {
  const result = data.map(row => ({ ...row }));
  yAxes.forEach(y => {
    const sorted = [...data]
      .map((row, i) => ({ i, v: Number(row[y]) || 0 }))
      .sort((a, b) => b.v - a.v);
    sorted.forEach((item, rank) => {
      result[item.i][y] = rank + 1;
    });
  });
  return result;
}

/**
 * 변환 타입에 따라 데이터를 변환하는 메인 함수
 */
export function applyTransform(
  data: Row[],
  yAxes: string[],
  transformType: TransformType
): Row[] {
  switch (transformType) {
    case 'col-pct':   return transformColPct(data, yAxes);
    case 'row-pct':   return transformRowPct(data, yAxes);
    case 'total-pct': return transformTotalPct(data, yAxes);
    case 'rank':      return transformRank(data, yAxes);
    default:          return data;
  }
}

/**
 * 데이터 구조를 분석하여 자연어 설명 생성
 */
export function describeData(
  data: Row[],
  xAxis: string,
  yAxes: string[]
): { summary: string; suggestion: string } {
  if (!data.length || !xAxis || !yAxes.length) {
    return { summary: '', suggestion: '' };
  }

  const rowCount = data.length;
  const sampleX = data.slice(0, 3).map(r => String(r[xAxis])).join(', ');
  const yLabel = yAxes.join(', ');
  const totalByCol: Record<string, number> = {};
  yAxes.forEach(y => {
    totalByCol[y] = data.reduce((s, r) => s + (Number(r[y]) || 0), 0);
  });
  const colTotalsStr = yAxes
    .slice(0, 3)
    .map(y => `${y}: ${totalByCol[y].toLocaleString()}`)
    .join(' / ');

  const summary =
    `현재 데이터는 **${xAxis}** 기준 ${rowCount}개 항목(${sampleX}...)에 대해 ` +
    `**${yLabel}** 수치를 보여줍니다. (${colTotalsStr}${yAxes.length > 3 ? ' ...' : ''})`;

  const suggestion =
    yAxes.length > 1
      ? `여러 ${yLabel} 컬럼이 있어 각 항목의 전체 대비 비중을 비교하기 좋습니다.`
      : `${xAxis}별 ${yLabel} 절대값 대신, 전체 대비 비중(%)으로 비교하면 더 명확할 수 있습니다.`;

  return { summary, suggestion };
}
