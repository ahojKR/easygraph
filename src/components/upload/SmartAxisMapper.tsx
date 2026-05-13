'use client';

import { useState, useMemo } from 'react';
import { ColumnDef } from '@/context/ChartContext';
import { useChart } from '@/context/ChartContext';
import { profileData, AxisIntent, pivotWideToLong } from '@/lib/dataDetect';
import ColumnMapper from './ColumnMapper';
import styles from './SmartAxisMapper.module.css';
import { Sparkles, ChevronRight, CheckCircle2, RotateCcw } from 'lucide-react';

interface Props { headers: ColumnDef[]; }

export default function SmartAxisMapper({ headers }: Props) {
  const { state, dispatch } = useChart();
  const [selected, setSelected] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  const profile = useMemo(
    () => profileData(state.rawData, headers),
    [state.rawData, headers]
  );

  const applyIntent = (intent: AxisIntent) => {
    if (intent.id === 'manual') {
      setShowManual(true);
      setSelected('manual');
      return;
    }
    setShowManual(false);
    setSelected(intent.id);

    if (intent.requiresPivot && intent.pivotConfig) {
      const { keyColumns, valueColumns, xLabel } = intent.pivotConfig;
      const pivoted = pivotWideToLong(state.rawData, keyColumns, valueColumns, xLabel);
      const seriesNames = Object.keys(pivoted[0] ?? {}).filter(k => k !== xLabel);
      dispatch({ type: 'SET_DISPLAY_DATA', payload: { data: pivoted, transformType: 'none' } });
      dispatch({ type: 'SET_X_AXIS',  payload: xLabel });
      dispatch({ type: 'SET_Y_AXES',  payload: seriesNames });
      dispatch({ type: 'SET_CHART_TYPE', payload: intent.chartType });
    } else {
      dispatch({ type: 'SET_DISPLAY_DATA', payload: { data: state.rawData, transformType: 'none' } });
      dispatch({ type: 'SET_X_AXIS',  payload: intent.xAxis });
      dispatch({ type: 'SET_Y_AXES',  payload: intent.yAxes.filter(Boolean) });
      dispatch({ type: 'SET_CHART_TYPE', payload: intent.chartType });
    }
  };

  const reset = () => {
    setSelected(null);
    setShowManual(false);
    dispatch({ type: 'SET_X_AXIS', payload: '' });
    dispatch({ type: 'SET_Y_AXES', payload: [] });
    dispatch({ type: 'SET_DISPLAY_DATA', payload: { data: state.rawData, transformType: 'none' } });
  };

  const activeIntent = profile.intents.find(i => i.id === selected);

  return (
    <div className={styles.root}>
      {/* AI 분석 배너 */}
      <div className={styles.banner}>
        <Sparkles size={16} color="var(--accent-aqua)" />
        <p>{profile.description}</p>
      </div>

      {/* 질문 */}
      <div className={styles.question}>
        <h2 className={styles.qTitle}>무엇을 표현하고 싶으세요?</h2>
        <p className={styles.qDesc}>표시할 내용의 <strong>의도</strong>를 선택하면 자동으로 X축·Y축을 설정합니다</p>
      </div>

      {/* 의도 카드 */}
      <div className={styles.cards}>
        {profile.intents.map(intent => (
          <button
            key={intent.id}
            id={`intent-${intent.id}`}
            className={`${styles.card} ${selected === intent.id ? styles.cardSelected : ''}`}
            onClick={() => applyIntent(intent)}
          >
            <div className={styles.cardTop}>
              <span className={styles.cardIcon}>{intent.icon}</span>
              {selected === intent.id && (
                <CheckCircle2 size={16} className={styles.cardCheck} />
              )}
            </div>
            <h3 className={styles.cardTitle}>{intent.title}</h3>
            <p className={styles.cardDesc}>{intent.desc}</p>
            <div className={styles.cardPreview}>
              <span>→ {intent.preview}</span>
            </div>
            {intent.requiresPivot && (
              <span className={styles.pivotBadge}>행·열 자동 전환</span>
            )}
          </button>
        ))}
      </div>

      {/* 선택 결과 */}
      {selected && !showManual && activeIntent && (
        <div className={styles.result}>
          <div className={styles.resultInner}>
            <CheckCircle2 size={16} color="var(--accent-green)" />
            <div className={styles.resultText}>
              <strong>{activeIntent.title}</strong> 선택됨
              <span className={styles.resultAxes}>
                X축: <em>{state.xAxis || activeIntent.xLabel}</em>
                &nbsp;/&nbsp;
                Y축: <em>{(state.yAxes.length ? state.yAxes : activeIntent.yAxes).slice(0, 3).join(', ')}{(state.yAxes.length > 3 ? '…' : '')}</em>
              </span>
            </div>
            <button className={styles.resetBtn} onClick={reset} id="intent-reset-btn">
              <RotateCcw size={13} /> 다시 선택
            </button>
          </div>

          {/* X축 세부 선택: wide + item-compare 일 때 Y축 기간 선택 */}
          {activeIntent.id === 'item-compare' && profile.numericColumns.length > 1 && (
            <div className={styles.refine}>
              <p className={styles.refineLabel}>어느 기간의 수치를 볼까요?</p>
              <div className={styles.refineRow}>
                {profile.numericColumns.map(col => (
                  <button
                    key={col.name}
                    id={`ysel-${col.name}`}
                    className={`${styles.refineBtn} ${state.yAxes.includes(col.name) ? styles.refineSel : ''}`}
                    onClick={() => {
                      const cur = state.yAxes;
                      dispatch({
                        type: 'SET_Y_AXES',
                        payload: cur.includes(col.name)
                          ? cur.filter(y => y !== col.name)
                          : [...cur, col.name],
                      });
                    }}
                  >
                    {col.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 직접 설정 폴백 */}
      {showManual && (
        <div className={styles.manualWrapper}>
          <div className={styles.manualHeader}>
            <span>⚙️ 직접 설정</span>
            <button className={styles.resetBtn} onClick={reset} id="manual-reset-btn">
              <RotateCcw size={13} /> 의도 다시 선택
            </button>
          </div>
          <ColumnMapper headers={headers} />
        </div>
      )}

      {/* 아직 미선택 */}
      {!selected && (
        <div className={styles.hint}>
          <ChevronRight size={14} /> 위에서 원하는 시각화 방식을 선택해주세요
        </div>
      )}
    </div>
  );
}
