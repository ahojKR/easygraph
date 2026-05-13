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
    label: '원본 유지',
    desc: '입력된 수치를 변환 없이 그대로 그래프화합니다',
    example: '예: 한국 2022년 매출 = 1,200만원',
  },
  {
    id: 'col-pct',
    icon: '🥧',
    label: '기간/항목 비중 %',
    desc: '각 기간 합계를 100%로 두고 항목별 점유율 계산 (파이·누적막대에 적합)',
    example: '예: 2022년 전체 중 한국 비중 = 34.2%',
  },
  {
    id: 'cumulative',
    icon: '📈',
    label: '누적 합계',
    desc: '시간 흐름에 따른 수치를 누적하여 추이 확인',
    example: '예: 1월 100 → 2월 230 → 3월 410…',
  },
  {
    id: 'rank',
    icon: '🏆',
    label: '순위 변환',
    desc: '수치 대신 1위·2위·3위… 랭킹으로 표시',
    example: '예: 한국 2022년 = 2위',
  },
  {
    id: 'period-quarter',
    icon: '🗓️',
    label: '분기 집계',
    desc: '월별 데이터를 Q1·Q2·Q3·Q4 분기로 합산',
    example: '예: 1·2·3월 → Q1 합계',
  },
  {
    id: 'period-half',
    icon: '📅',
    label: '반기 집계',
    desc: '월별 데이터를 상반기·하반기로 합산',
    example: '예: 1~6월 → 상반기 합계',
  },
];

function PreviewTable({ data, xAxis, yAxes, label }: {
  data: Row[]; xAxis: string; yAxes: string[]; label: string;
}) {
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
                <td className={styles.xCell}>{String(row[xAxis] ?? '')}</td>
                {yAxes.map(y => (
                  <td key={y} className={styles.numCell}>
                    {typeof row[y] === 'number' ? (row[y] as number).toLocaleString() : String(row[y] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 6 && (
          <div className={styles.moreRows}>+{data.length - 6}행 더 있음</div>
        )}
      </div>
    </div>
  );
}

export default function DataTransform() {
  const { state, dispatch } = useChart();
  const { rawData, transformType, xAxis, yAxes } = state;

  const [selected, setSelected] = useState<TransformType>(transformType);
  const [applied, setApplied]   = useState(transformType !== 'none');

  const { summary, suggestion } = useMemo(
    () => describeData(rawData, xAxis, yAxes),
    [rawData, xAxis, yAxes]
  );

  const preview = useMemo(
    () => applyTransform(rawData, yAxes, selected, xAxis),
    [rawData, yAxes, selected, xAxis]
  );

  const apply = () => {
    dispatch({ type: 'SET_DISPLAY_DATA', payload: { data: preview, transformType: selected } });
    // Auto-recommend chart type
    if (selected === 'col-pct' || selected === 'row-pct') {
      dispatch({ type: 'SET_CHART_TYPE', payload: 'stacked-bar' });
      dispatch({ type: 'UPDATE_OPTIONS', payload: { showDataLabels: true, stacked: true } });
    } else if (selected === 'cumulative') {
      dispatch({ type: 'SET_CHART_TYPE', payload: 'area' });
    } else if (selected === 'rank') {
      dispatch({ type: 'SET_CHART_TYPE', payload: 'bar' });
    } else if (selected === 'period-quarter' || selected === 'period-half') {
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

  return (
    <div className={styles.root}>
      {/* AI 설명 카드 */}
      <div className={styles.aiCard}>
        <div className={styles.aiIcon}><Sparkles size={18} /></div>
        <div className={styles.aiBody}>
          <p className={styles.aiTitle}>데이터 분석 결과</p>
          <p className={styles.aiText}
             dangerouslySetInnerHTML={{ __html: summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          <p className={styles.aiSuggest}>💡 {suggestion}</p>
        </div>
      </div>

      {/* 질문 */}
      <div className={styles.question}>
        <h2 className={styles.qTitle}>
          <span className={styles.qNum}>?</span>
          이 수치를 어떻게 보고 싶으세요?
        </h2>
        <p className={styles.qDesc}>
          현재 <strong>{xAxis}</strong>별 <strong>{yAxes.slice(0, 3).join(', ')}</strong> 수치입니다.
          그래프 전에 변환 방식을 선택할 수 있습니다.
        </p>
      </div>

      {/* 변환 옵션 */}
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

      {/* Before / After 미리보기 */}
      <div className={styles.previewGrid}>
        <PreviewTable data={rawData}  xAxis={xAxis} yAxes={yAxes} label="📂 원본 데이터" />
        <div className={styles.arrow}>→</div>
        <PreviewTable
          data={preview} xAxis={xAxis} yAxes={yAxes}
          label={`✨ 변환 후 (${TRANSFORM_OPTIONS.find(o => o.id === selected)?.label ?? '원본'})`}
        />
      </div>

      {/* 액션 */}
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
          <button id="apply-transform-btn" className="btn btn-primary" onClick={apply}>
            <BarChart2 size={16} />
            {selected === 'none'
              ? '원본 수치로 진행'
              : `${TRANSFORM_OPTIONS.find(o => o.id === selected)?.label}으로 변환 적용`}
          </button>
        ) : (
          <button id="transform-done-btn" className="btn btn-secondary" onClick={reset}>
            <Table2 size={16} /> 다른 변환 방식 선택
          </button>
        )}
      </div>
    </div>
  );
}
