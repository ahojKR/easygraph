'use client';

import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useChart, ChartType } from '@/context/ChartContext';
import MiniChart from './MiniChart';
import styles from './ChartBuilder.module.css';
import {
  BarChart2, TrendingUp, Layers, ArrowRight,
  SortDesc, SortAsc, AlignLeft,
} from 'lucide-react';

type SortMode = 'total-desc' | 'alpha';

interface Props { onBack: () => void; }

export default function ChartBuilder({ onBack }: Props) {
  const router = useRouter();
  const { state, dispatch } = useChart();

  const [chartType,  setChartType]  = useState<ChartType>(state.chartType || 'stacked-bar');
  const [showTotal,  setShowTotal]  = useState(true);
  const [showGrowth, setShowGrowth] = useState(true);
  const [showAvg,    setShowAvg]    = useState(false);
  const [colorScheme, setColor]     = useState(state.options.colorScheme || 'bw');
  const [sortMode,   setSortMode]   = useState<SortMode>('total-desc');

  // 정렬 적용된 데이터
  const sortedData = useMemo(() => {
    if (!state.displayData.length) return state.displayData;
    const data = [...state.displayData];
    if (sortMode === 'total-desc') {
      const yCols = state.yAxes;
      data.sort((a, b) => {
        const sumA = yCols.reduce((s, y) => s + (Number(a[y]) || 0), 0);
        const sumB = yCols.reduce((s, y) => s + (Number(b[y]) || 0), 0);
        return sumB - sumA;
      });
    } else {
      data.sort((a, b) =>
        String(a[state.xAxis] ?? '').localeCompare(String(b[state.xAxis] ?? ''))
      );
    }
    return data;
  }, [state.displayData, sortMode, state.xAxis, state.yAxes]);

  const applyAndGo = () => {
    dispatch({ type: 'SET_CHART_TYPE',  payload: chartType });
    dispatch({ type: 'SET_DISPLAY_DATA', payload: {
      data: sortedData,
      transformType: state.transformType,
    }});
    dispatch({ type: 'UPDATE_OPTIONS', payload: {
      colorScheme,
      showDataLabels: showTotal,
      stacked: chartType === 'stacked-bar',
      showCumulativeAverage: showAvg,
    }});
    router.push('/chart');
  };

  const hasData = state.displayData.length > 0 && state.xAxis && state.yAxes.length > 0;

  return (
    <div className={styles.root}>
      {/* 2-column layout */}
      <div className={styles.layout}>

        {/* ── LEFT: 설정 패널 ────────────────────────── */}
        <div className={styles.settings}>

          {/* 차트 타입 */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>차트 타입</h4>
            <div className={styles.typeGrid}>
              {([
                { id: 'stacked-bar', icon: <Layers size={20} />,   label: 'Stacked Bar' },
                { id: 'bar',         icon: <BarChart2 size={20} />, label: 'Bar' },
                { id: 'line',        icon: <TrendingUp size={20} />, label: 'Line' },
              ] as { id: ChartType; icon: React.ReactNode; label: string }[]).map(opt => (
                <button
                  key={opt.id}
                  id={`type-${opt.id}`}
                  className={`${styles.typeBtn} ${chartType === opt.id ? styles.typeBtnOn : ''}`}
                  onClick={() => setChartType(opt.id)}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 표시 요소 */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>표시 요소</h4>
            {[
              { key: 'total',  label: '합계(Total) 값 표시',  val: showTotal,  set: setShowTotal },
              { key: 'growth', label: 'YoY 성장률(%) 표시',   val: showGrowth, set: setShowGrowth },
              { key: 'avg',    label: '평균선 표시',           val: showAvg,    set: setShowAvg },
            ].map(o => (
              <label key={o.key} className={styles.checkRow} id={`toggle-${o.key}`}>
                <span className={`${styles.checkbox} ${o.val ? styles.checkboxOn : ''}`}
                  onClick={() => o.set(v => !v)}>
                  {o.val && <span className={styles.checkmark}>✓</span>}
                </span>
                <span className={styles.checkLabel} onClick={() => o.set(v => !v)}>{o.label}</span>
              </label>
            ))}
          </div>

          {/* 색상 테마 */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>색상 테마</h4>
            <div className={styles.colorOptions}>
              {[
                { id: 'bw',      label: '⬛ Black & White',   dots: ['#2d3748','#718096','#cbd5e0'] },
                { id: 'default', label: '🎨 Vivid (기본)',     dots: ['#00d4ff','#7c3aed','#10b981'] },
                { id: 'ocean',   label: '🌊 Ocean',           dots: ['#0ea5e9','#06b6d4','#14b8a6'] },
                { id: 'sunset',  label: '🌅 Sunset',          dots: ['#f97316','#ec4899','#a855f7'] },
              ].map(c => (
                <label key={c.id}
                  className={`${styles.colorRow} ${colorScheme === c.id ? styles.colorRowOn : ''}`}>
                  <input type="radio" name="color" value={c.id}
                    checked={colorScheme === c.id}
                    onChange={() => setColor(c.id)} />
                  <div className={styles.colorDots}>
                    {c.dots.map((d, i) => (
                      <span key={i} className={styles.colorDot} style={{ background: d }} />
                    ))}
                  </div>
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 정렬 */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>정렬 방식</h4>
            <div className={styles.sortOptions}>
              <label className={`${styles.sortRow} ${sortMode==='total-desc' ? styles.sortRowOn : ''}`}>
                <input type="radio" name="sort" value="total-desc"
                  checked={sortMode==='total-desc'} onChange={() => setSortMode('total-desc')} />
                <SortDesc size={14} /> Total 높은 순
              </label>
              <label className={`${styles.sortRow} ${sortMode==='alpha' ? styles.sortRowOn : ''}`}>
                <input type="radio" name="sort" value="alpha"
                  checked={sortMode==='alpha'} onChange={() => setSortMode('alpha')} />
                <AlignLeft size={14} /> 알파벳 순
              </label>
            </div>
          </div>
        </div>

        {/* ── RIGHT: 실시간 미리보기 ───────────────── */}
        <div className={styles.preview}>
          <div className={styles.previewHeader}>
            <span className={styles.previewLabel}>실시간 미리보기</span>
            <span className={styles.previewSub}>
              {state.xAxis} × {state.yAxes.join(' / ')}
            </span>
          </div>
          <div className={styles.previewChart}>
            {hasData ? (
              <MiniChart
                data={sortedData.slice(0, 30)}
                xAxis={state.xAxis}
                yAxes={state.yAxes}
                chartType={chartType}
                colorScheme={colorScheme}
                stacked={chartType === 'stacked-bar'}
              />
            ) : (
              <div className={styles.noData}>데이터 없음</div>
            )}
          </div>

          {/* KPI 힌트 */}
          {state.insights && state.insights.length > 0 && (
            <div className={styles.insightPills}>
              {state.insights.slice(0, 3).map((ins, i) => (
                <div key={i} className={styles.insightPill}>
                  <span className={styles.insightTitle}>{ins.title}</span>
                  {ins.value !== undefined && (
                    <span className={`${styles.insightVal} ${ins.value >= 0 ? styles.up : styles.dn}`}>
                      {ins.value >= 0 ? '▲' : '▼'}{Math.abs(ins.value)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 하단 CTA */}
      <div className={styles.footer}>
        <button className="btn btn-secondary" onClick={onBack} id="builder-back-btn">
          ← 분석 설정으로
        </button>
        <div style={{ flex: 1 }} />
        <button
          id="generate-chart-btn"
          className="btn btn-primary"
          disabled={!hasData}
          onClick={applyAndGo}
        >
          차트 생성하기 <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
