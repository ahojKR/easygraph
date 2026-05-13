'use client';

import { useState, useMemo, useCallback } from 'react';
import { useChart, Row } from '@/context/ChartContext';
import { detectDataSchema, DataSchema } from '@/lib/schemaDetect';
import {
  PeriodDef, aggregateByPeriod, toChartData, buildKPIs
} from '@/lib/periodEngine';
import styles from './AnalysisSetup.module.css';
import { Plus, Trash2, ChevronRight, CheckCircle2, BarChart3 } from 'lucide-react';

const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월',
                     '7월','8월','9월','10월','11월','12월'];

interface Props { onDone: () => void; }

function defaultPeriods(schema: DataSchema): PeriodDef[] {
  const years = schema.col.years;
  if (!years.length) return [];
  const latestYear = years[years.length - 1];
  const prevYear   = years.length >= 2 ? years[years.length - 2] : latestYear;
  const latestCols = schema.col.yearColMap[latestYear] ?? [];
  const lastMonth  = latestCols.length || 7;

  return [
    { id: 'A', label: `Jan–${MONTH_NAMES[Math.min(lastMonth,7)-1]}`,
      year: latestYear, fromMonth: 1, toMonth: Math.min(lastMonth, 7),
      monthCount: Math.min(lastMonth, 7) },
    ...(lastMonth > 7 ? [{
      id: 'B', label: `${MONTH_NAMES[7]}–${MONTH_NAMES[lastMonth-1]}`,
      year: latestYear, fromMonth: 8, toMonth: lastMonth,
      monthCount: lastMonth - 7,
    }] : []),
    ...(prevYear !== latestYear ? [{
      id: 'C', label: `${prevYear} Jan–Jul (전년)`,
      year: prevYear, fromMonth: 1, toMonth: 7, monthCount: 7,
    }] : []),
  ];
}

