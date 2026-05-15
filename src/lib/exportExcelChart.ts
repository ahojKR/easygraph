/**
 * exportExcelChart.ts
 * xlsx(SheetJS) + JSZip을 사용하여 데이터와 연동된 차트가 포함된
 * Excel 파일(.xlsx)을 생성합니다.
 *
 * 구조:
 *   Sheet1  - 원본 데이터 (편집 시 차트 자동 갱신)
 *   Chart1  - Sheet1 데이터를 참조하는 누적/막대/라인 차트
 */

import * as XLSX from 'xlsx';
import JSZip   from 'jszip';
import { Row } from '@/context/ChartContext';

// 차트 팔레트 (OOXML ARGB)
const PALETTE = [
  'FF00D4FF', 'FF7C3AED', 'FF10B981', 'FFF59E0B',
  'FFEC4899', 'FFEF4444', 'FF8B5CF6', 'FF06B6D4',
  'FF84CC16', 'FFF97316', 'FF14B8A6', 'FF6366F1',
];

export interface ExcelChartOptions {
  title?:       string;
  chartType?:   'bar' | 'stacked-bar' | 'line';
  colorScheme?: string;  // 'bw' | 'default' | 'ocean' etc.
}

// ── BW 팔레트 (12단계 다크→라이트, 대시보드 색상과 동일)
const BW_PALETTE = [
  'FF0F1628', // 1. 매우 진한 네이비 (가장 어두움)
  'FF1A2035', // 2. 다크 네이비
  'FF2D3748', // 3. 다크 그레이
  'FF4A5568', // 4. 미디엄 다크
  'FF606878', // 5. 슬레이트
  'FF718096', // 6. 미디엄 그레이
  'FF8892B0', // 7. 블루 그레이
  'FFA0AEC0', // 8. 라이트 미디엄
  'FFBCC4D0', // 9. 라이트
  'FFCBD5E0', // 10. 매우 라이트
  'FFE2E8F0', // 11. 거의 흰색
  'FFF0F4FF', // 12. 블루 화이트
];

