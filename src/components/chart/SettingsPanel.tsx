'use client';

import { useChart, ChartOptions } from '@/context/ChartContext';
import styles from './SettingsPanel.module.css';
import { SlidersHorizontal } from 'lucide-react';

export default function SettingsPanel() {
  const { state, dispatch } = useChart();
  const { options } = state;

  const update = (patch: Partial<ChartOptions>) =>
    dispatch({ type: 'UPDATE_OPTIONS', payload: patch });

  return (
    <div className={styles.wrapper}>
      <div className={styles.sectionTitle}>
        <SlidersHorizontal size={14} /> 분석 옵션
      </div>

      {/* Chart title */}
      <div className={styles.field}>
        <label className={styles.label}>차트 제목</label>
        <input
          id="chart-title-input"
          className="input"
          style={{ fontSize: '0.875rem', padding: '8px 12px' }}
          placeholder="차트 제목 입력"
          value={options.chartTitle}
          onChange={e => update({ chartTitle: e.target.value })}
        />
      </div>

      {/* Toggles */}
      {[
        { key: 'showCumulativeAverage', label: 'YTD 누적 평균선', desc: '누적 평균 오버레이' },
        { key: 'showRollingAverage',    label: '이동 평균선',    desc: `최근 ${options.rollingAveragePeriod}개 기간` },
        { key: 'showTargetLine',        label: '목표값 기준선',  desc: options.targetValue ? `목표: ${options.targetValue}` : '목표값 설정 필요' },
        { key: 'showMoMChange',         label: '전월 대비 증감', desc: 'MoM 증감률 표시' },
        { key: 'showYoYChange',         label: '전년 대비 증감', desc: 'YoY 증감률 표시' },
        { key: 'showOutliers',          label: '이상값 강조',    desc: '표준편차 2σ 초과' },
        { key: 'showLegend',            label: '범례 표시',      desc: '' },
        { key: 'showGrid',              label: '격자선 표시',    desc: '' },
        { key: 'showDataLabels',        label: '데이터 레이블',  desc: '각 포인트에 수치 표시' },
        { key: 'stacked',               label: '누적형',         desc: '막대/면적 차트 전용' },
      ].map(({ key, label, desc }) => (
        <div key={key} className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <span className={styles.toggleLabel}>{label}</span>
            {desc && <span className={styles.toggleDesc}>{desc}</span>}
          </div>
          <label className="toggle">
            <input
              id={`toggle-${key}`}
              type="checkbox"
              checked={!!options[key as keyof typeof options]}
              onChange={e => update({ [key]: e.target.checked } as never)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      ))}

      {/* Rolling average period */}
      {options.showRollingAverage && (
        <div className={styles.field}>
          <label className={styles.label}>이동 평균 기간 (N)</label>
          <input
            id="rolling-period-input"
            type="number"
            min={2} max={24}
            className="input"
            style={{ fontSize: '0.875rem', padding: '8px 12px' }}
            value={options.rollingAveragePeriod}
            onChange={e => update({ rollingAveragePeriod: Number(e.target.value) })}
          />
        </div>
      )}

      {/* Target value */}
      {options.showTargetLine && (
        <div className={styles.field}>
          <label className={styles.label}>목표값</label>
          <input
            id="target-value-input"
            type="number"
            className="input"
            style={{ fontSize: '0.875rem', padding: '8px 12px' }}
            placeholder="목표 수치 입력"
            value={options.targetValue ?? ''}
            onChange={e => update({ targetValue: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
      )}

      <div className={styles.sectionTitle} style={{ marginTop: 8 }}>
        <SlidersHorizontal size={14} /> 색상 팔레트
      </div>
      <div className={styles.colorSchemes}>
        {[
          { id: 'default', label: '기본', colors: ['#00d4ff','#7c3aed','#10b981','#f59e0b'] },
          { id: 'ocean',   label: '오션', colors: ['#0ea5e9','#06b6d4','#14b8a6','#0891b2'] },
          { id: 'sunset',  label: '선셋', colors: ['#f97316','#ec4899','#a855f7','#ef4444'] },
          { id: 'forest',  label: '포레스트', colors: ['#22c55e','#84cc16','#10b981','#16a34a'] },
          { id: 'mono',    label: '모노',  colors: ['#f0f4ff','#8892b0','#4a5568','#2d3748'] },
        ].map(scheme => (
          <button
            key={scheme.id}
            id={`color-scheme-${scheme.id}`}
            className={`${styles.schemeBtn} ${options.colorScheme === scheme.id ? styles.schemeActive : ''}`}
            onClick={() => update({ colorScheme: scheme.id })}
            title={scheme.label}
          >
            <div className={styles.schemeDots}>
              {scheme.colors.map((c, i) => (
                <span key={i} style={{ background: c }} className={styles.dot} />
              ))}
            </div>
            <span>{scheme.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
