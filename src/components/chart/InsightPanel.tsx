'use client';

import { useChart } from '@/context/ChartContext';
import styles from './InsightPanel.module.css';
import { Zap, TrendingUp, AlertTriangle, BarChart2, GitCompare } from 'lucide-react';

const ICONS = {
  summary: <BarChart2 size={15} />,
  trend: <TrendingUp size={15} />,
  anomaly: <AlertTriangle size={15} />,
  comparison: <GitCompare size={15} />,
};

const SEVERITY_STYLES = {
  info:     { color: '#00d4ff', bg: 'rgba(0,212,255,0.07)',   border: 'rgba(0,212,255,0.2)' },
  positive: { color: '#10b981', bg: 'rgba(16,185,129,0.07)',  border: 'rgba(16,185,129,0.2)' },
  warning:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.07)',  border: 'rgba(245,158,11,0.2)' },
};

export default function InsightPanel() {
  const { state } = useChart();
  const { insights } = state;

  if (!insights.length) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <Zap size={16} color="var(--accent-aqua)" />
        <h3>AI 인사이트</h3>
        <span className={styles.badge}>{insights.length}개 분석 결과</span>
      </div>
      <div className={styles.grid}>
        {insights.map((ins, i) => {
          const sev = SEVERITY_STYLES[ins.severity || 'info'];
          return (
            <div
              key={i}
              className={styles.insightCard}
              style={{ borderColor: sev.border, background: sev.bg }}
            >
              <div className={styles.insightIcon} style={{ color: sev.color }}>
                {ICONS[ins.type]}
              </div>
              <p className={styles.insightText} style={{ color: 'var(--text-primary)' }}>
                {ins.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
