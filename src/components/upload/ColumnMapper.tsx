'use client';

import { ColumnDef } from '@/context/ChartContext';
import { useChart } from '@/context/ChartContext';
import styles from './ColumnMapper.module.css';
import { Hash, Calendar, Tag, EyeOff } from 'lucide-react';

interface Props {
  headers: ColumnDef[];
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  date: <Calendar size={14} />,
  number: <Hash size={14} />,
  category: <Tag size={14} />,
  ignore: <EyeOff size={14} />,
};

const TYPE_COLORS: Record<string, string> = {
  date: '#00d4ff',
  number: '#10b981',
  category: '#f59e0b',
  ignore: '#4a5568',
};

export default function ColumnMapper({ headers }: Props) {
  const { state, dispatch } = useChart();

  const numericCols = headers.filter(h => h.type === 'number');
  const dateCols = headers.filter(h => h.type === 'date' || h.type === 'category');

  const toggleYAxis = (name: string) => {
    const current = state.yAxes;
    if (current.includes(name)) {
      dispatch({ type: 'SET_Y_AXES', payload: current.filter(y => y !== name) });
    } else {
      dispatch({ type: 'SET_Y_AXES', payload: [...current, name] });
    }
  };

  return (
    <div className={styles.wrapper}>
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
            {[...dateCols, ...numericCols].map(col => (
              <button
                key={col.name}
                id={`xaxis-${col.name}`}
                className={`${styles.colBtn} ${state.xAxis === col.name ? styles.selected : ''}`}
                onClick={() => dispatch({ type: 'SET_X_AXIS', payload: col.name })}
              >
                <span style={{ color: TYPE_COLORS[col.type] }}>{TYPE_ICONS[col.type]}</span>
                <span>{col.name}</span>
                <span className={styles.typeTag} style={{ color: TYPE_COLORS[col.type] }}>
                  {col.type === 'date' ? '날짜' : col.type === 'number' ? '숫자' : '범주'}
                </span>
                {state.xAxis === col.name && <span className={styles.check}>✓</span>}
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
                <span>{col.name}</span>
                {state.yAxes.includes(col.name) && (
                  <span className={styles.check} style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>✓</span>
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
              <span>그룹 없음</span>
              {state.groupBy === '' && <span className={styles.check}>✓</span>}
            </button>
            {[...dateCols].map(col => (
              <button
                key={col.name}
                id={`groupby-${col.name}`}
                className={`${styles.colBtn} ${state.groupBy === col.name ? styles.selected : ''}`}
                onClick={() => dispatch({ type: 'SET_GROUP_BY', payload: col.name })}
              >
                <span style={{ color: TYPE_COLORS[col.type] }}>{TYPE_ICONS[col.type]}</span>
                <span>{col.name}</span>
                {state.groupBy === col.name && <span className={styles.check}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      {state.xAxis && state.yAxes.length > 0 && (
        <div className={styles.summary}>
          <span>✅ X축: <strong>{state.xAxis}</strong></span>
          <span>Y축: <strong>{state.yAxes.join(', ')}</strong></span>
          {state.groupBy && <span>그룹: <strong>{state.groupBy}</strong></span>}
        </div>
      )}
      {(!state.xAxis || state.yAxes.length === 0) && (
        <div className={styles.hint}>
          ⬆️ X축과 Y축을 선택해야 차트를 생성할 수 있습니다
        </div>
      )}
    </div>
  );
}
