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
        <p>감지된 결측값 또는 구조 문제가 없습니다. 바로 축 설정으로 이동할 수 있습니다.</p>
        <button className="btn btn-primary" onClick={onDone} id="repair-skip-btn">
          축 설정으로 이동 →
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

      {/* 수정 후 테이블 미리보기 */}
      <div className={styles.previewSection}>
        <div className={styles.previewHeader}>
          <Table2 size={16} color="var(--accent-aqua)" />
          <span>수정 후 테이블 미리보기</span>
          <span className={styles.previewMeta}>
            {repaired.data.length}행 × {repaired.headers.length}열
          </span>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                {repaired.headers.slice(0, 8).map(h => (
                  <th key={h.name}>{h.name}</th>
                ))}
                {repaired.headers.length > 8 && <th>...</th>}
              </tr>
            </thead>
            <tbody>
              {repaired.data.slice(0, 6).map((row, i) => (
                <tr key={i}>
                  {repaired.headers.slice(0, 8).map(h => (
                    <td key={h.name}>
                      {row[h.name] !== null && row[h.name] !== undefined
                        ? String(row[h.name])
                        : <span className={styles.null}>-</span>}
                    </td>
                  ))}
                  {repaired.headers.length > 8 && <td>…</td>}
                </tr>
              ))}
            </tbody>
          </table>
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
          테이블 완성 → 축 설정
        </button>
      </div>
    </div>
  );
}
