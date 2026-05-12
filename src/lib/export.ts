import { RefObject } from 'react';

declare module 'jspdf' {
  interface jsPDF {
    addImage(imageData: string, format: string, x: number, y: number, w: number, h: number): jsPDF;
  }
}

export async function exportToPNG(elementRef: RefObject<HTMLElement | null>, filename = 'easygraph-chart'): Promise<void> {
  const html2canvas = (await import('html2canvas')).default;
  if (!elementRef.current) return;

  const canvas = await html2canvas(elementRef.current, {
    backgroundColor: '#0a0e1a',
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function exportToPDF(elementRef: RefObject<HTMLElement | null>, title = 'EasyGraph 차트'): Promise<void> {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');
  if (!elementRef.current) return;

  const canvas = await html2canvas(elementRef.current, {
    backgroundColor: '#0a0e1a',
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Header
  pdf.setFillColor(10, 14, 26);
  pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
  pdf.setTextColor(240, 244, 255);
  pdf.setFontSize(16);
  pdf.text(title, 14, 16);
  pdf.setFontSize(9);
  pdf.setTextColor(136, 146, 176);
  pdf.text(`생성: EasyGraph | ${new Date().toLocaleDateString('ko-KR')}`, 14, 22);

  // Chart image
  const imgRatio = canvas.width / canvas.height;
  const maxW = pdfWidth - 28;
  const maxH = pdfHeight - 40;
  let imgW = maxW;
  let imgH = imgW / imgRatio;
  if (imgH > maxH) { imgH = maxH; imgW = imgH * imgRatio; }

  pdf.addImage(imgData, 'PNG', 14, 28, imgW, imgH);
  pdf.save(`easygraph-${Date.now()}.pdf`);
}
