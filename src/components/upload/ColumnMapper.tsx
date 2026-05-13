'use client';

import { useEffect } from 'react';
import { ColumnDef } from '@/context/ChartContext';
import { useChart } from '@/context/ChartContext';
import styles from './ColumnMapper.module.css';
import { Hash, Calendar, Tag, EyeOff, Sparkles, CheckCircle2 } from 'lucide-react';

interface Props {
  headers: ColumnDef[];
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  date:     <Calendar size={14} />,
  number:   <Hash size={14} />,
  category: <Tag size={14} />,
  ignore:   <EyeOff size={14} />,
};

const TYPE_COLORS: Record<string, string> = {
  date:     '#00d4ff',
  number:   '#10b981',
  category: '#f59e0b',
  ignore:   '#4a5568',
};

const TYPE_LABELS: Record<string, string> = {
  date:     '날짜',
  number:   '숫자',
  category: '범주',
  ignore:   '무시',
};

export default function ColumnMapper({ headers }: Props) {
  const { state, dispatch } = useChart();

  const numericCols  = headers.filter(h => h.type === 'number');
  const categoryCols = headers.filter(h => h.type === 'date' || h.type === 'category');
  const allCols      = [...categoryCols, ...numericCols];

  // ── Auto-suggest on first load ──────────────────────────────────────
  useEffect(() => {
    if (state.xAxis || state.yAxes.length > 0) return; // already set

    // X: first date or category column
    const xSuggest = categoryCols[0]?.name ?? allCols[0]?.name ?? '';
    // Y: all numeric columns
    const ySuggest = numericCols.map(c => c.name);

    if (xSuggest) dispatch({ type: 'SET_X_AXIS', payload: xSuggest });
    if (ySuggest.length) dispatch({ type: 'SET_Y_AXES', payload: ySuggest });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleYAxis = (name: string) => {
    const cur = state.yAxes;
    dispatch({
      type: 'SET_Y_AXES',
      payload: cur.includes(name) ? cur.filter(y => y !== name) : [...cur, name],
    });
  };

  const autoApplied =
    categoryCols.length > 0 &&
    state.xAxis === (categoryCols[0]?.name ?? '') &&
    state.yAxes.length === numericCols.length;

  return (
    <div className={styles.wrapper}>

      {/* Auto-suggestion banner */}
      {autoApplied && (
        <div className={styles.autoBanner}>
          <Sparkles size={15} />
          <span>
            데이터를 분석하여 자동으로 X축과 Y축을 제안했습니다. 필요하면 아래에서 직접 변경하세요.
          </span>
        </div>
      )}

      <div className={styles.grid}>

        {/* X Axis */}
        <div className={`${styles.section} card`}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: 'rgba(0,212,255,0.15)', color: '#00d4ff' }}>
              <Calendar size={16} />
            </div>
            <div>
              <h3>X축 (가로축)</h3>
              <p>날짜 또는 범주형 컬럼을 선택하세요</p>
            </div>
          </div>
          <div className={styles.colList}>
            {allCols.map(col => (
              <button
                key={col.name}
                id={`xaxis-${col.name}`}
                className={`${styles.colBtn} ${state.xAxis === col.name ? styles.selected : ''}`}
                onClick={() => dispatch({ type: 'SET_X_AXIS', payload: col.name })}
              >
                <span style={{ color: TYPE_COLORS[col.type] }}>{TYPE_ICONS[col.type]}</span>
                <span className={styles.colName}>{col.name}</span>
                <span className={styles.typeTag} style={{ color: TYPE_COLORS[col.type] }}>
                  {TYPE_LABELS[col.type]}
                </span>
                {state.xAxis === col.name && (
                  <span className={styles.check}><CheckCircle2 size={14} /></span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Y Axes */}
        <div className={`${styles.section} card`}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
              <Hash size={16} />
            </div>
            <div>
              <h3>Y축 (세로축)</h3>
              <p>숫자형 컬럼을 하나 이상 선택하세요</p>
            </div>
          </div>
          {/* Select All */}
          {numericCols.length > 1 && (
            <button
              className={styles.selectAllBtn}
              onClick={() =>
                state.yAxes.length === numericCols.length
                  ? dispatch({ type: 'SET_Y_AXES', payload: [] })
                  : dispatch({ type: 'SET_Y_AXES', payload: numericCols.map(c => c.name) })
              }
            >
              {state.yAxes.length === numericCols.length ? '전체 해제' : '전체 선택'}
            </button>
          )}
          <div className={styles.colList}>
            {numericCols.length === 0 && (
              <p className={styles.noData}>숫자형 컬럼이 없습니다.</p>
            )}
            {numericCols.map(col => (
              <button
                key={col.name}
                id={`yaxis-${col.name}`}
                className={`${styles.colBtn} ${state.yAxes.includes(col.name) ? styles.selected : ''}`}
                onClick={() => toggleYAxis(col.name)}
              >
                <span style={{ color: '#10b981' }}><Hash size={14} /></span>
                <span className={styles.colName}>{col.name}</span>
                {state.yAxes.includes(col.name) && (
                  <span className={styles.check} style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>
                    <CheckCircle2 size={14} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Group By */}
        <div className={`${styles.section} card`}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
              <Tag size={16} />
            </div>
            <div>
              <h3>그룹 기준 (선택)</h3>
              <p>데이터를 나눌 범주형 컬럼</p>
            </div>
          </div>
          <div className={styles.colList}>
            <button
              id="groupby-none"
              className={`${styles.colBtn} ${state.groupBy === '' ? styles.selected : ''}`}
              onClick={() => dispatch({ type: 'SET_GROUP_BY', payload: '' })}
            >
              <span style={{ color: 'var(--text-muted)' }}><EyeOff size={14} /></span>
              <span className={styles.colName}>그룹 없음</span>
              {state.groupBy === '' && <span className={styles.check}><CheckCircle2 size={14} /></span>}
            </button>
            {categoryCols.map(col => (
              <button
                key={col.name}
                id={`groupby-${col.name}`}
                className={`${styles.colBtn} ${state.groupBy === col.name ? styles.selected : ''}`}
                onClick={() => dispatch({ type: 'SET_GROUP_BY', payload: col.name })}
              >
                <span style={{ color: TYPE_COLORS[col.type] }}>{TYPE_ICONS[col.type]}</span>
                <span className={styles.colName}>{col.name}</span>
                {state.groupBy === col.name && <span className={styles.check}><CheckCircle2 size={14} /></span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      {state.xAxis && state.yAxes.length > 0 ? (
        <div className={styles.summary}>
          <CheckCircle2 size={15} color="var(--accent-green)" />
          <span>X축: <strong>{state.xAxis}</strong></span>
          <span>Y축: <strong>{state.yAxes.join(', ')}</strong></span>
          {state.groupBy && <span>그룹: <strong>{state.groupBy}</strong></span>}
        </div>
      ) : (
        <div className={styles.hint}>⬆️ X축과 Y축을 선택해야 차트를 생성할 수 있습니다</div>
      )}
    </div>
  );
}
