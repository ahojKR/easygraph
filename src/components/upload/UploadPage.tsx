'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, FileSpreadsheet, AlertTriangle, CheckCircle,
  X, ArrowRight, BarChart2, ClipboardPaste,
} from 'lucide-react';
import { parseFile, parsePastedText, ParseResult } from '@/lib/parser';
import { useChart } from '@/context/ChartContext';
import DataPreview    from './DataPreview';
import DataRepair     from './DataRepair';
import AnalysisIntent from './AnalysisIntent';
import ChartBuilder   from './ChartBuilder';
import styles from './UploadPage.module.css';

// ── 7단계 플로우 ────────────────────────────────────────
// 1. upload  → 2. preview → 3. repair → 4. intent → 5. builder → /chart
type Step = 'upload' | 'preview' | 'repair' | 'intent' | 'builder';

const STEP_LABELS: Record<Step, string> = {
  upload:  '① 데이터 입력',
  preview: '② 데이터 확인',
  repair:  '③ 데이터 정제',
  intent:  '④ 분석 설정',
  builder: '⑤ 차트 빌더',
};

const STEP_ORDER: Step[] = ['upload', 'preview', 'repair', 'intent', 'builder'];

// ── 샘플 데이터 (APAC LG 형식) ─────────────────────────
const SAMPLE_SUBSIDIARIES = ['LGEIN','LGEPH','LGECB','LGEVH'];
const SAMPLE_CATS = ['HS','ES','MS'];

function makeSample() {
  const rows: Record<string, string | number>[] = [];
  const yr = 2025;
  SAMPLE_SUBSIDIARIES.forEach(sub => {
    SAMPLE_CATS.forEach(cat => {
      const base = { HS:120, ES:80, MS:50 }[cat] ?? 60;
      const row: Record<string, string | number> = {
        연도: yr, Subsidiary: sub, Category: cat,
      };
      for (let m = 1; m <= 7; m++) {
        row[`${yr-2000}년 ${m}월`] = Math.round(base * (0.85 + Math.random() * 0.4));
      }
      rows.push(row);
    });
  });
  return rows;
}

