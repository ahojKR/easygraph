'use client';

import { useMemo } from 'react';
import { ColumnDef } from '@/context/ChartContext';
import { useChart } from '@/context/ChartContext';
import { detectDataSchema } from '@/lib/schemaDetect';
import SimpleAxisMapper from './SimpleAxisMapper';
import AnalysisSetup from './AnalysisSetup';

interface Props {
  headers: ColumnDef[];
  onDone?: () => void;
}

/**
 * 데이터 구조에 따라 적절한 축 설정 UI를 렌더링합니다.
 * - 계층형 (Subsidiary × HS/ES/MS × Year/Month) → AnalysisSetup
 * - 단순 시계열 / 범주형 → SimpleAxisMapper
 */
export default function SmartAxisMapper({ headers, onDone }: Props) {
  const { state } = useChart();

  const schema = useMemo(
    () => detectDataSchema(state.rawData, headers),
    [state.rawData, headers]
  );

  if (schema.isHierarchical || (schema.hasYoY && schema.col.monthCols.length >= 6)) {
    return <AnalysisSetup onDone={onDone ?? (() => {})} />;
  }

  return <SimpleAxisMapper headers={headers} />;
}
