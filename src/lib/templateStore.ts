/**
 * templateStore.ts — localStorage 기반 분석 템플릿 저장/불러오기
 */

import { PeriodDef } from './periodEngine';
import { ChartType, TransformType } from '@/context/ChartContext';

export interface AnalysisTemplate {
  id:          string;
  name:        string;
  createdAt:   string;
  periods:     PeriodDef[];
  yoyPairs:    [string, string][];
  useAvg:      boolean;
  chartType:   ChartType;
  transformType: TransformType;
  colorScheme: string;
  description?: string;
}

const STORAGE_KEY = 'easygraph_templates';

// ─── 읽기 ────────────────────────────────────────────────
export function loadTemplates(): AnalysisTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AnalysisTemplate[]) : [];
  } catch {
    return [];
  }
}

// ─── 저장 ────────────────────────────────────────────────
export function saveTemplate(
  name: string,
  config: Omit<AnalysisTemplate, 'id' | 'name' | 'createdAt'>
): AnalysisTemplate {
  const templates = loadTemplates();
  const newTpl: AnalysisTemplate = {
    id:        crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    ...config,
  };
  templates.unshift(newTpl);           // 최신이 먼저
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates.slice(0, 20))); // 최대 20개
  return newTpl;
}

// ─── 삭제 ────────────────────────────────────────────────
export function deleteTemplate(id: string): void {
  const templates = loadTemplates().filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

// ─── 날짜 포맷 ───────────────────────────────────────────
export function formatTemplateDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}
