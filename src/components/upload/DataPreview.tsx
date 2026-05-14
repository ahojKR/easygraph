'use client';

import { useMemo } from 'react';
import { Row, ColumnDef } from '@/context/ChartContext';
import { detectDataSchema } from '@/lib/schemaDetect';
import styles from './DataPreview.module.css';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

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

  // 스키마 자동 감지
  const schema = useMemo(() => detectDataSchema(data, headers), [data, headers]);

  // 감지 결과 아이템 목록
  const detections = useMemo(() => {
    const items: { label: string; value: string; ok: boolean }[] = [];

    if (schema.col.years.length > 0) {
      items.push({ label: '연도', value: `${schema.col.years.join(', ')} 감지`, ok: true });
    } else {
      items.push({ label: '연도', value: '감지 안 됨', ok: false });
    }

    if (schema.col.monthCols.length > 0) {
      items.push({ label: '월 데이터', value: `${schema.col.monthCols.length}개 월 컬럼 감지`, ok: true });
    } else {
      items.push({ label: '월 데이터', value: '감지 안 됨', ok: false });
    }

    if (schema.row.categories.length > 0) {
      items.push({ label: '카테고리', value: schema.row.categories.join(' / '), ok: true });
    } else {
      items.push({ label: '카테고리', value: '감지 안 됨', ok: false });
    }

    if (schema.row.subsidiaries.length > 0) {
      items.push({
        label: 'Subsidiary',
        value: schema.row.subsidiaries.slice(0, 5).join(', ') +
               (schema.row.subsidiaries.length > 5 ? ` 외 ${schema.row.subsidiaries.length - 5}개` : ''),
        ok: true,
      });
    }

    if (schema.hasYoY) {
      items.push({ label: 'YoY 비교', value: '가능 (다년도 데이터 감지)', ok: true });
    }

    return items;
  }, [schema]);

  // 잠재 문제 탐지
  const issues = useMemo(() => {
    const list: string[] = [];
    const nullCount = data.reduce((cnt, row) =>
      cnt + headers.filter(h => row[h.name] === null || row[h.name] === undefined || row[h.name] === '').length,
    0);
    if (nullCount > 0) list.push(`빈 셀 ${nullCount}개 감지됨 (병합 셀 해제 필요)`);
    const dupHeaders = headers.filter((h, i) => headers.findIndex(hh => hh.name === h.name) !== i);
    if (dupHeaders.length > 0) list.push(`중복 컬럼명 감지: ${dupHeaders.map(h => h.name).join(', ')}`);
    return list;
  }, [data, headers]);

  return (
    <div className={styles.wrapper}>

      {/* 자동 감지 배너 */}
      <div className={styles.detectionBanner}>
        <div className={styles.bannerTitle}>
          <Info size={15} color="var(--accent-aqua)" />
          <span>⚡ 자동 감지 결과</span>
        </div>
        <div className={styles.detectionGrid}>
          {detections.map((d, i) => (
            <div key={i} className={styles.detectionItem}>
              {d.ok
                ? <CheckCircle2 size={14} color="var(--accent-green)" />
                : <AlertCircle  size={14} color="var(--accent-orange)" />
              }
              <span className={styles.detectLabel}>{d.label}:</span>
              <span className={`${styles.detectValue} ${d.ok ? styles.detectOk : styles.detectWarn}`}>
                {d.value}
              </span>
            </div>
          ))}
        </div>
        {issues.length > 0 && (
          <div className={styles.issueList}>
            {issues.map((iss, i) => (
              <div key={i} className={styles.issueItem}>
                <AlertCircle size={13} color="var(--accent-orange)" />
                <span>{iss}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 테이블 메타 */}
      <div className={styles.meta}>
        <span>총 <strong>{data.length.toLocaleString()}</strong>행 · 최대 50행 미리보기</span>
        <div className={styles.typeLegend}>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <span key={k} style={{ color: v.color, fontSize: '0.8rem' }}>● {v.label}</span>
          ))}
        </div>
      </div>

      {/* 데이터 테이블 */}
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
        <div className={styles.moreRows}>... 외 {(data.length - 50).toLocaleString()}행이 더 있습니다</div>
      )}
    </div>
  );
}
