import * as XLSX from 'xlsx';
import { ColumnDef, Row } from '@/context/ChartContext';

export interface ParseResult {
  data: Row[];
  headers: ColumnDef[];
  sheetNames: string[];
  warnings: string[];
}

const DATE_PATTERNS = [
  /^\d{4}[-./]\d{1,2}[-./]\d{1,2}$/,
  /^\d{1,2}[-./]\d{1,2}[-./]\d{4}$/,
  /^\d{4}[-./]\d{1,2}$/,
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\s]\d{2,4}$/i,
  /^\d{2}[-./]\d{2}$/,
  /^\d{4}년\s?\d{1,2}월/,
];

export function normalizeDate(value: string): string {
  if (!value) return value;
  return value
    .replace(/년/g, '-').replace(/월/g, '').replace(/일/g, '')
    .replace(/\./g, '-').replace(/\//g, '-')
    .trim();
}

export function cleanNumericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return isNaN(value) ? null : value;
  const str = String(value)
    .replace(/,/g, '')
    .replace(/원/g, '')
    .replace(/₩/g, '')
    .replace(/%/g, '')
    .replace(/\$/g, '')
    .replace(/\s/g, '')
    .trim();
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function detectType(values: unknown[]): ColumnDef['type'] {
  const nonEmpty = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonEmpty.length === 0) return 'ignore';

  const dateCount = nonEmpty.filter(v => DATE_PATTERNS.some(p => p.test(String(v)))).length;
  if (dateCount / nonEmpty.length > 0.6) return 'date';

  const numCount = nonEmpty.filter(v => cleanNumericValue(v) !== null).length;
  if (numCount / nonEmpty.length > 0.7) return 'number';

  const uniqueCount = new Set(nonEmpty.map(String)).size;
  if (uniqueCount / nonEmpty.length < 0.5) return 'category';

  return 'category';
}

function detectHeaders(sheet: XLSX.WorkSheet): boolean {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const firstRow: unknown[] = [];
  const secondRow: unknown[] = [];

  for (let c = range.s.c; c <= Math.min(range.e.c, range.s.c + 9); c++) {
    const cell1 = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })];
    const cell2 = sheet[XLSX.utils.encode_cell({ r: range.s.r + 1, c })];
    firstRow.push(cell1?.v ?? null);
    secondRow.push(cell2?.v ?? null);
  }

  const firstRowStrings = firstRow.filter(v => typeof v === 'string').length;
  const secondRowNumbers = secondRow.filter(v => typeof v === 'number' || cleanNumericValue(v) !== null).length;

  return firstRowStrings > firstRow.length / 2 && secondRowNumbers > secondRow.length / 3;
}

export async function parseFile(file: File, sheetName?: string): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetNames = workbook.SheetNames;
  const targetSheet = sheetName || sheetNames[0];
  const sheet = workbook.Sheets[targetSheet];
  const warnings: string[] = [];

  const hasHeaders = detectHeaders(sheet);
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: null,
  }) as unknown[][];

  if (rawRows.length < 2) {
    return { data: [], headers: [], sheetNames, warnings: ['데이터가 부족합니다.'] };
  }

  const headerRow = hasHeaders ? rawRows[0].map(h => h ? String(h).trim() : '') : rawRows[0].map((_, i) => `컬럼 ${i + 1}`);
  const dataRows = hasHeaders ? rawRows.slice(1) : rawRows;

  // Detect column types from data
  const columnValues = headerRow.map((_, colIdx) => dataRows.map(row => (row as unknown[])[colIdx]));
  const headers: ColumnDef[] = headerRow.map((name, i) => ({
    name: name || `컬럼 ${i + 1}`,
    type: detectType(columnValues[i]),
    index: i,
  }));

  // Build rows
  const data: Row[] = dataRows
    .filter(row => (row as unknown[]).some(v => v !== null && v !== undefined && v !== ''))
    .map(row => {
      const obj: Row = {};
      headers.forEach((col, i) => {
        const raw = (row as unknown[])[i];
        if (col.type === 'number') {
          obj[col.name] = cleanNumericValue(raw);
        } else if (col.type === 'date') {
          obj[col.name] = raw !== null ? normalizeDate(String(raw)) : null;
        } else {
          obj[col.name] = raw !== null ? String(raw) : null;
        }
      });
      return obj;
    });

  // Detect missing values
  const missingCounts: Record<string, number> = {};
  headers.forEach(h => {
    const missing = data.filter(r => r[h.name] === null || r[h.name] === undefined).length;
    if (missing > 0) missingCounts[h.name] = missing;
  });
  if (Object.keys(missingCounts).length > 0) {
    warnings.push(`결측값 발견: ${Object.entries(missingCounts).map(([k, v]) => `${k}(${v}개)`).join(', ')}`);
  }

  return { data, headers, sheetNames, warnings };
}