// ─── 컬럼 문자 변환 (0→A, 1→B, …)
function colLetter(n: number): string {
  let s = '';
  n++;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// ─── Chart XML 생성 ──────────────────────────────────────────
function makeChartXml(
  xAxis: string,
  yAxes: string[],
  rowCount: number,            // 데이터 행 수 (헤더 제외)
  chartType: 'bar' | 'stacked-bar' | 'line',
  palette: string[],
): string {
  const isStacked = chartType === 'stacked-bar';
  const isLine    = chartType === 'line';
  const grouping  = isStacked ? 'stacked' : 'clustered';

  // xAxis 는 A열, yAxes는 B, C, D … 열
  const catRef  = `Sheet1!$A$2:$A$${rowCount + 1}`;

  const seriesXml = yAxes.map((y, i) => {
    const colIdx = i + 1;  // B, C, D …
    const col    = colLetter(colIdx);
    const color  = palette[i % palette.length];
    return `
    <c:ser>
      <c:idx val="${i}"/>
      <c:order val="${i}"/>
      <c:tx>
        <c:strRef>
          <c:f>Sheet1!$${col}$1</c:f>
          <c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${y}</c:v></c:pt></c:strCache>
        </c:strRef>
      </c:tx>
      <c:spPr>
        <a:solidFill><a:srgbClr val="${color.slice(2)}"/></a:solidFill>
        <a:ln><a:noFill/></a:ln>
      </c:spPr>
      <c:cat>
        <c:strRef><c:f>${catRef}</c:f></c:strRef>
      </c:cat>
      <c:val>
        <c:numRef>
          <c:f>Sheet1!$${col}$2:$${col}$${rowCount + 1}</c:f>
        </c:numRef>
      </c:val>
    </c:ser>`;
  }).join('');

  const barChartXml = `
  <c:barChart>
    <c:barDir val="col"/>
    <c:grouping val="${grouping}"/>
    <c:varyColors val="0"/>
    <c:overlap val="${isStacked ? '100' : '0'}"/>
    ${seriesXml}
    <c:dLbls>
      <c:numFmt formatCode="0.0" sourceLinked="0"/>
      <c:spPr><a:noFill/></c:spPr>
      <c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="800" b="1" i="0"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:defRPr></a:pPr></a:p></c:txPr>
      <c:showLegendKey val="0"/>
      <c:showVal val="${isStacked ? '1' : '0'}"/>
      <c:showCatName val="0"/>
      <c:showSerName val="0"/>
      <c:showPercent val="0"/>
    </c:dLbls>
    <c:axId val="1001"/>
    <c:axId val="1002"/>
  </c:barChart>`;

  const lineChartXml = `
  <c:lineChart>
    <c:grouping val="standard"/>
    <c:varyColors val="0"/>
    ${seriesXml.replace(/<a:ln><a:noFill\/><\/a:ln>/g, `<a:ln w="25400"><a:solidFill><a:srgbClr val="AAAAAA"/></a:solidFill></a:ln>`)}
    <c:marker><c:symbol val="none"/></c:marker>
    <c:smooth val="0"/>
    <c:axId val="1001"/>
    <c:axId val="1002"/>
  </c:lineChart>`;

  const chartBodyXml = isLine ? lineChartXml : barChartXml;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
              xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
              xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:lang val="ko-KR"/>
  <c:style val="2"/>
  <c:chart>
    <c:autoTitleDeleted val="0"/>
    <c:plotArea>
      <c:layout/>
      ${chartBodyXml}
      <c:catAx>
        <c:axId val="1001"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="b"/>
        <c:numFmt formatCode="General" sourceLinked="0"/>
        <c:tickLblPos val="nextTo"/>
        <c:spPr><a:ln><a:solidFill><a:srgbClr val="888888"/></a:solidFill></a:ln></c:spPr>
        <c:txPr><a:bodyPr rot="-2700000"/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"/></a:pPr></a:p></c:txPr>
        <c:crossAx val="1002"/>
        <c:auto val="1"/>
      </c:catAx>
      <c:valAx>
        <c:axId val="1002"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="l"/>
        <c:numFmt formatCode="#,##0" sourceLinked="0"/>
        <c:tickLblPos val="nextTo"/>
        <c:spPr><a:ln><a:solidFill><a:srgbClr val="888888"/></a:solidFill></a:ln></c:spPr>
        <c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"/></a:pPr></a:p></c:txPr>
        <c:crossAx val="1001"/>
      </c:valAx>
    </c:plotArea>
    <c:legend>
      <c:legendPos val="b"/>
      <c:spPr><a:noFill/></c:spPr>
      <c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"/></a:pPr></a:p></c:txPr>
    </c:legend>
    <c:plotVisOnly val="1"/>
    <c:dispBlanksAs val="gap"/>
  </c:chart>
  <c:spPr>
    <a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
    <a:ln w="9525"><a:solidFill><a:srgbClr val="DDDDDD"/></a:solidFill></a:ln>
  </c:spPr>
</c:chartSpace>`;
}

// ─── Drawing XML (차트 위치 지정) ────────────────────────────
function makeDrawingXml(dataRows: number): string {
  const startRow = dataRows + 3;
  const endRow   = startRow + 22;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
          xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <xdr:twoCellAnchor moveWithCells="0" sizeWithCells="0">
    <xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${startRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>12</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${endRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro="">
      <xdr:nvGraphicFramePr>
        <xdr:cNvPr id="2" name="EasyGraph Chart"/>
        <xdr:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></xdr:cNvGraphicFramePr>
      </xdr:nvGraphicFramePr>
      <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
      <a:graphic>
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
          <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
                   xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                   r:id="rId1"/>
        </a:graphicData>
      </a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>`;
}

// ─── 메인 함수 ───────────────────────────────────────────────
export async function exportExcelWithChart(
  data:    Row[],
  xAxis:   string,
  yAxes:   string[],
  options: ExcelChartOptions = {},
): Promise<void> {
  const {
    title       = 'EasyGraph',
    chartType   = 'stacked-bar',
    colorScheme = 'default',
  } = options;

  const palette = colorScheme === 'bw' ? BW_PALETTE : PALETTE;
  // bw가 아니어도 국가×연도 데이터엔 기본 팔레트 적용
  // 12개 이상 시리즈일 때 팔레트 반복 방지
  const effectivePalette = yAxes.length > PALETTE.length
    ? [...BW_PALETTE, ...BW_PALETTE]  // fallback
    : palette;

  // ── 1. 데이터 시트 생성 ────────────────────────────────────
  const headers = [xAxis, ...yAxes];
  const sheetData = [
    headers,
    ...data.map(row => headers.map(h => row[h] ?? '')),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // 헤더 너비 설정
  ws['!cols'] = headers.map((_, i) => ({ wch: i === 0 ? 16 : 12 }));

  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  // xlsx 버퍼 생성
  const xlsxBuffer: ArrayBuffer = XLSX.write(wb, {
    bookType: 'xlsx',
    type: 'array',
  });

  // ── 2. JSZip으로 ZIP 파일 열기 ────────────────────────────
  const zip = await JSZip.loadAsync(xlsxBuffer);

  const rowCount = data.length;

  // ── 3. 차트 XML 파일 추가 ─────────────────────────────────
  zip.file(
    'xl/charts/chart1.xml',
    makeChartXml(xAxis, yAxes, rowCount, chartType, effectivePalette),
  );

  // chart1.xml.rels (차트 자체의 관계 - 빈 관계 파일)
  zip.file(
    'xl/charts/_rels/chart1.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`,
  );

  // ── 4. Drawing XML 추가 ───────────────────────────────────
  zip.file('xl/drawings/drawing1.xml', makeDrawingXml(rowCount));

  zip.file(
    'xl/drawings/_rels/drawing1.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart"
    Target="../charts/chart1.xml"/>
</Relationships>`,
  );

  // ── 5. Sheet1.xml 수정: <drawing> 태그 추가 ──────────────
  const sheetXmlStr = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
  const updatedSheetXml = sheetXmlStr.replace(
    '</worksheet>',
    `  <drawing r:id="rId_drawing1"/>
</worksheet>`,
  );
  zip.file('xl/worksheets/sheet1.xml', updatedSheetXml);

  // ── 6. Sheet1 관계 파일 수정 (drawing 관계 추가) ──────────
  const sheetRelsPath = 'xl/worksheets/_rels/sheet1.xml.rels';
  let sheetRelsXml = '';
  const existingSheetRels = zip.file(sheetRelsPath);
  if (existingSheetRels) {
    sheetRelsXml = await existingSheetRels.async('string');
    sheetRelsXml = sheetRelsXml.replace(
      '</Relationships>',
      `  <Relationship Id="rId_drawing1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing"
    Target="../drawings/drawing1.xml"/>
</Relationships>`,
    );
  } else {
    sheetRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId_drawing1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing"
    Target="../drawings/drawing1.xml"/>
</Relationships>`;
  }
  zip.file(sheetRelsPath, sheetRelsXml);

  // ── 7. [Content_Types].xml 수정 ───────────────────────────
  const ctXmlStr = await zip.file('[Content_Types].xml')!.async('string');
  let updatedCt = ctXmlStr;
  if (!updatedCt.includes('chart1.xml')) {
    updatedCt = updatedCt.replace(
      '</Types>',
      `  <Override PartName="/xl/charts/chart1.xml"
    ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>
  <Override PartName="/xl/drawings/drawing1.xml"
    ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>
</Types>`,
    );
  }
  zip.file('[Content_Types].xml', updatedCt);

  // ── 8. 최종 xlsx 생성 및 다운로드 ─────────────────────────
  const finalBuffer = await zip.generateAsync({ type: 'arraybuffer' });
  const blob        = new Blob([finalBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href  = url;
  const safeTitle = title.replace(/[/\\?%*:|"<>]/g, '-');
  link.download  = `${safeTitle}_chart.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
