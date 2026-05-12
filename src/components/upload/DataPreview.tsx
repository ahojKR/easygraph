'use client';

import { Row, ColumnDef } from '@/context/ChartContext';
import styles from './DataPreview.module.css';

interface Props {
  data: Row[];
  headers: ColumnDef[];
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  date:     { label: '날짜', color: '#00d4ff' },
  number:   { label: '숫자', color: '#10b981' },
  category: { label: '범주', color: '#f59e0b' },
  ignore:   { label: '무시', color: '#4a5568' },
};

export default function DataPreview({ data, headers }: Props) {
  const previewRows = data.slice(0, 50);

  return (
    <div className={styles.wrapper}>
      <div className={styles.meta}>
        <span>총 <strong>{data.length.toLocaleString()}</strong>행 표시 중 {Math.min(50, data.length)}행 미리보기</span>
        <div className={styles.typeLegend}>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <span key={k} style={{ color: v.color, fontSize: '0.8rem' }}>
              ● {v.label}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.rowNum}>#</th>
              {headers.map((h, i) => {
                const tl = TYPE_LABELS[h.type] || TYPE_LABELS.ignore;
                return (
                  <th key={i}>
                    <div className={styles.thInner}>
                      <span className={styles.colName}>{h.name}</span>
                      <span className={styles.typeBadge} style={{ color: tl.color, borderColor: tl.color }}>
                        {tl.label}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, ri) => (
              <tr key={ri}>
                <td className={styles.rowNum}>{ri + 1}</td>
                {headers.map((h, ci) => {
                  const val = row[h.name];
                  const isEmpty = val === null || val === undefined || val === '';
                  return (
                    <td key={ci} className={isEmpty ? styles.empty : ''}>
                      {isEmpty ? <span className={styles.nullBadge}>-</span> : String(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length > 50 && (
        <div className={styles.moreRows}>
          ... 외 {(data.length - 50).toLocaleString()}행이 더 있습니다
        </div>
      )}
    </div>
  );
}
