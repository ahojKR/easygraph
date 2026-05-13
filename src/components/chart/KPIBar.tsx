'use client';

import { useChart } from '@/context/ChartContext';
import styles from './KPIBar.module.css';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function KPIBar() {
  const { state } = useChart();
  const insights = state.insights ?? [];
  if (!insights.length) return null;

  return (
    <div className={styles.root}>
      {insights.map(item => {
        const yoy = typeof item.value === 'number' ? item.value : null;
        const isUp   = yoy !== null && yoy > 0;
        const isDown = yoy !== null && yoy < 0;
        return (
          <div key={item.id} className={styles.card}>
            <div className={styles.cardTitle}>{item.title}</div>
            <div className={styles.cardContent}>{item.content}</div>
            {yoy !== null && (
              <div className={`${styles.yoy} ${isUp ? styles.up : isDown ? styles.down : styles.flat}`}>
                {isUp   && <TrendingUp  size={13} />}
                {isDown && <TrendingDown size={13} />}
                {!isUp && !isDown && <Minus size={13} />}
                {yoy > 0 ? '+' : ''}{yoy}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
