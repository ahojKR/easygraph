import * as XLSX from 'xlsx';
import { Row } from '@/context/ChartContext';

/**
 * 데이터 테이블을 .xlsx 파일로 내보냅니다.
 * @param data      내보낼 행 배열
 * @param columns   열 순서 (헤더명)
 * @param sheetName 시트 이름 / 파일명 prefix
 */
export function exportTableToXLSX(
  data: Row[],
  columns: string[],
  sheetName = 'EasyGraph_데이터'
) {
  // Build rows: header first, then data
  const headerRow = columns;
  const dataRows  = data.map(row =>
    columns.map(col => {
      const v = row[col];
      return typeof v === 'number' ? v : String(v ?? '');
    })
  );

  const wsData = [headerRow, ...dataRows];
  const ws     = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = columns.map(col => ({
    wch: Math.max(col.length + 2, 12),
  }));

  const wb = XLSX.utils.book_new();
  const safeName = sheetName.slice(0, 31).replace(/[\\/*?:[\]]/g, '_');
  XLSX.utils.book_append_sheet(wb, ws, safeName);

  const fileName = `${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
