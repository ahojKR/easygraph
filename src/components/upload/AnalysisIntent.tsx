'use client';

import { useState, useMemo, useEffect } from 'react';
import { useChart } from '@/context/ChartContext';
import { detectDataSchema } from '@/lib/schemaDetect';
import { aggregateByPeriod, toChartData, buildKPIs, PeriodDef } from '@/lib/periodEngine';
import { generateInsights } from '@/lib/insightEngine';
import { Row } from '@/context/ChartContext';
import styles from './AnalysisIntent.module.css';
import { ChevronRight } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface Props { onDone: () => void; }

type CompBasis = 'yoy' | 'mom' | 'none';
type PeriodType = 'monthly' | 'quarterly' | 'semi' | 'custom';
type GroupBy = 'subsidiary' | 'total';

export default function AnalysisIntent({ onDone }: Props) {
  const { state, dispatch } = useChart();

  const schema = useMemo(
    () => detectDataSchema(state.rawData, state.headers),
    [state.rawData, state.headers]
  );

  const allCategories = schema.row.categories.length
    ? schema.row.categories
    : ['HS', 'ES', 'MS'];

  // ── 상태 ────────────────────────────────────────────
  const [basis,      setBasis]      = useState<CompBasis>('yoy');
  const [periodType, setPeriodType] = useState<PeriodType>('custom');
  const [customFrom, setCustomFrom] = useState(1);
  const [customTo,   setCustomTo]   = useState(7);
  const [prevFrom,   setPrevFrom]   = useState(1);
  const [prevTo,     setPrevTo]     = useState(7);
  const [enablePrev, setEnablePrev] = useState(true);
  const [categories, setCategories] = useState<string[]>(allCategories);
  const [groupBy,    setGroupBy]    = useState<GroupBy>('subsidiary');

  // 연도 자동 감지
  const years = schema.col.years;
  const latestYear = years[years.length - 1] ?? new Date().getFullYear();
  const prevYear   = years.length >= 2 ? years[years.length - 2] : latestYear - 1;

  // 카테고리 토글
  const toggleCat = (c: string) =>
    setCategories(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );

  // 기간 라벨
  const periodALabel = periodType === 'monthly'   ? '월별'
                     : periodType === 'quarterly' ? '분기별'
                     : periodType === 'semi'      ? '상반기 / 하반기'
                     : `${MONTHS[customFrom-1]}–${MONTHS[customTo-1]}`;

  // ── 적용 ─────────────────────────────────────────────
  const apply = () => {
    const hasCats = categories.length > 0 && schema.isHierarchical;

    if (hasCats) {
      // 계층형 데이터
      let periods: PeriodDef[] = [];

      if (periodType === 'monthly') {
        const mCols = schema.col.monthCols.slice(0, 12);
        const monthData: Row[] = mCols.map(col => {
          const row: Row = { 기간: col };
          allCategories.forEach(cat => {
            row[cat] = state.rawData
              .filter(r => String(r[schema.row.categoryCol!] ?? '') === cat)
              .reduce((s, r) => s + (Number(r[col]) || 0), 0);
          });
          return row;
        });
        dispatch({ type: 'SET_DISPLAY_DATA', payload: { data: monthData, transformType: 'none' } });
        dispatch({ type: 'SET_X_AXIS',  payload: '기간' });
        dispatch({ type: 'SET_Y_AXES',  payload: categories });
        dispatch({ type: 'SET_CHART_TYPE', payload: 'line' });
        dispatch({ type: 'UPDATE_OPTIONS', payload: { colorScheme: 'default', stacked: false } });
        dispatch({ type: 'SET_INSIGHTS', payload: [] });
        onDone(); return;
      }

      if (periodType === 'quarterly') {
        periods = [
          { id:'Q1', label:'Q1', year: latestYear, fromMonth:1,  toMonth:3,  monthCount:3 },
          { id:'Q2', label:'Q2', year: latestYear, fromMonth:4,  toMonth:6,  monthCount:3 },
          { id:'Q3', label:'Q3', year: latestYear, fromMonth:7,  toMonth:9,  monthCount:3 },
          { id:'Q4', label:'Q4', year: latestYear, fromMonth:10, toMonth:12, monthCount:3 },
        ];
      } else if (periodType === 'semi') {
        periods = [
          { id:'H1', label:'상반기', year: latestYear, fromMonth:1, toMonth:6,  monthCount:6 },
          { id:'H2', label:'하반기', year: latestYear, fromMonth:7, toMonth:12, monthCount:6 },
        ];
      } else {
        // custom
        periods = [
          { id:'A', label: `${latestYear} ${MONTHS[customFrom-1]}–${MONTHS[customTo-1]}`,
            year: latestYear, fromMonth: customFrom, toMonth: customTo,
            monthCount: customTo - customFrom + 1 },
        ];
        if (basis === 'yoy' && enablePrev) {
          periods.push({
            id:'B', label: `${prevYear} ${MONTHS[prevFrom-1]}–${MONTHS[prevTo-1]} (전년)`,
            year: prevYear, fromMonth: prevFrom, toMonth: prevTo,
            monthCount: prevTo - prevFrom + 1,
          });
        }
      }

      const yoyPairs: [string,string][] = basis === 'yoy' && periods.length >= 2
        ? [[periods[0].id, periods[periods.length-1].id]] : [];

      const aggRows  = aggregateByPeriod(state.rawData, schema, periods, true);
      const chartPts = toChartData(aggRows, yoyPairs.length ? yoyPairs : undefined);
      const kpis     = yoyPairs.length
        ? buildKPIs(aggRows, yoyPairs[0][0], yoyPairs[0][1]) : [];

      const dispCategories = categories.filter(c => allCategories.includes(c));
      const displayRows: Row[] = chartPts.map(pt => ({ ...pt } as unknown as Row));

      dispatch({ type: 'SET_DISPLAY_DATA', payload: { data: displayRows, transformType: 'none' } });
      dispatch({ type: 'SET_X_AXIS',  payload: 'x' });
      dispatch({ type: 'SET_Y_AXES',  payload: dispCategories });
      dispatch({ type: 'SET_CHART_TYPE', payload: 'stacked-bar' });
      dispatch({ type: 'UPDATE_OPTIONS', payload: { colorScheme: 'bw', stacked: true } });

      if (kpis.length) {
        const insights = generateInsights(kpis, aggRows, periods[0].label, periods[1]?.label);
        dispatch({ type: 'SET_INSIGHTS', payload: insights });
      }

    } else {
      // 단순 데이터
      const numCols = state.headers.filter(h => h.type === 'number').map(h => h.name);
      const catCol  = state.headers.find(h => h.type !== 'number')?.name ?? numCols[0];
      dispatch({ type: 'SET_DISPLAY_DATA', payload: { data: state.rawData, transformType: 'none' } });
      dispatch({ type: 'SET_X_AXIS',  payload: catCol });
      dispatch({ type: 'SET_Y_AXES',  payload: numCols.slice(0, 5) });
      dispatch({ type: 'SET_CHART_TYPE', payload: 'bar' });
      dispatch({ type: 'UPDATE_OPTIONS', payload: { colorScheme: 'default', stacked: false } });
    }

    onDone();
  };

  return (
    <div className={styles.root}>
      <div className={styles.grid}>

        {/* ① 비교 기준 */}
        <div className={styles.card}>
          <div className={styles.cardNum}>1</div>
          <h3 className={styles.cardTitle}>비교 기준</h3>
          <div className={styles.radioGroup}>
            {(['yoy','mom','none'] as CompBasis[]).map(v => (
              <label key={v} className={`${styles.radioRow} ${basis===v ? styles.radioOn : ''}`}>
                <input type="radio" name="basis" value={v}
                  checked={basis===v} onChange={() => setBasis(v)} />
                <div>
                  <span className={styles.radioLabel}>
                    {v==='yoy' ? '📅 YoY (전년 대비)' : v==='mom' ? '📆 MoM (전월 대비)' : '📊 비교 없음'}
                  </span>
                  <span className={styles.radioDesc}>
                    {v==='yoy' ? '전년 동기간과 성장률 비교' : v==='mom' ? '직전 월과 증감 비교' : '단순 기간 내 수치 표시'}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ② 분석 기간 */}
        <div className={styles.card}>
          <div className={styles.cardNum}>2</div>
          <h3 className={styles.cardTitle}>분석 기간</h3>
          <div className={styles.radioGroup}>
            {(['monthly','quarterly','semi','custom'] as PeriodType[]).map(v => (
              <label key={v} className={`${styles.radioRow} ${periodType===v ? styles.radioOn : ''}`}>
                <input type="radio" name="period" value={v}
                  checked={periodType===v} onChange={() => setPeriodType(v)} />
                <span className={styles.radioLabel}>
                  {v==='monthly' ? '월별' : v==='quarterly' ? '분기별' : v==='semi' ? '반기별' : 'Custom 기간'}
                </span>
              </label>
            ))}
          </div>

          {periodType === 'custom' && (
            <div className={styles.customRange}>
              <div className={styles.customRow}>
                <span className={styles.customLbl}>현재 기간</span>
                <select className={styles.sel} value={customFrom}
                  onChange={e => setCustomFrom(Number(e.target.value))}>
                  {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <span>~</span>
                <select className={styles.sel} value={customTo}
                  onChange={e => setCustomTo(Number(e.target.value))}>
                  {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
              {basis === 'yoy' && (
                <>
                  <label className={styles.prevToggle}>
                    <input type="checkbox" checked={enablePrev}
                      onChange={e => setEnablePrev(e.target.checked)} />
                    전년 비교 구간 설정
                  </label>
                  {enablePrev && (
                    <div className={styles.customRow}>
                      <span className={styles.customLbl}>전년 기간</span>
                      <select className={styles.sel} value={prevFrom}
                        onChange={e => setPrevFrom(Number(e.target.value))}>
                        {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                      </select>
                      <span>~</span>
                      <select className={styles.sel} value={prevTo}
                        onChange={e => setPrevTo(Number(e.target.value))}>
                        {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ③ 분석 대상 */}
        <div className={styles.card}>
          <div className={styles.cardNum}>3</div>
          <h3 className={styles.cardTitle}>분석 대상 (Category)</h3>
          <p className={styles.cardDesc}>데이터에서 감지된 카테고리입니다</p>
          <div className={styles.checkGroup}>
            {allCategories.map(c => (
              <label key={c} className={`${styles.checkRow} ${categories.includes(c) ? styles.checkOn : ''}`}>
                <input type="checkbox" checked={categories.includes(c)}
                  onChange={() => toggleCat(c)} />
                <span className={styles.checkLabel}>{c}</span>
              </label>
            ))}
          </div>
          {allCategories.length === 0 && (
            <p className={styles.noDetect}>카테고리를 감지하지 못했습니다</p>
          )}
        </div>

        {/* ④ 그룹 단위 */}
        <div className={styles.card}>
          <div className={styles.cardNum}>4</div>
          <h3 className={styles.cardTitle}>그룹 단위</h3>
          <div className={styles.radioGroup}>
            <label className={`${styles.radioRow} ${groupBy==='subsidiary' ? styles.radioOn : ''}`}>
              <input type="radio" name="group" value="subsidiary"
                checked={groupBy==='subsidiary'} onChange={() => setGroupBy('subsidiary')} />
              <div>
                <span className={styles.radioLabel}>🏢 Subsidiary별</span>
                <span className={styles.radioDesc}>
                  {schema.row.subsidiaries.slice(0,4).join(', ')}{schema.row.subsidiaries.length > 4 ? '…' : ''}
                </span>
              </div>
            </label>
            <label className={`${styles.radioRow} ${groupBy==='total' ? styles.radioOn : ''}`}>
              <input type="radio" name="group" value="total"
                checked={groupBy==='total'} onChange={() => setGroupBy('total')} />
              <div>
                <span className={styles.radioLabel}>🌐 전체 합계</span>
                <span className={styles.radioDesc}>Subsidiary를 합쳐서 봅니다</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* 설정 요약 */}
      <div className={styles.summary}>
        <span className={styles.summaryIcon}>✨</span>
        <span>
          <strong>{periodALabel}</strong> 기준 /&nbsp;
          <strong>{basis === 'yoy' ? 'YoY 비교' : basis === 'mom' ? 'MoM 비교' : '단순 표시'}</strong> /&nbsp;
          <strong>{categories.join(' + ')}</strong> /&nbsp;
          <strong>{groupBy === 'subsidiary' ? 'Subsidiary별' : '전체 합산'}</strong>
        </span>
      </div>

      {/* 하단 CTA */}
      <div className={styles.footer}>
        <div style={{ flex: 1 }} />
        <button
          id="intent-apply-btn"
          className="btn btn-primary"
          onClick={apply}
          disabled={categories.length === 0}
        >
          차트 미리보기 <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
