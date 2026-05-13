'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, X, ArrowRight, BarChart2, ClipboardPaste } from 'lucide-react';
import { parseFile, parsePastedText, ParseResult } from '@/lib/parser';
import { useChart } from '@/context/ChartContext';
import SmartAxisMapper from './SmartAxisMapper';
import DataPreview from './DataPreview';
import DataRepair from './DataRepair';
import AnalysisConfig from './AnalysisConfig';
import DataTransform from './DataTransform';
import styles from './UploadPage.module.css';

type Step = 'upload' | 'preview' | 'repair' | 'map' | 'transform' | 'config';

const STEP_LABELS: Record<Step, string> = {
  upload:    '파일 업로드',
  preview:   '데이터 확인',
  repair:    '데이터 정제',
  map:       '축 설정',
  transform: '데이터 변환',
  config:    '그래프 설정',
};

const STEP_ORDER: Step[] = ['upload', 'preview', 'repair', 'map', 'transform', 'config'];

export default function UploadPage() {
  const router = useRouter();
  const { state, dispatch } = useChart();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [uploadTab, setUploadTab] = useState<'file' | 'paste'>('file');
  const [pasteText, setPasteText] = useState('');
  const [pasteProcessing, setPasteProcessing] = useState(false);

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
    setError('');
    setLoading(true);
    setProgress(10);
    setFileName(file.name);
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
      setLoading(false);
      setProgress(0);
    }
  }, [dispatch]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const loadSample = () => {
    const sampleData = Array.from({ length: 12 }, (_, i) => ({
      '월': `${i + 1}월`,
      '매출': Math.floor(3000 + Math.random() * 5000),
      '비용': Math.floor(2000 + Math.random() * 3000),
      '고객수': Math.floor(100 + Math.random() * 400),
    }));
    const headers = [
      { name: '월', type: 'date' as const, index: 0 },
      { name: '매출', type: 'number' as const, index: 1 },
      { name: '비용', type: 'number' as const, index: 2 },
      { name: '고객수', type: 'number' as const, index: 3 },
    ];
    dispatch({ type: 'SET_DATA', payload: { data: sampleData, headers, fileName: '샘플데이터.xlsx' } });
    dispatch({ type: 'SET_X_AXIS', payload: '월' });
    dispatch({ type: 'SET_Y_AXES', payload: ['매출'] });
    setResult({ data: sampleData, headers, sheetNames: ['Sheet1'], warnings: [] });
    setFileName('샘플데이터.xlsx');
    setStep('preview');
  };

  const isDone = (s: Step) => STEP_ORDER.indexOf(step) > STEP_ORDER.indexOf(s);
  const isActive = (s: Step) => step === s;

  // Check if axes are selected before allowing transform step
  const canGoTransform = !!state.xAxis && state.yAxes.length > 0;

  // Handle paste text parsing
  const handlePasteSubmit = () => {
    if (!pasteText.trim()) { setError('데이터를 붙여넣어 주세요.'); return; }
    setPasteProcessing(true);
    setError('');
    try {
      const parsed = parsePastedText(pasteText);
      if (!parsed.data.length) {
        setError('데이터를 파싱할 수 없습니다. 헤더와 데이터가 포함된 표 형식인지 확인해주세요.');
        setPasteProcessing(false);
        return;
      }
      dispatch({ type: 'SET_DATA', payload: { data: parsed.data, headers: parsed.headers, fileName: '붙여넣기 데이터' } });
      setResult(parsed);
      setFileName('붙여넣기 데이터');
      setStep('preview');
    } catch {
      setError('데이터 파싱 중 오류가 발생했습니다.');
    }
    setPasteProcessing(false);
  };

  return (
    <div className={styles.root}>
      {/* Header */}
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

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className={`${styles.uploadSection} animate-fadeIn`}>
            <h1 className={styles.title}>데이터 입력</h1>
            <p className={styles.subtitle}>파일 업로드 또는 Excel에서 복사한 데이터를 직접 붙여넣을 수 있습니다</p>

            {/* Tabs */}
            <div className={styles.uploadTabs}>
              <button
                id="tab-file"
                className={`${styles.uploadTab} ${uploadTab === 'file' ? styles.tabActive : ''}`}
                onClick={() => { setUploadTab('file'); setError(''); }}
              >
                <Upload size={16} /> 파일 업로드
              </button>
              <button
                id="tab-paste"
                className={`${styles.uploadTab} ${uploadTab === 'paste' ? styles.tabActive : ''}`}
                onClick={() => { setUploadTab('paste'); setError(''); }}
              >
                <ClipboardPaste size={16} /> 데이터 붙여넣기
              </button>
            </div>

            {/* FILE UPLOAD TAB */}
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
                <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleInput} style={{ display: 'none' }} />
              </div>
            )}

            {/* PASTE TAB */}
            {uploadTab === 'paste' && (
              <div className={styles.pasteSection}>
                <div className={styles.pasteHint}>
                  <span>💡</span>
                  <p>Excel 또는 Google Sheets에서 셀을 선택 후 <kbd>Ctrl+C</kbd> 복사 → 아래 영역에 <kbd>Ctrl+V</kbd> 붙여넣기</p>
                </div>
                <textarea
                  id="paste-area"
                  className={styles.pasteArea}
                  value={pasteText}
                  onChange={e => { setPasteText(e.target.value); setError(''); }}
                  onPaste={e => {
                    // Auto-submit after short delay to let state update
                    setTimeout(() => {
                      const text = e.clipboardData.getData('text');
                      if (text.trim()) {
                        setPasteText(text);
                      }
                    }, 50);
                  }}
                  placeholder={'헤더\t컬럼1\t컬럼2\n데이터1\t100\t200\n데이터2\t300\t400\n\n예시처럼 Excel에서 Ctrl+C 후 여기에 Ctrl+V 하세요'}
                  rows={12}
                  spellCheck={false}
                />
                <div className={styles.pasteActions}>
                  <span className={styles.pasteCount}>
                    {pasteText ? `${pasteText.split('\n').filter(l => l.trim()).length}행 감지됨` : '데이터를 붙여넣어 주세요'}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setPasteText(''); setError(''); }}
                    disabled={!pasteText}
                    id="paste-clear-btn"
                  >
                    <X size={14} /> 지우기
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handlePasteSubmit}
                    disabled={!pasteText.trim() || pasteProcessing}
                    id="paste-submit-btn"
                  >
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
              <p>샘플 데이터로 먼저 체험해보세요</p>
              <button className="btn btn-ghost" onClick={loadSample} id="sample-data-btn">
                샘플 데이터 불러오기
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW */}
        {step === 'preview' && result && (
          <div className="animate-fadeIn">
            <div className={styles.stepHeader}>
              <div>
                <h1 className={styles.title}>데이터 확인</h1>
                <p className={styles.subtitle}><FileSpreadsheet size={14} /> {fileName} · {result.data.length.toLocaleString()}행 · {result.headers.length}열</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setStep('upload')} id="back-upload-btn">← 다시 업로드</button>
                <button className="btn btn-primary" onClick={() => setStep('repair')} id="next-map-btn">
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

        {/* STEP 2.5: DATA REPAIR */}
        {step === 'repair' && result && (
          <div className="animate-fadeIn">
            <div className={styles.stepHeader}>
              <div>
                <h1 className={styles.title}>데이터 정제</h1>
                <p className={styles.subtitle}>결측값·컬럼명 문제를 수정하고 테이블을 완성하세요</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setStep('preview')} id="back-to-preview-btn">← 데이터 확인</button>
              </div>
            </div>
            <DataRepair onDone={() => setStep('map')} />
          </div>
        )}

        {/* STEP 3: AXIS MAPPING */}
        {step === 'map' && (
          <div className="animate-fadeIn">
            <div className={styles.stepHeader}>
              <div>
                <h1 className={styles.title}>축 설정</h1>
                <p className={styles.subtitle}>가로·세로축에 표시할 내용을 선택하세요</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setStep('repair')} id="back-preview-btn">← 데이터 정제</button>
                <button
                  className="btn btn-primary"
                  onClick={() => setStep('transform')}
                  id="next-transform-btn"
                  disabled={!canGoTransform}
                  title={!canGoTransform ? 'X축과 Y축을 선택해주세요' : ''}
                >
                  데이터 변환 <ArrowRight size={16} />
                </button>
              </div>
            </div>
            <SmartAxisMapper headers={state.headers} />
          </div>
        )}

        {/* STEP 4: DATA TRANSFORM */}
        {step === 'transform' && result && (
          <div className="animate-fadeIn">
            <div className={styles.stepHeader}>
              <div>
                <h1 className={styles.title}>데이터 변환</h1>
                <p className={styles.subtitle}>수치를 그대로 쓸지, 비중(%)으로 바꿀지 선택하세요</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setStep('map')} id="back-map-btn">← 축 설정</button>
                <button className="btn btn-primary" onClick={() => setStep('config')} id="next-config-btn">
                  그래프 설정 <ArrowRight size={16} />
                </button>
              </div>
            </div>
            <DataTransform />
          </div>
        )}

        {/* STEP 5: GRAPH CONFIG */}
        {step === 'config' && result && (
          <div className="animate-fadeIn">
            <div className={styles.stepHeader}>
              <div>
                <h1 className={styles.title}>그래프 설정</h1>
                <p className={styles.subtitle}>그래프를 어떻게 그릴지 선택하세요 — 수치 방식, 구분 기준, 차트 유형</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setStep('transform')} id="back-transform-btn">← 데이터 변환</button>
                <button
                  className="btn btn-primary"
                  id="go-chart-btn"
                  onClick={() => router.push('/chart')}
                >
                  차트 생성 <ArrowRight size={16} />
                </button>
              </div>
            </div>
            <AnalysisConfig headers={result.headers} />
          </div>
        )}
      </main>
    </div>
  );
}
