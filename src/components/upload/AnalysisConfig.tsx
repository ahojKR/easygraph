'use client';

import { useState, useMemo } from 'react';
import { useChart, ChartType } from '@/context/ChartContext';
import { ColumnDef, Row } from '@/context/ChartContext';
import { enrichData } from '@/lib/statistics';
import styles from './AnalysisConfig.module.css';
import MiniChartPreview from './MiniChartPreview';

interface Props { headers: ColumnDef[] }

interface WizardState {
  yAxes: string[];
  valueMode: 'raw' | 'rolling3' | 'rolling6' | 'rolling12' | 'ytd';
  groupBy: string;
  chartType: ChartType;
  showMoM: boolean;
  showTarget: boolean;
  targetValue: string;
}

const QUESTIONS = [
  { id: 'yAxes',     title: '어떤 수치를 보고 싶으세요?',         desc: '차트에 표시할 데이터 항목을 선택하세요 (복수 선택 가능)' },
  { id: 'valueMode', title: '수치를 어떻게 표현할까요?',           desc: '원본 그대로 볼지, 평균화하여 부드럽게 볼지 선택하세요' },
  { id: 'groupBy',   title: '데이터를 어떻게 구분할까요?',         desc: '제품별·지역별 등 항목마다 별도 선/막대로 분리할 수 있습니다' },
  { id: 'chartType', title: '어떤 형태의 그래프로 보여드릴까요?',   desc: '데이터 성격에 맞는 그래프 유형을 선택하세요' },
  { id: 'extras',    title: '추가로 표시할 것이 있나요?',           desc: '전월 증감, 목표값 기준선 등을 함께 표시할 수 있습니다' },
];

const VALUE_MODES = [
  { id: 'raw',       icon: '📊', label: '원본 수치',        desc: '데이터 값 그대로 표시' },
  { id: 'rolling3',  icon: '〰️', label: '3개월 이동평균',   desc: '최근 3기간 평균으로 평활화' },
  { id: 'rolling6',  icon: '〰️', label: '6개월 이동평균',   desc: '최근 6기간 평균으로 평활화' },
  { id: 'rolling12', icon: '〰️', label: '12개월 이동평균',  desc: '최근 12기간 평균으로 평활화' },
  { id: 'ytd',       icon: '📈', label: '누적 평균 (YTD)',  desc: '원본값 + 누적평균선 동시 표시' },
];

const CHART_TYPES: { type: ChartType; icon: string; label: string; desc: string }[] = [
  { type: 'line',        icon: '📈', label: '라인',     desc: '추이·트렌드 파악' },
  { type: 'bar',         icon: '📊', label: '막대',     desc: '기간별 수치 비교' },
  { type: 'stacked-bar', icon: '▦',  label: '누적막대', desc: '구성 비율 표현' },
  { type: 'area',        icon: '🏔', label: '면적',     desc: '누적 흐름 시각화' },
  { type: 'combo',       icon: '🔀', label: '콤보',     desc: '라인 + 막대 혼합' },
  { type: 'pie',         icon: '🥧', label: '파이',     desc: '전체 중 비율 분포' },
  { type: 'donut',       icon: '🍩', label: '도넛',     desc: '중심 강조 비율' },
  { type: 'radar',       icon: '🕸', label: '레이더',   desc: '다차원 항목 비교' },
];

