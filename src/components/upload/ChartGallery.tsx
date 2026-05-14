'use client';

import { useMemo, useState } from 'react';
import { useChart } from '@/context/ChartContext';
import { generateChartCases, ChartCase } from '@/lib/autoChartCases';
import MiniChart from './MiniChart';
import styles from './ChartGallery.module.css';
import { ChevronRight, Settings2, CheckCircle2 } from 'lucide-react';

interface Props {
  onDone: () => void;
  onAdvanced: () => void;  // 직접 설정 모드
}

export default function ChartGallery({ onDone, onAdvanced }: Props) {
  const { state, dispatch } = useChart();
  const [selected, setSelected] = useState<string | null>(null);

  const cases = useMemo(
    () => generateChartCases(state.rawData, state.headers),
    [state.rawData, state.headers]
  );

  const selectedCase = cases.find(c => c.id === selected);

  const applyCase = (c: ChartCase) => {
    dispatch({ type: 'SET_DISPLAY_DATA', payload: { data: c.data, transformType: c.transformType } });
    dispatch({ type: 'SET_X_AXIS',       payload: c.xAxis });
    dispatch({ type: 'SET_Y_AXES',       payload: c.yAxes });
    dispatch({ type: 'SET_CHART_TYPE',   payload: c.chartType });
    dispatch({ type: 'UPDATE_OPTIONS',   payload: {
      colorScheme:   c.colorScheme,
      stacked:       c.stacked,
      showDataLabels: c.showDataLabels,
    }});
  };

  const handleSelect = (c: ChartCase) => {
    setSelected(c.id);
    applyCase(c);
  };

  const handleConfirm = () => {
    if (selectedCase) applyCase(selectedCase);
    onDone();
  };

  return (
    <div className={styles.root}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>차트 유형을 선택하세요</h2>
          <p className={styles.subtitle}>
            업로드한 데이터를 기반으로 {cases.length}가지 차트를 자동으로 생성했습니다.
            원하는 형태를 클릭해 선택하세요.
          </p>
        </div>
        <button
          id="advanced-config-btn"
          className="btn btn-ghost btn-sm"
          onClick={onAdvanced}
        >
          <Settings2 size={14} /> 직접 설정
        </button>
      </div>

      {/* 케이스 그리드 */}
      <div className={styles.grid}>
        {cases.map(c => (
          <div
            key={c.id}
            id={`case-card-${c.id}`}
            className={`${styles.card} ${selected === c.id ? styles.cardSelected : ''}`}
            onClick={() => handleSelect(c)}
          >
            {/* 선택 체크 */}
            {selected === c.id && (
              <div className={styles.checkBadge}>
                <CheckCircle2 size={16} color="var(--accent-aqua)" />
              </div>
            )}

            {/* 미니 차트 */}
            <div className={styles.previewArea}>
              <MiniChart
                data={c.data.slice(0, 20)}
                xAxis={c.xAxis}
                yAxes={c.yAxes}
                chartType={c.chartType}
                colorScheme={c.colorScheme}
                stacked={c.stacked}
              />
            </div>

            {/* 카드 정보 */}
            <div className={styles.cardInfo}>
              <div className={styles.cardTitle}>
                <span className={styles.cardEmoji}>{c.emoji}</span>
                {c.title}
              </div>
              <p className={styles.cardDesc}>{c.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 하단 확인 버튼 */}
      <div className={styles.footer}>
        <span className={styles.footerHint}>
          {selected
            ? `"${selectedCase?.title}" 선택됨`
            : '케이스를 선택해주세요'}
        </span>
        <div style={{ flex: 1 }} />
        <button
          id="gallery-confirm-btn"
          className="btn btn-primary"
          disabled={!selected}
          onClick={handleConfirm}
        >
          이 차트로 생성하기 <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
