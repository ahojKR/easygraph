'use client';

import { useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useChart } from '@/context/ChartContext';
import { enrichData } from '@/lib/statistics';
import { generateMockInsights } from '@/lib/mockInsights';
import { exportToPNG, exportToPDF } from '@/lib/export';
import ChartCanvas from './ChartCanvas';
import ChartTypeSelector from './ChartTypeSelector';
import SettingsPanel from './SettingsPanel';
import InsightPanel from './InsightPanel';
import DataTable from './DataTable';
import KPIBar from './KPIBar';
import styles from './ChartEditorPage.module.css';
import { BarChart2, RefreshCw, ArrowLeft, FileImage, FileText, Presentation, Copy, Sheet } from 'lucide-react';

export default function ChartEditorPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const isDemo       = searchParams.get('demo') === 'true';
  const { state, dispatch } = useChart();
  const chartRef = useRef<HTMLDivElement>(null);

  // Load demo data
  useEffect(() => {
    if (isDemo && state.rawData.length === 0) {
      const demoData = Array.from({ length: 12 }, (_, i) => ({
        '월':    `${i + 1}월`,
        '매출':  Math.floor(3000 + Math.random() * 5000),
        '비용':  Math.floor(2000 + Math.random() * 3000),
        '고객수': Math.floor(100 + Math.random() * 400),
      }));
      dispatch({
        type: 'SET_DATA',
        payload: {
          data: demoData,
          headers: [
            { name: '월',    type: 'date',   index: 0 },
            { name: '매출',  type: 'number', index: 1 },
            { name: '비용',  type: 'number', index: 2 },
            { name: '고객수', type: 'number', index: 3 },
          ],
          fileName: '샘플데이터.xlsx',
        },
      });
      dispatch({ type: 'SET_DISPLAY_DATA', payload: { data: demoData, transformType: 'none' } });
      dispatch({ type: 'SET_X_AXIS',  payload: '월' });
      dispatch({ type: 'SET_Y_AXES',  payload: ['매출', '비용'] });
    }
  }, [isDemo, state.rawData.length, dispatch]);

  // Generate insights
  useEffect(() => {
    if (state.rawData.length > 0 && state.xAxis && state.yAxes.length > 0) {
      const insights = generateMockInsights(state.rawData, state.xAxis, state.yAxes, state.fileName);
      dispatch({ type: 'SET_INSIGHTS', payload: insights });
    }
  }, [state.rawData, state.xAxis, state.yAxes, state.fileName, dispatch]);

  // Use displayData (may be transformed) for rendering
  const enrichedData = (state.displayData.length > 0 && state.xAxis && state.yAxes.length > 0)
    ? enrichData(state.displayData, state.xAxis, state.yAxes, {
        ytdAvg:    state.options.showCumulativeAverage,
        rollingAvg: state.options.showRollingAverage,
        rollingN:   state.options.rollingAveragePeriod,
      })
    : [];

  const hasData = state.displayData.length > 0 && state.xAxis && state.yAxes.length > 0;

  return (
    <div className={styles.root}>
      {/* TOP BAR */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.logoBtn} onClick={() => router.push('/')} id="chart-logo">
            <BarChart2 size={20} color="var(--accent-aqua)" />
            <span>EasyGraph</span>
          </button>
          <div className={styles.divider} />
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/upload')} id="back-to-upload">
            <ArrowLeft size={14} /> 데이터 변경
          </button>
          {state.fileName && (
            <span className={styles.fileName}>{state.fileName}</span>
          )}
        </div>
        <div className={styles.headerRight}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              const insights = generateMockInsights(state.rawData, state.xAxis, state.yAxes, state.fileName);
              dispatch({ type: 'SET_INSIGHTS', payload: insights });
            }}
            id="refresh-insights-btn"
          >
            <RefreshCw size={14} /> 인사이트 갱신
          </button>
          <div className={styles.exportGroup}>
            <button className="btn btn-ghost btn-sm" onClick={() => exportToPNG(chartRef)} id="export-png-btn">
              <FileImage size={14} /> PNG
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => exportToPDF(chartRef, state.options.chartTitle || 'EasyGraph 차트')}
              id="export-pdf-btn"
            >
              <FileText size={14} /> PDF
            </button>
            <button
              className="btn btn-ghost btn-sm"
              id="export-ppt-btn"
              onClick={async () => {
                const { exportToPPT } = await import('@/lib/exportPPT');
                let imgBase64 = '';
                if (chartRef.current) {
                  try {
                    const { default: html2canvas } = await import('html2canvas');
                    const canvas = await html2canvas(chartRef.current, { backgroundColor: '#0f1628', scale: 2 });
                    imgBase64 = canvas.toDataURL('image/png');
                  } catch (_) { /* ignore */ }
                }
                const kpiText = (state.insights ?? [])
                  .filter(i => i.type === 'trend' && i.value !== undefined)
                  .map(i => `${i.title}: ${i.value! > 0 ? '+' : ''}${i.value}%`)
                  .join(' | ');
                const insightLines = (state.insights ?? [])
                  .filter(i => i.type !== 'trend')
                  .slice(0, 3)
                  .map(i => i.content ?? i.text ?? '');
                await exportToPPT({
                  chartTitle: state.options.chartTitle || 'EasyGraph 분석 리포트',
                  chartImage: imgBase64,
                  kpiText,
                  insightLines,
                });
              }}
            >
              <Presentation size={14} /> PPT
            </button>

            {/* ── Excel 다운로드 (데이터 + 연동 차트) ── */}
            <button
              className="btn btn-success btn-sm"
              id="export-excel-btn"
              title="데이터 + 차트 Excel 다운로드 (데이터 수정 시 차트 자동 갱신)"
              onClick={async () => {
                if (!hasData) return;
                const { exportExcelWithChart } = await import('@/lib/exportExcelChart');
                await exportExcelWithChart(
                  state.displayData,
                  state.xAxis,
                  state.yAxes,
                  {
                    title:       state.options.chartTitle || state.fileName || 'EasyGraph',
                    chartType:   (state.chartType as 'bar' | 'stacked-bar' | 'line') || 'stacked-bar',
                    colorScheme: state.options.colorScheme,
                  },
                );
              }}
            >
              <Sheet size={14} /> Excel
            </button>
            <button
              className="btn btn-ghost btn-sm"
              id="copy-chart-btn"
              onClick={async () => {
                if (!chartRef.current) return;
                try {
                  const { default: html2canvas } = await import('html2canvas');
                  const canvas = await html2canvas(chartRef.current, {
                    backgroundColor: '#0f1628', scale: 2,
                  });
                  canvas.toBlob(async (blob) => {
                    if (!blob) return;
                    await navigator.clipboard.write([
                      new ClipboardItem({ 'image/png': blob }),
                    ]);
                    // 간단한 피드백 (버튼 텍스트 변경)
                    const btn = document.getElementById('copy-chart-btn');
                    if (btn) {
                      const orig = btn.innerHTML;
                      btn.innerHTML = '✅ 복사됨';
                      setTimeout(() => { btn.innerHTML = orig; }, 2000);
                    }
                  });
                } catch (_) {
                  alert('클립보드 복사는 HTTPS 환경에서만 지원됩니다.');
                }
              }}
              title="차트를 이미지로 클립보드 복사"
            >
              <Copy size={14} /> 복사
            </button>
          </div>
        </div>
      </header>

      <div className={styles.body}>
        {/* LEFT: Settings Panel */}
        <aside className={styles.sidebar}>
          <ChartTypeSelector />
          <SettingsPanel />
        </aside>

        {/* CENTER: Chart + DataTable */}
        <main className={styles.main}>
          {!hasData ? (
            <div className={styles.emptyState}>
              <BarChart2 size={48} color="var(--text-muted)" />
              <h2>데이터가 없습니다</h2>
              <p>먼저 파일을 업로드하고 X축/Y축 인자를 선택해주세요</p>
              <button className="btn btn-primary" onClick={() => router.push('/upload')} id="empty-upload-btn">
                파일 업로드하기
              </button>
            </div>
          ) : (
            <div className={styles.chartArea}>
              {/* 차트 제목 */}
              {state.options.chartTitle && (
                <h2 className={styles.chartTitle}>{state.options.chartTitle}</h2>
              )}

              {/* KPI 카드 */}
              <KPIBar />

              {/* 그래프 */}
              <div ref={chartRef} className={styles.chartWrapper}>
                <ChartCanvas data={enrichedData} />
              </div>

              {/* AI 인사이트 */}
              <InsightPanel />

              {/* 데이터 테이블 (하단) */}
              <DataTable />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