export default function AnalysisConfig({ headers }: Props) {
  const { state, dispatch } = useChart();
  const [qIdx, setQIdx] = useState(0);
  const numericCols = headers.filter(h => h.type === 'number');
  const categoryCols = headers.filter(h => h.type === 'category' || h.type === 'date');

  const [wiz, setWiz] = useState<WizardState>({
    yAxes: state.yAxes.length ? state.yAxes : (numericCols[0] ? [numericCols[0].name] : []),
    valueMode: 'raw',
    groupBy: '',
    chartType: 'line',
    showMoM: true,
    showTarget: false,
    targetValue: '',
  });

  const setW = <K extends keyof WizardState>(k: K, v: WizardState[K]) =>
    setWiz(prev => ({ ...prev, [k]: v }));

  const toggleYAxis = (name: string) => {
    setWiz(prev => ({
      ...prev,
      yAxes: prev.yAxes.includes(name)
        ? prev.yAxes.filter(y => y !== name)
        : [...prev.yAxes, name],
    }));
  };

  // Build enriched preview data from current wizard state
  const previewData: Row[] = useMemo(() => {
    if (!state.rawData.length || !state.xAxis || !wiz.yAxes.length) return [];
    const rolling = wiz.valueMode.startsWith('rolling');
    const n = rolling ? parseInt(wiz.valueMode.replace('rolling', '')) : 3;
    return enrichData(state.rawData, state.xAxis, wiz.yAxes, {
      ytdAvg: wiz.valueMode === 'ytd',
      rollingAvg: rolling,
      rollingN: n,
    });
  }, [state.rawData, state.xAxis, wiz.yAxes, wiz.valueMode]);

  // Apply all wizard selections to global state
  const applyAll = () => {
    const rolling = wiz.valueMode.startsWith('rolling');
    const n = rolling ? parseInt(wiz.valueMode.replace('rolling', '')) : 3;
    dispatch({ type: 'SET_Y_AXES', payload: wiz.yAxes });
    dispatch({ type: 'SET_GROUP_BY', payload: wiz.groupBy });
    dispatch({ type: 'SET_CHART_TYPE', payload: wiz.chartType });
    dispatch({
      type: 'UPDATE_OPTIONS', payload: {
        showRollingAverage: rolling,
        rollingAveragePeriod: n,
        showCumulativeAverage: wiz.valueMode === 'ytd',
        showMoMChange: wiz.showMoM,
        showTargetLine: wiz.showTarget,
        targetValue: wiz.targetValue ? Number(wiz.targetValue) : null,
      },
    });
  };

  const canNext = () => {
    if (qIdx === 0) return wiz.yAxes.length > 0;
    return true;
  };

  const summaryChips = [
    wiz.yAxes.length ? `📌 ${wiz.yAxes.join(', ')}` : null,
    VALUE_MODES.find(v => v.id === wiz.valueMode)?.label ?? null,
    wiz.groupBy ? `${wiz.groupBy}별 구분` : '전체 합산',
    CHART_TYPES.find(c => c.type === wiz.chartType)?.label + ' 차트',
    wiz.showMoM ? '전월 증감' : null,
    wiz.showTarget && wiz.targetValue ? `목표 ${Number(wiz.targetValue).toLocaleString()}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className={styles.wizardRoot}>
      {/* LEFT: wizard */}
      <div className={styles.wizardLeft}>
        {/* Progress dots */}
        <div className={styles.progressDots}>
          {QUESTIONS.map((q, i) => (
            <div key={q.id} className={`${styles.dot} ${i === qIdx ? styles.dotActive : ''} ${i < qIdx ? styles.dotDone : ''}`} />
          ))}
        </div>

        {/* Question */}
        <div className={`${styles.question} animate-fadeIn`} key={qIdx}>
          <p className={styles.qStep}>{qIdx + 1} / {QUESTIONS.length}</p>
          <h2 className={styles.qTitle}>{QUESTIONS[qIdx].title}</h2>
          <p className={styles.qDesc}>{QUESTIONS[qIdx].desc}</p>

          {/* Q1: Y축 선택 */}
          {qIdx === 0 && (
            <div className={styles.optionList}>
              {numericCols.map(col => (
                <button
                  key={col.name}
                  id={`q-yaxis-${col.name}`}
                  className={`${styles.optBtn} ${wiz.yAxes.includes(col.name) ? styles.optSelected : ''}`}
                  onClick={() => toggleYAxis(col.name)}
                >
                  <span className={styles.optCheck}>{wiz.yAxes.includes(col.name) ? '✓' : ''}</span>
                  <span className={styles.optLabel}>{col.name}</span>
                  <span className={styles.optTag}>숫자형</span>
                </button>
              ))}
              {numericCols.length === 0 && <p className={styles.empty}>숫자형 컬럼이 없습니다. 이전 단계에서 Y축을 설정해주세요.</p>}
            </div>
          )}

          {/* Q2: 수치 표현 방식 */}
          {qIdx === 1 && (
            <div className={styles.optionList}>
              {VALUE_MODES.map(vm => (
                <button
                  key={vm.id}
                  id={`q-value-${vm.id}`}
                  className={`${styles.optBtn} ${wiz.valueMode === vm.id ? styles.optSelected : ''}`}
                  onClick={() => setW('valueMode', vm.id as WizardState['valueMode'])}
                >
                  <span style={{ fontSize: '1.2rem' }}>{vm.icon}</span>
                  <span className={styles.optLabel}>{vm.label}</span>
                  <span className={styles.optDesc}>{vm.desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* Q3: 그룹 기준 */}
          {qIdx === 2 && (
            <div className={styles.optionList}>
              <button
                id="q-group-none"
                className={`${styles.optBtn} ${wiz.groupBy === '' ? styles.optSelected : ''}`}
                onClick={() => setW('groupBy', '')}
              >
                <span className={styles.optCheck}>{wiz.groupBy === '' ? '✓' : ''}</span>
                <span className={styles.optLabel}>전체 합산</span>
                <span className={styles.optDesc}>구분 없이 하나의 선/막대로 표시</span>
              </button>
              {categoryCols.map(col => (
                <button
                  key={col.name}
                  id={`q-group-${col.name}`}
                  className={`${styles.optBtn} ${wiz.groupBy === col.name ? styles.optSelected : ''}`}
                  onClick={() => setW('groupBy', col.name)}
                >
                  <span className={styles.optCheck}>{wiz.groupBy === col.name ? '✓' : ''}</span>
                  <span className={styles.optLabel}>{col.name}별</span>
                  <span className={styles.optDesc}>{col.name} 항목마다 별도 계열로 분리</span>
                </button>
              ))}
            </div>
          )}

          {/* Q4: 차트 유형 */}
          {qIdx === 3 && (
            <div className={styles.chartTypeGrid}>
              {CHART_TYPES.map(ct => (
                <button
                  key={ct.type}
                  id={`q-chart-${ct.type}`}
                  className={`${styles.chartTypeBtn} ${wiz.chartType === ct.type ? styles.optSelected : ''}`}
                  onClick={() => setW('chartType', ct.type)}
                >
                  <span className={styles.ctIcon}>{ct.icon}</span>
                  <span className={styles.ctLabel}>{ct.label}</span>
                  <span className={styles.ctDesc}>{ct.desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* Q5: 추가 옵션 */}
          {qIdx === 4 && (
            <div className={styles.extraList}>
              <label className={styles.extraRow} htmlFor="q-mom">
                <input id="q-mom" type="checkbox" checked={wiz.showMoM} onChange={e => setW('showMoM', e.target.checked)} />
                <div>
                  <span className={styles.extraLabel}>전월 대비 증감 배지 표시</span>
                  <span className={styles.extraDesc}>각 기간 위에 ↑ +12.3% 형식으로 변화율 표시</span>
                </div>
              </label>
              <label className={styles.extraRow} htmlFor="q-target">
                <input id="q-target" type="checkbox" checked={wiz.showTarget} onChange={e => setW('showTarget', e.target.checked)} />
                <div>
                  <span className={styles.extraLabel}>목표값 기준선 추가</span>
                  <span className={styles.extraDesc}>달성 목표 수치를 가로선으로 표시</span>
                </div>
              </label>
              {wiz.showTarget && (
                <div className={styles.targetRow}>
                  <label className={styles.targetLbl}>목표값</label>
                  <input
                    id="q-target-value"
                    type="number"
                    className="input"
                    style={{ maxWidth: 180, fontSize: '0.9rem', padding: '8px 12px' }}
                    placeholder="예: 5000"
                    value={wiz.targetValue}
                    onChange={e => setW('targetValue', e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className={styles.nav}>
          {qIdx > 0 && (
            <button className="btn btn-secondary" onClick={() => setQIdx(q => q - 1)} id="wizard-prev">
              ← 이전
            </button>
          )}
          <div style={{ flex: 1 }} />
          {qIdx < QUESTIONS.length - 1 ? (
            <button
              className="btn btn-primary"
              disabled={!canNext()}
              onClick={() => setQIdx(q => q + 1)}
              id="wizard-next"
            >
              다음 →
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={applyAll}
              id="apply-config-btn"
              style={{ background: 'var(--gradient-success)' }}
            >
              ✅ 이 설정으로 적용
            </button>
          )}
        </div>

        {/* Summary chips */}
        {summaryChips.length > 0 && (
          <div className={styles.summaryChips}>
            {summaryChips.map((c, i) => (
              <span key={i} className={styles.chip}>{c}</span>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: live chart preview */}
      <div className={styles.wizardRight}>
        <div className={styles.previewLabel}>
          <span>📊</span> 실시간 미리보기
        </div>
        <MiniChartPreview
          data={previewData}
          xAxis={state.xAxis}
          yAxes={wiz.yAxes}
          chartType={wiz.chartType}
          valueMode={wiz.valueMode}
          showMoM={wiz.showMoM}
        />
        <div className={styles.previewHint}>
          선택에 따라 그래프가 실시간으로 업데이트됩니다
        </div>
      </div>
    </div>
  );
}
