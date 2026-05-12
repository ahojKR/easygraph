'use client';

import { useChart, ChartType } from '@/context/ChartContext';
import styles from './ChartTypeSelector.module.css';

interface ChartOption {
  type: ChartType;
  label: string;
  icon: string;
  desc: string;
}

const CHART_OPTIONS: ChartOption[] = [
  { type: 'line',        label: '라인',    icon: '📈', desc: '추세·시계열' },
  { type: 'bar',         label: '막대',    icon: '📊', desc: '비교·순위' },
  { type: 'stacked-bar', label: '누적 막대', icon: '▦', desc: '구성 비율' },
  { type: 'area',        label: '면적',    icon: '🏔', desc: '누적 흐름' },
  { type: 'combo',       label: '콤보',    icon: '🔀', desc: '라인+막대' },
  { type: 'pie',         label: '파이',    icon: '🥧', desc: '비율 분포' },
  { type: 'donut',       label: '도넛',    icon: '🍩', desc: '중앙 강조' },
  { type: 'scatter',     label: '산점도',  icon: '✦', desc: '상관관계' },
  { type: 'radar',       label: '레이더',  icon: '🕸', desc: '다차원 비교' },
];

export default function ChartTypeSelector() {
  const { state, dispatch } = useChart();

  return (
    <div className={styles.wrapper}>
      <div className={styles.title}>차트 유형</div>
      <div className={styles.grid}>
        {CHART_OPTIONS.map(opt => (
          <button
            key={opt.type}
            id={`chart-type-${opt.type}`}
            className={`${styles.typeBtn} ${state.chartType === opt.type ? styles.active : ''}`}
            onClick={() => dispatch({ type: 'SET_CHART_TYPE', payload: opt.type })}
            title={opt.desc}
          >
            <span className={styles.typeIcon}>{opt.icon}</span>
            <span className={styles.typeLabel}>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
