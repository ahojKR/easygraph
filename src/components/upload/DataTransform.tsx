'use client';

import { useMemo, useState } from 'react';
import { useChart, TransformType, Row } from '@/context/ChartContext';
import { applyTransform, describeData } from '@/lib/transform';
import styles from './DataTransform.module.css';
import { Sparkles, RefreshCw, Table2, BarChart2 } from 'lucide-react';

const TRANSFORM_OPTIONS: {
  id: TransformType;
  icon: string;
  label: string;
  desc: string;
  example: string;
}[] = [
  {
    id: 'none',
    icon: '📊',
    label: '원본 수치 그대로',
    desc: '업로드한 숫자를 변환 없이 그대로 사용합니다',
    example: '예: 한국 2022년 매출 = 1,200',
  },
  {
    id: 'col-pct',
    icon: '🥧',
    label: '열(기간/연도) 기준 비중 %',
    desc: '각 연도/기간 합계를 100%로 두고 항목별 비중을 계산합니다',
    example: '예: 2022년 전체 매출 중 한국 비중 = 34.2%',
  },
  {
    id: 'row-pct',
    icon: '📈',
    label: '행(항목) 기준 비중 %',
    desc: '각 항목(국가 등)의 전체 합계를 100%로 두고 기간별 비중을 계산합니다',
    example: '예: 한국 전체 기간 중 2022년 비중 = 22.1%',
  },
  {
    id: 'total-pct',
    icon: '🌐',
    label: '전체 합계 기준 비중 %',
    desc: '모든 데이터 합계를 100%로 두고 각 셀의 비중을 계산합니다',
    example: '예: 한국 2022년 = 전체 중 8.3%',
  },
  {
    id: 'rank',
    icon: '🏆',
    label: '순위로 변환',
    desc: '각 기간별로 수치를 순위(1위, 2위...)로 변환합니다',
    example: '예: 한국 2022년 순위 = 2위',
  },
];

function PreviewTable({ data, xAxis, yAxes, label }: { data: Row[]; xAxis: string; yAxes: string[]; label: string }) {
  const preview = data.slice(0, 6);
  return (
    <div className={styles.tableWrapper}>
      <div className={styles.tableLabel}>{label}</div>
      <div style={{ overflowX: 'auto' }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{xAxis}</th>
              {yAxes.map(y => <th key={y}>{y}</th>)}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i}>
                <td className={styles.xCell}>{String(row[xAxis])}</td>
                {yAxes.map(y => (
                  <td key={y} className={styles.numCell}>
                    {typeof row[y] === 'number' ? row[y]!.toLocaleString() : String(row[y] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DataTransform() {
  const { state, dispatch } = useChart();
  const { rawData, displayData, xAxis, yAxes, transformType } = state;

  const [selected, setSelected] = useState<TransformType>(transformType);
  const [applied, setApplied] = useState(transformType !== 'none');

  const { summary, suggestion } = useMemo(
    () => describeData(rawData, xAxis, yAxes),
    [rawData, xAxis, yAxes]
  );

  const preview = useMemo(
    () => applyTransform(rawData, yAxes, selected),
    [rawData, yAxes, selected]
  );

  const apply = () => {
    dispatch({ type: 'SET_DISPLAY_DATA', payload: { data: preview, transformType: selected } });
    // Auto-recommend chart type for percentage data
    if (selected === 'col-pct') {
      dispatch({ type: 'SET_CHART_TYPE', payload: 'stacked-bar' });
      dispatch({ type: 'UPDATE_OPTIONS', payload: { showDataLabels: true, stacked: true } });
    } else if (selected === 'row-pct') {
      dispatch({ type: 'SET_CHART_TYPE', payload: 'line' });
    } else if (selected === 'rank') {
      dispatch({ type: 'SET_CHART_TYPE', payload: 'bar' });
    }
    setApplied(true);
  };

  const reset = () => {
    setSelected('none');
    dispatch({ type: 'SET_DISPLAY_DATA', payload: { data: rawData, transformType: 'none' } });
    setApplied(false);
  };

  const isChanged = selected !== transformType;
  const yLabel = yAxes.slice(0, 3).join(', ') + (yAxes.length > 3 ? '...' : '');

  return (
    <div className={styles.root}>
      {/* AI-style description */}
      <div className={styles.aiCard}>
        <div className={styles.aiIcon}><Sparkles size={18} /></div>
        <div className={styles.aiBody}>
          <p className={styles.aiTitle}>데이터 분석 결과</p>
          <p className={styles.aiText} dangerouslySetInnerHTML={{ __html: summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          <p className={styles.aiSuggest}>💡 {suggestion}</p>
        </div>
      </div>

      {/* Question */}
      <div className={styles.question}>
        <h2 className={styles.qTitle}>
          <span className={styles.qNum}>?</span>
          이 수치를 어떻게 보고 싶으세요?
        </h2>
        <p className={styles.qDesc}>
          현재 <strong>{xAxis}</strong>별 <strong>{yLabel}</strong> 원본 수치입니다.
          그래프를 그리기 전에 수치를 변환할 수 있습니다.
        </p>
      </div>

      {/* Options */}
      <div className={styles.options}>
        {TRANSFORM_OPTIONS.map(opt => (
          <button
            key={opt.id}
            id={`transform-${opt.id}`}
            className={`${styles.optBtn} ${selected === opt.id ? styles.optSelected : ''}`}
            onClick={() => { setSelected(opt.id); setApplied(false); }}
          >
            <div className={styles.optTop}>
              <span className={styles.optIcon}>{opt.icon}</span>
              <span className={styles.optLabel}>{opt.label}</span>
              {selected === opt.id && <span className={styles.optCheck}>✓</span>}
            </div>
            <p className={styles.optDesc}>{opt.desc}</p>
            <p className={styles.optExample}>{opt.example}</p>
          </button>
        ))}
      </div>

      {/* Before / After preview */}
      <div className={styles.previewGrid}>
        <PreviewTable
          data={rawData}
          xAxis={xAxis}
          yAxes={yAxes}
          label="📂 원본 데이터"
        />
        <div className={styles.arrow}>→</div>
        <PreviewTable
          data={preview}
          xAxis={xAxis}
          yAxes={yAxes}
          label={`✨ 변환 후 (${TRANSFORM_OPTIONS.find(o => o.id === selected)?.label ?? ''})`}
        />
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        {applied && transformType !== 'none' && (
          <div className={styles.appliedBadge}>
            <span>✅ {TRANSFORM_OPTIONS.find(o => o.id === transformType)?.label} 적용됨</span>
            <button className={styles.resetBtn} onClick={reset} id="transform-reset">
              <RefreshCw size={13} /> 원본으로 되돌리기
            </button>
          </div>
        )}
        <div style={{ flex: 1 }} />
        {isChanged || !applied ? (
          <button
            id="apply-transform-btn"
            className="btn btn-primary"
            onClick={apply}
            style={{ gap: 8 }}
          >
            <BarChart2 size={16} />
            {selected === 'none' ? '원본 수치로 진행' : `${TRANSFORM_OPTIONS.find(o => o.id === selected)?.label}으로 변환 적용`}
          </button>
        ) : (
          <button
            id="transform-done-btn"
            className="btn btn-secondary"
            onClick={reset}
          >
            <Table2 size={16} /> 다른 변환 방식 선택
          </button>
        )}
      </div>
    </div>
  );
}
