'use client';

import { useState, useMemo } from 'react';
import { useChart } from '@/context/ChartContext';
import { detectDataSchema } from '@/lib/schemaDetect';
import { aggregateByPeriod, toChartData, buildKPIs, PeriodDef } from '@/lib/periodEngine';
import { generateInsights } from '@/lib/insightEngine';
import { Row } from '@/context/ChartContext';
import styles from './AnalysisIntent.module.css';
import { ChevronRight } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface Props { onDone: () => void; }

type CompBasis  = 'yoy' | 'mom' | 'none' | 'pct';
type PeriodType = 'monthly' | 'quarterly' | 'semi' | 'custom';
type GroupBy    = 'subsidiary' | 'total';
type ChartOrient = 'year-stacked' | 'item-bar';

export default function AnalysisIntent({ onDone }: Props) {
  const { state, dispatch } = useChart();

  const schema = useMemo(
    () => detectDataSchema(state.rawData, state.headers),
    [state.rawData, state.headers]
  );

  const isCrossTab     = schema.isCrossTab && !!schema.crossTab;
  const isHierarchical = schema.isHierarchical;

  // ── CrossTab 전용 상태 ─────────────────────────────────
  const allValueCols   = schema.crossTab?.valueCols   ?? [];
  const allRowItems    = schema.crossTab?.rowItems     ?? [];
  const rowLabelCol    = schema.crossTab?.rowLabelCol  ?? '';

  const [selectedCols,   setSelectedCols]   = useState<string[]>(allValueCols);
  const [selectedItems,  setSelectedItems]  = useState<string[]>(allRowItems);
  const [ctBasis,        setCtBasis]        = useState<'pct' | 'abs' | 'yoy'>('pct');
  const [chartOrient,    setChartOrient]    = useState<ChartOrient>('year-stacked');

  // ── Hierarchical 전용 상태 ─────────────────────────────
  const allCategories = schema.row.categories.length
    ? schema.row.categories : ['HS', 'ES', 'MS'];
  const years       = schema.col.years;
  const latestYear  = years[years.length - 1] ?? new Date().getFullYear();
  const prevYear    = years.length >= 2 ? years[years.length - 2] : latestYear - 1;

  const [basis,      setBasis]      = useState<CompBasis>('yoy');
  const [periodType, setPeriodType] = useState<PeriodType>('custom');
  const [customFrom, setCustomFrom] = useState(1);
  const [customTo,   setCustomTo]   = useState(7);
  const [prevFrom,   setPrevFrom]   = useState(1);
  const [prevTo,     setPrevTo]     = useState(7);
  const [enablePrev, setEnablePrev] = useState(true);
  const [categories, setCategories] = useState<string[]>(allCategories);
  const [groupBy,    setGroupBy]    = useState<GroupBy>('subsidiary');

  // ── 토글 유틸 ─────────────────────────────────────────
  const toggleArr = (arr: string[], v: string, setFn: (a: string[]) => void) =>
    setFn(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  // ── CrossTab Apply ─────────────────────────────────────
  const applyCrossTab = () => {
    const cols  = selectedCols.length  ? selectedCols  : allValueCols;
    const items = selectedItems.length ? selectedItems : allRowItems;

    // 필터링된 rawData
    const filtered = state.rawData.filter(r =>
      items.includes(String(r[rowLabelCol] ?? '').trim())
    );

    if (chartOrient === 'year-stacked') {
      // X축 = 연도(컬럼), Y축 = 항목(행)  →  각 연도별로 항목 합산한 하나의 포인트
      const dataByYear: Row[] = cols.map(col => {
        const pt: Row = { 기간: col };
        const total = items.reduce((s, it) => {
          const row = filtered.find(r => String(r[rowLabelCol] ?? '').trim() === it);
          return s + (Number(row?.[col]) || 0);
        }, 0);

        items.forEach(it => {
          const row = filtered.find(r => String(r[rowLabelCol] ?? '').trim() === it);
          const val = Number(row?.[col]) || 0;
          pt[it] = ctBasis === 'pct' && total > 0
            ? Math.round((val / total) * 1000) / 10
            : val;
        });
        if (ctBasis === 'pct') pt._총합 = 100;
        return pt;
      });

      dispatch({ type: 'SET_DISPLAY_DATA', payload: { data: dataByYear, transformType: ctBasis === 'pct' ? 'col-pct' : 'none' } });
      dispatch({ type: 'SET_X_AXIS',     payload: '기간' });
      dispatch({ type: 'SET_Y_AXES',     payload: items });
      dispatch({ type: 'SET_CHART_TYPE', payload: 'stacked-bar' });
      dispatch({ type: 'UPDATE_OPTIONS', payload: { colorScheme: 'bw', stacked: true, showDataLabels: ctBasis === 'pct' } });

    } else {
      // X축 = 항목(행), Y축 = 연도(컬럼)  →  국가별 막대
      const dataByItem: Row[] = items.map(it => {
        const row = filtered.find(r => String(r[rowLabelCol] ?? '').trim() === it);
        const pt: Row = { 항목: it };
        cols.forEach(col => {
          pt[col] = row ? (Number(row[col]) || 0) : 0;
        });
        return pt;
      });

      dispatch({ type: 'SET_DISPLAY_DATA', payload: { data: dataByItem, transformType: 'none' } });
      dispatch({ type: 'SET_X_AXIS',     payload: '항목' });
      dispatch({ type: 'SET_Y_AXES',     payload: cols });
      dispatch({ type: 'SET_CHART_TYPE', payload: 'stacked-bar' });
      dispatch({ type: 'UPDATE_OPTIONS', payload: { colorScheme: 'default', stacked: true, showDataLabels: false } });
    }

    // YoY 인사이트
    if (ctBasis === 'yoy' && cols.length >= 2) {
      const lastCol = cols[cols.length - 1];
      const prevCol = cols[cols.length - 2];
      const insights = items.map(it => {
        const row = filtered.find(r => String(r[rowLabelCol] ?? '').trim() === it);
        const cur = Number(row?.[lastCol]) || 0;
        const prv = Number(row?.[prevCol]) || 0;
        const yoy = prv > 0 ? Math.round(((cur - prv) / prv) * 1000) / 10 : 0;
        return { id: it, type: 'trend' as const, title: it, content: `${lastCol}: ${cur} / YoY ${yoy > 0 ? '+' : ''}${yoy}%`, value: yoy, severity: (yoy >= 0 ? 'positive' : 'warning') as 'positive' | 'warning' };
      });
      dispatch({ type: 'SET_INSIGHTS', payload: insights });
    }

    onDone();
  };

  // ── Hierarchical Apply ────────────────────────────────
  const applyHierarchical = () => {
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
      dispatch({ type: 'SET_X_AXIS',     payload: '기간' });
      dispatch({ type: 'SET_Y_AXES',     payload: categories });
      dispatch({ type: 'SET_CHART_TYPE', payload: 'line' });
      dispatch({ type: 'UPDATE_OPTIONS', payload: { colorScheme: 'default', stacked: false } });
      dispatch({ type: 'SET_INSIGHTS',   payload: [] });
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
      periods = [
        { id:'A', label:`${latestYear} ${MONTHS[customFrom-1]}–${MONTHS[customTo-1]}`,
          year: latestYear, fromMonth: customFrom, toMonth: customTo,
          monthCount: customTo - customFrom + 1 },
      ];
      if (basis === 'yoy' && enablePrev) {
        periods.push({
          id:'B', label:`${prevYear} ${MONTHS[prevFrom-1]}–${MONTHS[prevTo-1]} (전년)`,
          year: prevYear, fromMonth: prevFrom, toMonth: prevTo,
          monthCount: prevTo - prevFrom + 1,
        });
      }
    }

    const yoyPairs: [string,string][] = basis === 'yoy' && periods.length >= 2
      ? [[periods[0].id, periods[periods.length-1].id]] : [];

    const aggRows  = aggregateByPeriod(state.rawData, schema, periods, true);
    const chartPts = toChartData(aggRows, yoyPairs.length ? yoyPairs : undefined);
    const kpis     = yoyPairs.length ? buildKPIs(aggRows, yoyPairs[0][0], yoyPairs[0][1]) : [];
    const dispCategories = categories.filter(c => allCategories.includes(c));
    const displayRows: Row[] = chartPts.map(pt => ({ ...pt } as unknown as Row));

    dispatch({ type: 'SET_DISPLAY_DATA', payload: { data: displayRows, transformType: 'none' } });
    dispatch({ type: 'SET_X_AXIS',     payload: 'x' });
    dispatch({ type: 'SET_Y_AXES',     payload: dispCategories });
    dispatch({ type: 'SET_CHART_TYPE', payload: 'stacked-bar' });
    dispatch({ type: 'UPDATE_OPTIONS', payload: { colorScheme: 'bw', stacked: true } });

    if (kpis.length) {
      const insights = generateInsights(kpis, aggRows, periods[0].label, periods[1]?.label);
      dispatch({ type: 'SET_INSIGHTS', payload: insights });
    }
    onDone();
  };

  // ── 설정 요약 텍스트 ──────────────────────────────────
  const summaryText = isCrossTab
    ? `${selectedCols.join(' / ')} 기준 / ${ctBasis === 'pct' ? '비중(%)' : ctBasis === 'yoy' ? 'YoY' : '절대값'} / ${selectedItems.length}개 항목 / ${chartOrient === 'year-stacked' ? '연도별 누적' : '항목별 비교'}`
    : `${periodType === 'custom' ? `${MONTHS[customFrom-1]}–${MONTHS[customTo-1]}` : periodType} 기준 / ${basis === 'yoy' ? 'YoY 비교' : basis === 'mom' ? 'MoM' : '단순 표시'} / ${categories.join(' + ')} / ${groupBy === 'subsidiary' ? 'Subsidiary별' : '전체'}`;

  return (
    <div className={styles.root}>
      <div className={styles.grid}>

        {/* ═══════════════════════════════════════════════════════
            크로스탭 데이터 UI  (국가×연도 등)
        ═══════════════════════════════════════════════════════ */}
        {isCrossTab && (<>
          {/* ① 표시 방식 */}
          <div className={styles.card}>
            <div className={styles.cardNum}>1</div>
            <h3 className={styles.cardTitle}>표시 방식</h3>
            <div className={styles.radioGroup}>
              {([
                { v:'pct', l:'📊 비중 (%)',     d:'각 기간 내 항목 비율을 100% 누적 막대로 표시' },
                { v:'abs', l:'🔢 절대값',        d:'원래 수치 그대로 누적 막대로 표시' },
                { v:'yoy', l:'📈 YoY 성장률',    d:'직전 기간 대비 성장률(%) 계산' },
              ] as {v: 'pct'|'abs'|'yoy'; l:string; d:string}[]).map(o => (
                <label key={o.v} className={`${styles.radioRow} ${ctBasis===o.v ? styles.radioOn : ''}`}>
                  <input type="radio" name="ctBasis" value={o.v}
                    checked={ctBasis===o.v} onChange={() => setCtBasis(o.v)} />
                  <div>
                    <span className={styles.radioLabel}>{o.l}</span>
                    <span className={styles.radioDesc}>{o.d}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* ② 분석 기간(컬럼) 선택 */}
          <div className={styles.card}>
            <div className={styles.cardNum}>2</div>
            <h3 className={styles.cardTitle}>
              분석 기간 선택
              <span className={styles.cardSubtitle}> ({schema.crossTab?.isYearCols ? '연도' : '컬럼'})</span>
            </h3>
            <p className={styles.cardDesc}>비교할 기간(컬럼)을 선택하세요</p>
            <div className={styles.checkGroup}>
              {allValueCols.map(col => (
                <label key={col}
                  className={`${styles.checkRow} ${selectedCols.includes(col) ? styles.checkOn : ''}`}>
                  <input type="checkbox"
                    checked={selectedCols.includes(col)}
                    onChange={() => toggleArr(selectedCols, col, setSelectedCols)} />
                  <span className={styles.checkLabel}>{col}</span>
                </label>
              ))}
            </div>
            <div className={styles.selectAllRow}>
              <button className={styles.selAllBtn}
                onClick={() => setSelectedCols(allValueCols)}>전체 선택</button>
              <button className={styles.selAllBtn}
                onClick={() => setSelectedCols([allValueCols[allValueCols.length-1]])}>최신만</button>
            </div>
          </div>

          {/* ③ 분석 대상(행) 선택 */}
          <div className={styles.card}>
            <div className={styles.cardNum}>3</div>
            <h3 className={styles.cardTitle}>
              분석 대상
              <span className={styles.cardSubtitle}> ({rowLabelCol || '항목'})</span>
            </h3>
            <p className={styles.cardDesc}>비교할 항목을 선택하세요</p>
            <div className={styles.checkGroup} style={{ maxHeight: 180, overflowY: 'auto' }}>
              {allRowItems.map(item => (
                <label key={item}
                  className={`${styles.checkRow} ${selectedItems.includes(item) ? styles.checkOn : ''}`}>
                  <input type="checkbox"
                    checked={selectedItems.includes(item)}
                    onChange={() => toggleArr(selectedItems, item, setSelectedItems)} />
                  <span className={styles.checkLabel}>{item}</span>
                </label>
              ))}
            </div>
            <div className={styles.selectAllRow}>
              <button className={styles.selAllBtn}
                onClick={() => setSelectedItems(allRowItems)}>전체 선택</button>
              <button className={styles.selAllBtn}
                onClick={() => setSelectedItems([])}>전체 해제</button>
            </div>
          </div>

          {/* ④ 차트 방향 */}
          <div className={styles.card}>
            <div className={styles.cardNum}>4</div>
            <h3 className={styles.cardTitle}>차트 구성</h3>
            <div className={styles.radioGroup}>
              <label className={`${styles.radioRow} ${chartOrient==='year-stacked' ? styles.radioOn : ''}`}>
                <input type="radio" name="orient" value="year-stacked"
                  checked={chartOrient==='year-stacked'} onChange={() => setChartOrient('year-stacked')} />
                <div>
                  <span className={styles.radioLabel}>📅 기간별 비교</span>
                  <span className={styles.radioDesc}>X축 = 기간(연도), 각 막대 = 항목 누적</span>
                </div>
              </label>
              <label className={`${styles.radioRow} ${chartOrient==='item-bar' ? styles.radioOn : ''}`}>
                <input type="radio" name="orient" value="item-bar"
                  checked={chartOrient==='item-bar'} onChange={() => setChartOrient('item-bar')} />
                <div>
                  <span className={styles.radioLabel}>🏢 항목별 비교</span>
                  <span className={styles.radioDesc}>X축 = 항목(국가/제품), 각 막대 = 기간별 수치</span>
                </div>
              </label>
            </div>
          </div>
        </>)}

        {/* ═══════════════════════════════════════════════════════
            계층형 데이터 UI  (Subsidiary × Category × Month)
        ═══════════════════════════════════════════════════════ */}
        {isHierarchical && (<>
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
                <label key={c}
                  className={`${styles.checkRow} ${categories.includes(c) ? styles.checkOn : ''}`}>
                  <input type="checkbox" checked={categories.includes(c)}
                    onChange={() => toggleArr(categories, c, setCategories)} />
                  <span className={styles.checkLabel}>{c}</span>
                </label>
              ))}
            </div>
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
                    {schema.row.subsidiaries.slice(0,4).join(', ')}{schema.row.subsidiaries.length>4?'…':''}
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
        </>)}

        {/* ═══════════════════════════════════════════════════════
            감지 실패 / 단순 데이터 fallback
        ═══════════════════════════════════════════════════════ */}
        {!isCrossTab && !isHierarchical && (
          <div className={styles.card} style={{ gridColumn: '1 / -1' }}>
            <h3 className={styles.cardTitle}>데이터 구조</h3>
            <p className={styles.cardDesc}>
              계층형 또는 크로스탭 구조를 감지하지 못했습니다.<br />
              기본 차트로 바로 이동하거나 데이터 정제 단계에서 컬럼명을 재구성해주세요.
            </p>
          </div>
        )}
      </div>

      {/* 설정 요약 */}
      <div className={styles.summary}>
        <span className={styles.summaryIcon}>✨</span>
        <span>{summaryText}</span>
      </div>

      {/* 하단 CTA */}
      <div className={styles.footer}>
        <div style={{ flex: 1 }} />
        <button
          id="intent-apply-btn"
          className="btn btn-primary"
          onClick={isCrossTab ? applyCrossTab : (isHierarchical ? applyHierarchical : onDone)}
          disabled={isCrossTab
            ? (selectedCols.length === 0 || selectedItems.length === 0)
            : (!isHierarchical || categories.length === 0)}
        >
          차트 미리보기 <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