export default function UploadPage() {
  const router = useRouter();
  const { state, dispatch } = useChart();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step,           setStep]           = useState<Step>('upload');
  const [dragActive,     setDragActive]     = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [progress,       setProgress]       = useState(0);
  const [result,         setResult]         = useState<ParseResult | null>(null);
  const [fileName,       setFileName]       = useState('');
  const [error,          setError]          = useState('');
  const [uploadTab,      setUploadTab]      = useState<'file' | 'paste'>('file');
  const [pasteText,      setPasteText]      = useState('');
  const [pasteProcessing, setPasteProcessing] = useState(false);

  // ── 파일 처리 ──────────────────────────────────────────
  const processFile = useCallback(async (file: File) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setError('지원하지 않는 파일 형식입니다. xlsx, xls, csv 파일을 업로드해주세요.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('파일 크기는 50MB 이하여야 합니다.');
      return;
    }
    setError(''); setLoading(true); setProgress(10); setFileName(file.name);
    try {
      setProgress(40);
      const parsed = await parseFile(file);
      setProgress(80);
      dispatch({ type: 'SET_DATA', payload: { data: parsed.data, headers: parsed.headers, fileName: file.name } });
      setResult(parsed);
      setProgress(100);
      setTimeout(() => { setLoading(false); setStep('preview'); }, 400);
    } catch {
      setError('파일 파싱 중 오류가 발생했습니다. 파일을 확인해주세요.');
      setLoading(false); setProgress(0);
    }
  }, [dispatch]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // ── 붙여넣기 처리 ─────────────────────────────────────
  const handlePasteSubmit = () => {
    if (!pasteText.trim()) { setError('데이터를 붙여넣어 주세요.'); return; }
    setPasteProcessing(true); setError('');
    try {
      const parsed = parsePastedText(pasteText);
      if (!parsed.data.length) {
        setError('데이터를 파싱할 수 없습니다. 헤더와 데이터가 포함된 표 형식인지 확인해주세요.');
        setPasteProcessing(false); return;
      }
      dispatch({ type: 'SET_DATA', payload: { data: parsed.data, headers: parsed.headers, fileName: '붙여넣기 데이터' } });
      setResult(parsed); setFileName('붙여넣기 데이터'); setStep('preview');
    } catch {
      setError('데이터 파싱 중 오류가 발생했습니다.');
    }
    setPasteProcessing(false);
  };

  // ── 샘플 데이터 ───────────────────────────────────────
  const loadSample = () => {
    const sampleData = makeSample();
    const headers = Object.keys(sampleData[0]).map((name, index) => ({
      name, index,
      type: (typeof sampleData[0][name] === 'number' ? 'number' : 'category') as 'number' | 'category',
    }));
    dispatch({ type: 'SET_DATA', payload: { data: sampleData as never, headers, fileName: 'APAC_Sample.xlsx' } });
    setResult({ data: sampleData as never, headers, sheetNames: ['Sheet1'], warnings: [] });
    setFileName('APAC_Sample.xlsx');
    setStep('preview');
  };

  const isDone   = (s: Step) => STEP_ORDER.indexOf(step) > STEP_ORDER.indexOf(s);
  const isActive = (s: Step) => step === s;

  return (
    <div className={styles.root}>
      {/* ── HEADER + 진행 표시 ── */}
      <header className={styles.header}>
        <div className={`container ${styles.headerInner}`}>
          <button className={styles.logo} onClick={() => router.push('/')} id="upload-logo">
            <BarChart2 size={20} color="var(--accent-aqua)" />
            <span>EasyGraph</span>
          </button>
          <div className={styles.steps}>
            {STEP_ORDER.map((s, i) => (
              <div
                key={s}
                className={`${styles.stepItem} ${isActive(s) ? styles.stepActive : ''} ${isDone(s) ? styles.stepDone : ''}`}
              >
                <div className={styles.stepDot}>
                  {isDone(s) ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span>{STEP_LABELS[s]}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className={`container ${styles.main}`}>

        {/* ───────────────────────────────────────────────
            STEP 1: 데이터 입력
        ─────────────────────────────────────────────── */}
        {step === 'upload' && (
          <div className={`${styles.uploadSection} animate-fadeIn`}>
            <div className={styles.uploadHero}>
              <h1 className={styles.title}>데이터 입력</h1>
              <p className={styles.subtitle}>
                Excel / CSV 파일 업로드, 또는 셀 복사(Ctrl+C) 후 붙여넣기로 시작하세요
              </p>
            </div>

            {/* 탭 */}
            <div className={styles.uploadTabs}>
              <button id="tab-file"
                className={`${styles.uploadTab} ${uploadTab === 'file' ? styles.tabActive : ''}`}
                onClick={() => { setUploadTab('file'); setError(''); }}>
                <Upload size={16} /> 파일 업로드
              </button>
              <button id="tab-paste"
                className={`${styles.uploadTab} ${uploadTab === 'paste' ? styles.tabActive : ''}`}
                onClick={() => { setUploadTab('paste'); setError(''); }}>
                <ClipboardPaste size={16} /> 데이터 붙여넣기
              </button>
            </div>

            {/* 파일 업로드 */}
            {uploadTab === 'file' && (
              <div
                id="dropzone"
                className={`${styles.dropzone} ${dragActive ? styles.dragActive : ''}`}
                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                {loading ? (
                  <div className={styles.loadingState}>
                    <div className={styles.spinner} />
                    <p className={styles.loadingText}>파일 분석 중... {progress}%</p>
                    <div className="progress-bar" style={{ width: 280, marginTop: 12 }}>
                      <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.uploadIcon}><Upload size={36} /></div>
                    <h2 className={styles.dropTitle}>파일을 여기에 드래그하거나 클릭하여 선택</h2>
                    <p className={styles.dropSub}>.xlsx · .xls · .csv 지원 | 최대 50MB</p>
                    <button className="btn btn-primary" style={{ marginTop: 20 }} id="browse-btn">
                      <FileSpreadsheet size={16} /> 파일 선택
                    </button>
                  </>
                )}
                <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv"
                  onChange={handleInput} style={{ display: 'none' }} />
              </div>
            )}

            {/* 붙여넣기 */}
            {uploadTab === 'paste' && (
              <div className={styles.pasteSection}>
                <div className={styles.pasteHint}>
                  <span>💡</span>
                  <p>Excel에서 셀 선택 후 <kbd>Ctrl+C</kbd> → 아래 영역에 <kbd>Ctrl+V</kbd></p>
                </div>
                <textarea
                  id="paste-area"
                  className={styles.pasteArea}
                  value={pasteText}
                  onChange={e => { setPasteText(e.target.value); setError(''); }}
                  onPaste={e => {
                    setTimeout(() => {
                      const text = e.clipboardData.getData('text');
                      if (text.trim()) setPasteText(text);
                    }, 50);
                  }}
                  placeholder={'연도\tSubsidiary\tCategory\t1월\t2월\n2024\tLGEIN\tHS\t120\t115\n...'}
                  rows={12}
                  spellCheck={false}
                />
                <div className={styles.pasteActions}>
                  <span className={styles.pasteCount}>
                    {pasteText
                      ? `${pasteText.split('\n').filter(l => l.trim()).length}행 감지됨`
                      : '데이터를 붙여넣어 주세요'}
                  </span>
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => { setPasteText(''); setError(''); }}
                    disabled={!pasteText} id="paste-clear-btn">
                    <X size={14} /> 지우기
                  </button>
                  <button className="btn btn-primary"
                    onClick={handlePasteSubmit}
                    disabled={!pasteText.trim() || pasteProcessing}
                    id="paste-submit-btn">
                    {pasteProcessing ? '분석 중...' : <><ClipboardPaste size={16} /> 데이터 분석</>}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className={styles.errorBox}>
                <AlertTriangle size={16} />
                <span>{error}</span>
                <button onClick={() => setError('')}><X size={14} /></button>
              </div>
            )}

            <div className={styles.sampleSection}>
              <p>샘플 APAC 데이터로 먼저 체험해보세요</p>
              <button className="btn btn-ghost" onClick={loadSample} id="sample-data-btn">
                샘플 데이터 불러오기
              </button>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────
            STEP 2: 데이터 확인 (Preview)
        ─────────────────────────────────────────────── */}
        {step === 'preview' && result && (
          <div className="animate-fadeIn">
            <div className={styles.stepHeader}>
              <div>
                <h1 className={styles.title}>데이터 확인</h1>
                <p className={styles.subtitle}>
                  <FileSpreadsheet size={14} /> {fileName} · {result.data.length.toLocaleString()}행 · {result.headers.length}열
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setStep('upload')} id="back-upload-btn">
                  ← 다시 업로드
                </button>
                <button className="btn btn-primary" onClick={() => setStep('repair')} id="next-repair-btn">
                  데이터 정제 <ArrowRight size={16} />
                </button>
              </div>
            </div>
            {result.warnings.length > 0 && (
              <div className={styles.warningBox}>
                <AlertTriangle size={16} />
                <div>{result.warnings.map((w, i) => <p key={i}>{w}</p>)}</div>
              </div>
            )}
            <DataPreview data={result.data} headers={result.headers} />
          </div>
        )}

        {/* ───────────────────────────────────────────────
            STEP 3: 데이터 정제
        ─────────────────────────────────────────────── */}
        {step === 'repair' && result && (
          <div className="animate-fadeIn">
            <div className={styles.stepHeader}>
              <div>
                <h1 className={styles.title}>데이터 정제</h1>
                <p className={styles.subtitle}>문제 항목을 선택하면 Before/After를 미리보고 적용할 수 있습니다</p>
              </div>
              <button className="btn btn-secondary" onClick={() => setStep('preview')} id="back-preview-btn">
                ← 데이터 확인
              </button>
            </div>
            <DataRepair onDone={() => setStep('intent')} />
          </div>
        )}

        {/* ───────────────────────────────────────────────
            STEP 4: 분석 의도 설정
        ─────────────────────────────────────────────── */}
        {step === 'intent' && (
          <div className="animate-fadeIn">
            <div className={styles.stepHeader}>
              <div>
                <h1 className={styles.title}>분석 설정</h1>
                <p className={styles.subtitle}>무엇을 보고 싶은지 선택하세요 — 비교 기준 / 기간 / 대상 / 그룹</p>
              </div>
              <button className="btn btn-secondary" onClick={() => setStep('repair')} id="back-repair-btn">
                ← 데이터 정제
              </button>
            </div>
            <AnalysisIntent onDone={() => setStep('builder')} />
          </div>
        )}

        {/* ───────────────────────────────────────────────
            STEP 5: 차트 빌더 (실시간 미리보기)
        ─────────────────────────────────────────────── */}
        {step === 'builder' && (
          <div className="animate-fadeIn">
            <div className={styles.stepHeader}>
              <div>
                <h1 className={styles.title}>차트 빌더</h1>
                <p className={styles.subtitle}>차트 타입 · 색상 · 정렬을 조정하고 실시간으로 미리보세요</p>
              </div>
            </div>
            <ChartBuilder onBack={() => setStep('intent')} />
          </div>
        )}

      </main>
    </div>
  );
}
