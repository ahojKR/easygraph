'use client';

import { useChart } from '@/context/ChartContext';
import { exportTableToXLSX } from '@/lib/exporter';
import styles from './DataTable.module.css';
import { Download, Table2 } from 'lucide-react';

export default function DataTable() {
  const { state } = useChart();
  const { displayData, xAxis, yAxes, transformType, fileName } = state;

  if (!displayData.length || !xAxis || !yAxes.length) return null;

  const columns = [xAxis, ...yAxes];

  const transformLabel: Record<string, string> = {
    none:           '원본 수치',
    'col-pct':      '기간/항목 비중 (%)',
    'row-pct':      '행 기준 비중 (%)',
    'total-pct':    '전체 비중 (%)',
    rank:           '순위',
    cumulative:     '누적 합계',
    'period-quarter': '분기 집계',
    'period-half':  '반기 집계',
  };

  const isPercent = ['col-pct', 'row-pct', 'total-pct'].includes(transformType);
  const isRank    = transformType === 'rank';

  const handleExport = () => {
    exportTableToXLSX(
      displayData,
      columns,
      `${fileName || 'EasyGraph'}_${transformLabel[transformType] ?? '데이터'}`
    );
  };

  return (
    <section className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Table2 size={18} color="var(--accent-aqua)" />
          <span className={styles.title}>데이터 테이블</span>
          {transformType !== 'none' && (
            <span className={styles.badge}>{transformLabel[transformType]}</span>
          )}
        </div>
        <button
          id="export-xlsx-btn"
          className="btn btn-secondary btn-sm"
          onClick={handleExport}
        >
          <Download size={14} /> Excel 다운로드 (.xlsx)
        </button>
      </div>

      {/* Table */}
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, i) => (
              <tr key={i}>
                {columns.map(col => {
                  const val = row[col];
                  if (col === xAxis) {
                    return <td key={col} className={styles.xCell}>{String(val ?? '')}</td>;
                  }
                  const num = typeof val === 'number' ? val : Number(val);
                  return (
                    <td key={col} className={styles.numCell}>
                      {isNaN(num)
                        ? String(val ?? '')
                        : isPercent
                        ? `${num.toLocaleString()}%`
                        : isRank
                        ? `${num}위`
                        : num.toLocaleString()}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {/* Footer: column totals (skip for rank/pct) */}
          {!isRank && (
            <tfoot>
              <tr>
                <td className={styles.totalLabel}>합계</td>
                {yAxes.map(y => {
                  const sum = displayData.reduce((s, r) => s + (Number(r[y]) || 0), 0);
                  return (
                    <td key={y} className={styles.totalCell}>
                      {isPercent ? `${Math.round(sum * 10) / 10}%` : sum.toLocaleString()}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className={styles.rowCount}>총 {displayData.length.toLocaleString()}행</p>
    </section>
  );
}
