'use client';

import { useState, useMemo } from 'react';
import { ColumnDef } from '@/context/ChartContext';
import { useChart } from '@/context/ChartContext';
import { profileData, pivotWideToLong } from '@/lib/dataDetect';
import { applyTransform } from '@/lib/transform';
import styles from './SmartAxisMapper.module.css';
import { CheckCircle2, ChevronRight } from 'lucide-react';

interface Props { headers: ColumnDef[]; }

const X_OPTIONS = [
  { id: 'monthly',   icon: '📅', label: '월별',    desc: '1월 ~ 12월 단위로 봅니다' },
  { id: 'quarterly', icon: '🗓️', label: '분기별',  desc: 'Q1·Q2·Q3·Q4 단위로 집계합니다' },
  { id: 'half',      icon: '📆', label: '반기별',  desc: '상반기·하반기로 집계합니다' },
  { id: 'yearly',    icon: '🗃️', label: '연도별',  desc: '연간 합계로 묶습니다' },
  { id: 'item',      icon: '🏷️', label: '항목/분류', desc: '카테고리로 비교합니다' },
] as const;
type XOptionId = typeof X_OPTIONS[number]['id'];

const Y_OPTIONS = [
  { id: 'value',      icon: '🔢', label: '수치',    desc: '입력된 숫자 그대로 표시합니다' },
  { id: 'percent',    icon: '🥧', label: '비중 (%)', desc: '전체 합계 대비 각 항목의 점유율 (%)' },
  { id: 'cumulative', icon: '📈', label: '누적 합계', desc: '시간 흐름에 따른 수치 누적 추이' },
  { id: 'rank',       icon: '🏆', label: '순위',    desc: '수치 크기 순으로 1위·2위… 표시' },
] as const;
type YOptionId = typeof Y_OPTIONS[number]['id'];

