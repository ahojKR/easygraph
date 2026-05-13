'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export type ChartType =
  | 'line' | 'bar' | 'stacked-bar' | 'combo'
  | 'area' | 'pie' | 'donut' | 'scatter' | 'radar';

export type TransformType =
  | 'none'
  | 'col-pct'       // 열(연도/기간) 기준 비중
  | 'row-pct'       // 행(항목) 기준 비중
  | 'total-pct'     // 전체 합계 기준 비중
  | 'rank'          // 순위
  | 'cumulative'    // 누적 합계
  | 'period-quarter'  // 월 → 분기 집계
  | 'period-half';    // 월 → 반기 집계


export interface ColumnDef {
  name: string;
  type: 'date' | 'number' | 'category' | 'ignore';
  index: number;
}

export interface Row {
  [key: string]: string | number | null;
}

export interface ChartOptions {
  showCumulativeAverage: boolean;
  showRollingAverage: boolean;
  rollingAveragePeriod: number;
  showTargetLine: boolean;
  targetValue: number | null;
  showOutliers: boolean;
  showMoMChange: boolean;
  showYoYChange: boolean;
  colorScheme: string;
  showLegend: boolean;
  showGrid: boolean;
  showDataLabels: boolean;
  chartTitle: string;
  isDarkMode: boolean;
  stacked: boolean;
}

export interface InsightItem {
  type: 'trend' | 'anomaly' | 'summary' | 'comparison';
  text: string;
  severity?: 'info' | 'warning' | 'positive';
}

export interface ChartState {
  rawData: Row[];
  displayData: Row[];       // transformed data for rendering
  transformType: TransformType;
  headers: ColumnDef[];
  xAxis: string;
  yAxes: string[];
  groupBy: string;
  chartType: ChartType;
  options: ChartOptions;
  insights: InsightItem[];
  isLoading: boolean;
  fileName: string;
}

const defaultOptions: ChartOptions = {
  showCumulativeAverage: false,
  showRollingAverage: false,
  rollingAveragePeriod: 3,
  showTargetLine: false,
  targetValue: null,
  showOutliers: true,
  showMoMChange: true,
  showYoYChange: false,
  colorScheme: 'default',
  showLegend: true,
  showGrid: true,
  showDataLabels: false,
  chartTitle: '',
  isDarkMode: true,
  stacked: false,
};

const initialState: ChartState = {
  rawData: [],
  displayData: [],
  transformType: 'none',
  headers: [],
  xAxis: '',
  yAxes: [],
  groupBy: '',
  chartType: 'line',
  options: defaultOptions,
  insights: [],
  isLoading: false,
  fileName: '',
};

type Action =
  | { type: 'SET_DATA'; payload: { data: Row[]; headers: ColumnDef[]; fileName: string } }
  | { type: 'SET_DISPLAY_DATA'; payload: { data: Row[]; transformType: TransformType } }
  | { type: 'SET_X_AXIS'; payload: string }
  | { type: 'SET_Y_AXES'; payload: string[] }
  | { type: 'SET_GROUP_BY'; payload: string }
  | { type: 'SET_CHART_TYPE'; payload: ChartType }
  | { type: 'UPDATE_OPTIONS'; payload: Partial<ChartOptions> }
  | { type: 'SET_INSIGHTS'; payload: InsightItem[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'RESET' };

function reducer(state: ChartState, action: Action): ChartState {
  switch (action.type) {
    case 'SET_DATA':
      return {
        ...state,
        rawData: action.payload.data,
        displayData: action.payload.data,
        transformType: 'none',
        headers: action.payload.headers,
        fileName: action.payload.fileName,
        xAxis: '',
        yAxes: [],
        groupBy: '',
        insights: [],
      };
    case 'SET_DISPLAY_DATA':
      return {
        ...state,
        displayData: action.payload.data,
        transformType: action.payload.transformType,
      };
    case 'SET_X_AXIS':
      return { ...state, xAxis: action.payload };
    case 'SET_Y_AXES':
      return { ...state, yAxes: action.payload };
    case 'SET_GROUP_BY':
      return { ...state, groupBy: action.payload };
    case 'SET_CHART_TYPE':
      return { ...state, chartType: action.payload };
    case 'UPDATE_OPTIONS':
      return { ...state, options: { ...state.options, ...action.payload } };
    case 'SET_INSIGHTS':
      return { ...state, insights: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const ChartContext = createContext<{
  state: ChartState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function ChartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <ChartContext.Provider value={{ state, dispatch }}>
      {children}
    </ChartContext.Provider>
  );
}

export function useChart() {
  const ctx = useContext(ChartContext);
  if (!ctx) throw new Error('useChart must be used within ChartProvider');
  return ctx;
}
