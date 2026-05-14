'use client';

import { useMemo, useState } from 'react';
import { useChart } from '@/context/ChartContext';
import { detectIssues, applyRepairs, RepairIssue } from '@/lib/dataRepair';
import styles from './DataRepair.module.css';
import { AlertTriangle, CheckCircle2, X, Wrench, Table2 } from 'lucide-react';

interface Props {
  onDone: () => void;
}

const SEVERITY_COLOR: Record<string, string> = {
  error:   'var(--accent-red)',
  warning: 'var(--accent-orange)',
};

export default function DataRepair({ onDone }: Props) {
  const { state, dispatch } = useChart();
  const { rawData, headers } = state;

  const issues = useMemo(
    () => detectIssues(rawData, headers),
    [rawData, headers]
  );

  // 기본으로 모두 수락 상태
  const [accepted, setAccepted] = useState<Set<string>>(
    () => new Set(issues.map(i => i.id))
  );
  const [applied, setApplied] = useState(false);

  const toggle = (id: string) => {
    setAccepted(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setApplied(false);
  };

  // 수정 후 미리보기 계산
  const repaired = useMemo(
    () => applyRepairs(rawData, headers, [...accepted]),
    [rawData, headers, accepted]
  );

  const handleApply = () => {
    dispatch({
      type: 'REPAIR_DATA',
      payload: { data: repaired.data, headers: repaired.headers },
    });
    setApplied(true);
  };

  const handleDone = () => {
    if (!applied) handleApply();
    onDone();
  };

  // 문제 없으면 바로 통과
  if (issues.length === 0) {
    return (
      <div className={styles.clean}>
        <CheckCircle2 size={32} color="var(--accent-green)" />
        <h2>데이터 품질이 양호합니다 ✅</h2>
        <p>감지된 결측값 또는 구조 문제가 없습니다.</p>
        <button className="btn btn-primary" onClick={onDone} id="repair-skip-btn">
          분석 설정으로 이동 →
        </button>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Wrench size={20} color="var(--accent-orange)" />
          <div>
            <h2 className={styles.title}>데이터 정제 필요</h2>
            <p className={styles.subtitle}>
              {issues.length}가지 문제가 감지되었습니다. 수정 제안을 검토하고 테이블을 완성해주세요.
            </p>
          </div>
        </div>
      </div>

      {/* 문제 목록 */}
      <div className={styles.issueList}>
        {issues.map(issue => (
          <div
            key={issue.id}
            className={`${styles.issueCard} ${accepted.has(issue.id) ? styles.issueAccepted : styles.issueRejected}`}
          >
            <div className={styles.issueTop}>
              <AlertTriangle size={16} color={SEVERITY_COLOR[issue.severity]} />
              <h3 className={styles.issueTitle}>{issue.title}</h3>
              <div className={styles.issueActions}>
                <button
                  id={`accept-${issue.id}`}
                  className={`${styles.actionBtn} ${accepted.has(issue.id) ? styles.actionAccept : ''}`}
                  onClick={() => { if (!accepted.has(issue.id)) toggle(issue.id); }}
                >
                  <CheckCircle2 size={13} /> 수정 적용
                </button>
                <button
                  id={`reject-${issue.id}`}
                  className={`${styles.actionBtn} ${!accepted.has(issue.id) ? styles.actionReject : ''}`}
                  onClick={() => { if (accepted.has(issue.id)) toggle(issue.id); }}
                >
                  <X size={13} /> 무시
                </button>
              </div>
            </div>
            <p className={styles.issueDesc}>{issue.description}</p>
            {issue.preview && (
              <div className={styles.issuePrev}>
                💡 수정 결과: <em>{issue.preview}</em>
              </div>
            )}
            {issue.affectedColumns && (
              <div className={styles.affectedCols}>
                {issue.affectedColumns.slice(0, 6).map(c => (
                  <span key={c} className={styles.colTag}>{c}</span>
                ))}
                {issue.affectedColumns.length > 6 && (
                  <span className={styles.colTag}>+{issue.affectedColumns.length - 6}개</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Before / After 나란히 비교 */}
      <div className={styles.compareSection}>
        <div className={styles.compareHeader}>
          <Table2 size={16} color="var(--accent-aqua)" />
          <span>Before / After 비교</span>
        </div>
        <div className={styles.compareGrid}>
          {/* BEFORE */}
          <div className={styles.comparePane}>
            <div className={styles.comparePaneTitle} style={{ color: 'var(--accent-orange)' }}>Before (원본)</div>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead><tr>
                  {headers.slice(0, 7).map(h => <th key={h.name}>{h.name}</th>)}
                  {headers.length > 7 && <th>…</th>}
                </tr></thead>
                <tbody>
                  {rawData.slice(0, 6).map((row, i) => (
                    <tr key={i}>
                      {headers.slice(0, 7).map(h => {
                        const val = row[h.name];
                        const empty = val === null || val === undefined || val === '';
                        return <td key={h.name} className={empty ? styles.cellEmpty : ''}>{empty ? '—' : String(val)}</td>;
                      })}
                      {headers.length > 7 && <td>…</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* AFTER */}
          <div className={styles.comparePane}>
            <div className={styles.comparePaneTitle} style={{ color: 'var(--accent-green)' }}>After (수정 후)</div>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead><tr>
                  {repaired.headers.slice(0, 7).map(h => <th key={h.name}>{h.name}</th>)}
                  {repaired.headers.length > 7 && <th>…</th>}
                </tr></thead>
                <tbody>
                  {repaired.data.slice(0, 6).map((row, i) => (
                    <tr key={i}>
                      {repaired.headers.slice(0, 7).map(h => {
                        const val = row[h.name];
                        const empty = val === null || val === undefined || val === '';
                        return <td key={h.name} className={empty ? styles.cellEmpty : styles.cellFilled}>{empty ? '—' : String(val)}</td>;
                      })}
                      {repaired.headers.length > 7 && <td>…</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className={styles.compareMeta}>
          원본: {rawData.length}행 × {headers.length}열 &nbsp;→&nbsp;
          수정 후: {repaired.data.length}행 × {repaired.headers.length}열
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className={styles.footer}>
        {applied && (
          <span className={styles.appliedMsg}>
            <CheckCircle2 size={14} color="var(--accent-green)" /> 수정 사항이 적용되었습니다
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          id="apply-repair-btn"
          className="btn btn-secondary"
          onClick={handleApply}
          disabled={applied}
        >
          <Wrench size={14} /> 수정 사항 적용
        </button>
        <button
          id="repair-done-btn"
          className="btn btn-primary"
          onClick={handleDone}
        >
          분석 설정으로 →
        </button>
      </div>
    </div>
  );
}