export default function AnalysisSetup({ onDone }: Props) {
  const { state, dispatch } = useChart();
  const schema = useMemo(
    () => detectDataSchema(state.rawData, state.headers),
    [state.rawData, state.headers]
  );

  const [periods, setPeriods] = useState<PeriodDef[]>(() => defaultPeriods(schema));
  const [useAvg, setUseAvg] = useState(true);
  const [yoyPairs, setYoyPairs] = useState<[string,string][]>([]);
  const [applied, setApplied] = useState(false);

  const years = schema.col.years;

  const addPeriod = () => {
    const id = String.fromCharCode(65 + periods.length);
    const latestYear = years[years.length - 1] ?? new Date().getFullYear();
    setPeriods(prev => [...prev, {
      id, label: `기간 ${id}`, year: latestYear,
      fromMonth: 1, toMonth: 6, monthCount: 6,
    }]);
  };

  const updatePeriod = (idx: number, patch: Partial<PeriodDef>) => {
    setPeriods(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      const updated = { ...p, ...patch };
      updated.monthCount = updated.toMonth - updated.fromMonth + 1;
      return updated;
    }));
    setApplied(false);
  };

  const removePeriod = (idx: number) => {
    setPeriods(prev => prev.filter((_, i) => i !== idx));
    setApplied(false);
  };

  const toggleYoy = (currId: string, prevId: string) => {
    setYoyPairs(prev => {
      const exists = prev.find(([a]) => a === currId);
      if (exists) return prev.filter(([a]) => a !== currId);
      return [...prev, [currId, prevId]];
    });
  };

  const apply = useCallback(() => {
    if (!schema.row.subsidiaryCol || periods.length === 0) return;

    const aggRows = aggregateByPeriod(state.rawData, schema, periods, useAvg);
    const chartPts = toChartData(aggRows, yoyPairs.length ? yoyPairs : undefined);
    const kpis = yoyPairs.length
      ? buildKPIs(aggRows, yoyPairs[0][0], yoyPairs[0][1])
      : [];

    // X축 = "Subsidiary\nPeriod" 복합키, Y축 = categories
    const categories = [...new Set(aggRows.map(r => r.category))];
    const xAxisCol   = 'x';

    // chartPts → Row[] (ChartContext 형식)
    const displayRows: Row[] = chartPts.map(pt => ({ ...pt } as unknown as Row));

    dispatch({ type: 'SET_DISPLAY_DATA', payload: { data: displayRows, transformType: 'none' } });
    dispatch({ type: 'SET_X_AXIS',  payload: xAxisCol });
    dispatch({ type: 'SET_Y_AXES',  payload: categories });
    dispatch({ type: 'SET_CHART_TYPE', payload: 'stacked-bar' });

    // KPI를 별도 필드로 저장 (insight 활용)
    if (kpis.length) {
      const insights = kpis.map(k => ({
        id: k.subsidiary,
        type: 'trend' as const,
        title: k.subsidiary,
        content: `${k.periodA}: ${k.totalA.toLocaleString()} / YoY ${k.yoyGrowth > 0 ? '+' : ''}${k.yoyGrowth}%`,
        value: k.yoyGrowth,
      }));
      dispatch({ type: 'SET_INSIGHTS', payload: insights });
    }

    setApplied(true);
  }, [schema, periods, state.rawData, useAvg, yoyPairs, dispatch]);

  const hasSchema = schema.isHierarchical || schema.row.subsidiaryCol;

  return (
    <div className={styles.root}>
      {/* 스키마 감지 결과 */}
      <div className={styles.banner}>
        <BarChart3 size={16} color="var(--accent-aqua)" />
        <div>
          <strong>데이터 구조 감지 완료</strong>
          {schema.isHierarchical
            ? ` · Subsidiary: ${schema.row.subsidiaries.slice(0,4).join(', ')}${schema.row.subsidiaries.length>4?'…':''}
               · Category: ${schema.row.categories.join('/')}
               · 연도: ${years.join(', ')}`
            : ' · 단순 시계열 구조'
          }
          {schema.hasYoY && <span className={styles.yoyTag}> · YoY 비교 가능</span>}
        </div>
      </div>

      {!hasSchema && (
        <p className={styles.noSchema}>
          Subsidiary/Category 계층 구조를 감지하지 못했습니다. 데이터 정제 단계에서 컬럼명을 재구성해주세요.
        </p>
      )}

      {/* 기간 설정 */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>📅 분석 기간 설정</h3>
        <p className={styles.sectionDesc}>비교할 기간을 정의하세요. 최소 1개, 최대 4개까지 설정할 수 있습니다.</p>

        <div className={styles.periodList}>
          {periods.map((p, idx) => (
            <div key={p.id} className={styles.periodRow}>
              <span className={styles.periodId}>{p.id}</span>

              {/* 기간 이름 */}
              <input
                id={`period-label-${idx}`}
                className={styles.labelInput}
                value={p.label}
                onChange={e => updatePeriod(idx, { label: e.target.value })}
                placeholder="기간 이름 (예: Jan–Jul)"
              />

              {/* 연도 */}
              <select
                id={`period-year-${idx}`}
                className={styles.select}
                value={p.year}
                onChange={e => updatePeriod(idx, { year: Number(e.target.value) })}
              >
                {years.map(y => <option key={y} value={y}>{y}년</option>)}
              </select>

              {/* 월 범위 */}
              <select
                id={`period-from-${idx}`}
                className={styles.select}
                value={p.fromMonth}
                onChange={e => updatePeriod(idx, { fromMonth: Number(e.target.value) })}
              >
                {MONTH_NAMES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
              <span className={styles.dash}>~</span>
              <select
                id={`period-to-${idx}`}
                className={styles.select}
                value={p.toMonth}
                onChange={e => updatePeriod(idx, { toMonth: Number(e.target.value) })}
              >
                {MONTH_NAMES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>

              <span className={styles.monthCount}>{p.monthCount}개월</span>

              <button
                className={styles.removeBtn}
                onClick={() => removePeriod(idx)}
                title="기간 삭제"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {periods.length < 4 && (
          <button className={styles.addBtn} onClick={addPeriod} id="add-period-btn">
            <Plus size={13} /> 기간 추가
          </button>
        )}
      </section>

      {/* YoY 비교 설정 */}
      {schema.hasYoY && periods.length >= 2 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>📊 YoY 비교 설정</h3>
          <p className={styles.sectionDesc}>어떤 기간끼리 성장률을 비교할까요?</p>
          <div className={styles.yoyRows}>
            {periods.slice(0, -1).map((curr, i) => {
              const prev = periods[i + 1];
              const isOn = yoyPairs.some(([a]) => a === curr.id);
              return (
                <label key={curr.id} className={styles.yoyRow}>
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() => toggleYoy(curr.id, prev.id)}
                    id={`yoy-${curr.id}-${prev.id}`}
                  />
                  <span>
                    <strong>{curr.label}</strong> vs <strong>{prev.label}</strong> → YoY 성장률 표시
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      )}

      {/* 집계 방식 */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>🔢 수치 기준</h3>
        <div className={styles.pills}>
          <button
            id="mode-avg"
            className={`${styles.pill} ${useAvg ? styles.pillOn : ''}`}
            onClick={() => { setUseAvg(true); setApplied(false); }}
          >
            월 평균 (÷ 기간 월수)
          </button>
          <button
            id="mode-sum"
            className={`${styles.pill} ${!useAvg ? styles.pillOn : ''}`}
            onClick={() => { setUseAvg(false); setApplied(false); }}
          >
            기간 합계
          </button>
        </div>
      </section>

      {/* 적용 버튼 */}
      <div className={styles.footer}>
        {applied && (
          <span className={styles.appliedMsg}>
            <CheckCircle2 size={14} color="var(--accent-green)" /> 분석 설정 적용 완료
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          id="apply-analysis-btn"
          className="btn btn-secondary"
          onClick={apply}
          disabled={periods.length === 0}
        >
          설정 미리보기
        </button>
        <button
          id="analysis-done-btn"
          className="btn btn-primary"
          onClick={() => { apply(); onDone(); }}
          disabled={periods.length === 0}
        >
          차트 생성 <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