export default function SimpleAxisMapper({ headers }: Props) {
  const { state, dispatch } = useChart();
  const [xSel, setXSel] = useState<XOptionId | null>(null);
  const [ySel, setYSel] = useState<YOptionId | null>(null);
  const [applied, setApplied] = useState(false);

  const profile = useMemo(() => profileData(state.rawData, headers), [state.rawData, headers]);

  const apply = () => {
    if (!xSel || !ySel) return;
    const catCols = profile.categoryColumns;
    const numCols = profile.numericColumns;
    const isWide  = profile.format === 'wide';

    let baseData = state.rawData;
    let xAxisCol = catCols[0]?.name ?? numCols[0]?.name ?? '';
    let yAxesCols = numCols.map(c => c.name);

    if (isWide && xSel !== 'item') {
      const keyColumns = catCols.slice(0, 2).map(c => c.name);
      const pivoted = pivotWideToLong(state.rawData, keyColumns, numCols.map(c => c.name), '기간');
      baseData = pivoted;
      xAxisCol = '기간';
      yAxesCols = Object.keys(pivoted[0] ?? {}).filter(k => k !== '기간');
    } else if (xSel === 'item') {
      xAxisCol  = catCols[0]?.name ?? '';
      yAxesCols = [numCols[0]?.name ?? ''];
    }

    let displayData = baseData;
    if (xSel === 'quarterly') {
      displayData = aggregatePeriod(baseData, xAxisCol, yAxesCols, 'quarter');
      xAxisCol = '분기';
    } else if (xSel === 'half') {
      displayData = aggregatePeriod(baseData, xAxisCol, yAxesCols, 'half');
      xAxisCol = '반기';
    } else if (xSel === 'yearly') {
      displayData = aggregatePeriod(baseData, xAxisCol, yAxesCols, 'year');
      xAxisCol = '연도';
    }

    const yTransformMap: Record<YOptionId, Parameters<typeof applyTransform>[2]> = {
      value: 'none', percent: 'col-pct', cumulative: 'cumulative', rank: 'rank',
    };
    const transformType = yTransformMap[ySel];
    const finalData = applyTransform(displayData, yAxesCols, transformType, xAxisCol);

    const chartTypeMap: Record<XOptionId, 'bar'|'line'|'area'|'stacked-bar'> = {
      monthly: ySel === 'cumulative' ? 'area' : 'line',
      quarterly: 'bar', half: 'bar', yearly: 'bar',
      item: ySel === 'percent' ? 'stacked-bar' : 'bar',
    };

    dispatch({ type: 'SET_DISPLAY_DATA', payload: { data: finalData, transformType } });
    dispatch({ type: 'SET_X_AXIS',  payload: xAxisCol });
    dispatch({ type: 'SET_Y_AXES',  payload: yAxesCols });
    dispatch({ type: 'SET_CHART_TYPE', payload: chartTypeMap[xSel] });
    setApplied(true);
  };

  const reset = () => {
    setXSel(null); setYSel(null); setApplied(false);
    dispatch({ type: 'SET_X_AXIS', payload: '' });
    dispatch({ type: 'SET_Y_AXES', payload: [] });
    dispatch({ type: 'SET_DISPLAY_DATA', payload: { data: state.rawData, transformType: 'none' } });
  };

  return (
    <div className={styles.root}>
      <div className={styles.banner}>
        <span>✨</span>
        <p>{profile.description}</p>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>
          <span className={styles.axisTag}>가로축</span>
          <h3>가로축에 무엇을 표시할까요?</h3>
        </div>
        <div className={styles.pills}>
          {X_OPTIONS.map(opt => (
            <button key={opt.id} id={`x-${opt.id}`}
              className={`${styles.pill} ${xSel === opt.id ? styles.pillSelected : ''}`}
              onClick={() => { setXSel(opt.id); setApplied(false); }}>
              <span>{opt.icon}</span>
              <span className={styles.pillLabel}>{opt.label}</span>
              {xSel === opt.id && <CheckCircle2 size={13} />}
            </button>
          ))}
        </div>
        {xSel && <p className={styles.optHint}>{X_OPTIONS.find(o => o.id === xSel)?.desc}</p>}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>
          <span className={styles.axisTag} style={{ background:'rgba(16,185,129,0.15)', color:'#10b981' }}>세로축</span>
          <h3>세로축에 무엇을 표시할까요?</h3>
        </div>
        <div className={styles.pills}>
          {Y_OPTIONS.map(opt => (
            <button key={opt.id} id={`y-${opt.id}`}
              className={`${styles.pill} ${ySel === opt.id ? styles.pillSelectedGreen : ''}`}
              onClick={() => { setYSel(opt.id); setApplied(false); }}>
              <span>{opt.icon}</span>
              <span className={styles.pillLabel}>{opt.label}</span>
              {ySel === opt.id && <CheckCircle2 size={13} />}
            </button>
          ))}
        </div>
        {ySel && <p className={styles.optHint}>{Y_OPTIONS.find(o => o.id === ySel)?.desc}</p>}
      </div>

      {!!xSel && !!ySel && !applied && (
        <div className={styles.applyRow}>
          <div className={styles.applyPreview}>
            <ChevronRight size={14} />
            가로: <strong>{X_OPTIONS.find(o => o.id === xSel)?.label}</strong>
            &nbsp;/&nbsp;세로: <strong>{Y_OPTIONS.find(o => o.id === ySel)?.label}</strong>
          </div>
          <button id="apply-axis-btn" className="btn btn-primary" onClick={apply}>
            이 설정으로 차트 보기 →
          </button>
        </div>
      )}

      {applied && (
        <div className={styles.appliedBanner}>
          <CheckCircle2 size={16} color="var(--accent-green)" />
          <span>가로: <strong>{X_OPTIONS.find(o=>o.id===xSel)?.label}</strong> / 세로: <strong>{Y_OPTIONS.find(o=>o.id===ySel)?.label}</strong> — 설정 완료</span>
          <button className={styles.resetBtn} onClick={reset} id="axis-reset-btn">다시 선택</button>
        </div>
      )}
    </div>
  );
}

import { Row } from '@/context/ChartContext';
function getMonthNum(val: string): number | null {
  const m = String(val).match(/(\d{1,2})월|[-/](\d{1,2})$|^(\d{1,2})$/);
  if (!m) return null;
  const n = parseInt(m[1] ?? m[2] ?? m[3] ?? '', 10);
  return n >= 1 && n <= 12 ? n : null;
}
function aggregatePeriod(data: Row[], xCol: string, yAxes: string[], type: 'quarter'|'half'|'year'): Row[] {
  const buckets: Record<string, Record<string, number>> = {};
  const order: string[] = [];
  data.forEach(row => {
    const raw = String(row[xCol] ?? '');
    let label = raw;
    if (type === 'quarter') { const m = getMonthNum(raw); label = m ? `Q${Math.ceil(m/3)}` : raw; }
    else if (type === 'half') { const m = getMonthNum(raw); label = m ? (m<=6?'상반기':'하반기') : raw; }
    else if (type === 'year') { const y = raw.match(/\d{4}/)?.[0]; label = y ?? raw; }
    if (!buckets[label]) { buckets[label] = {}; order.push(label); }
    yAxes.forEach(y => { buckets[label][y] = (buckets[label][y]??0) + (Number(row[y])||0); });
  });
  const newXLabel = type==='quarter'?'분기':type==='half'?'반기':'연도';
  return order.map(label => {
    const r: Row = { [newXLabel]: label };
    yAxes.forEach(y => { r[y] = Math.round((buckets[label][y]??0)*10)/10; });
    return r;
  });
}
