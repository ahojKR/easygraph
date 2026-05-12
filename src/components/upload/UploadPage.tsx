'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, X, ArrowRight, BarChart2 } from 'lucide-react';
import { parseFile, ParseResult } from '@/lib/parser';
import { useChart } from '@/context/ChartContext';
import ColumnMapper from './ColumnMapper';
import DataPreview from './DataPreview';
import styles from './UploadPage.module.css';

type Step = 'upload' | 'preview' | 'map';

export default function UploadPage() {
  const router = useRouter();
  const { dispatch } = useChart();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

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
    } catch (e) {
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

  const handleGoToChart = () => {
    router.push('/chart');
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
            {(['upload', 'preview', 'map'] as Step[]).map((s, i) => (
              <div key={s} className={`${styles.stepItem} ${step === s ? styles.stepActive : ''} ${['preview','map'].includes(step) && i === 0 ? styles.stepDone : ''} ${step === 'map' && i === 1 ? styles.stepDone : ''}`}>
                <div className={styles.stepDot}>{['preview','map'].includes(step) && i === 0 ? <CheckCircle size={14}/> : step === 'map' && i === 1 ? <CheckCircle size={14}/> : i + 1}</div>
                <span>{['파일 업로드', '데이터 확인', '차트 설정'][i]}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className={`container ${styles.main}`}>
        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className={`${styles.uploadSection} animate-fadeIn`}>
            <h1 className={styles.title}>파일 업로드</h1>
            <p className={styles.subtitle}>Excel 또는 CSV 파일을 업로드하면 자동으로 데이터를 분석합니다</p>

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
                  <div className={styles.uploadIcon}>
                    <Upload size={36} />
                  </div>
                  <h2 className={styles.dropTitle}>파일을 여기에 드래그하거나 클릭하여 선택</h2>
                  <p className={styles.dropSub}>.xlsx · .xls · .csv 지원 | 최대 50MB | 최대 500,000행</p>
                  <button className="btn btn-primary" style={{ marginTop: 20 }} id="browse-btn">
                    <FileSpreadsheet size={16} /> 파일 선택
                  </button>
                </>
              )}
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleInput} style={{ display: 'none' }} />
            </div>

            {error && (
              <div className={styles.errorBox}>
                <AlertTriangle size={16} />
                <span>{error}</span>
                <button onClick={() => setError('')}><X size={14} /></button>
              </div>
            )}

            <div className={styles.sampleSection}>
              <p>샘플 데이터로 먼저 체험해보세요</p>
              <button className="btn btn-ghost" onClick={() => {
                // Load sample data
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
                setResult({ data: sampleData, headers, sheetNames: ['Sheet1'], warnings: [] });
                setFileName('샘플데이터.xlsx');
                setStep('preview');
              }} id="sample-data-btn">
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
                <button className="btn btn-primary" onClick={() => setStep('map')} id="next-map-btn">
                  차트 설정 <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {result.warnings.length > 0 && (
              <div className={styles.warningBox}>
                <AlertTriangle size={16} />
                <div>
                  {result.warnings.map((w, i) => <p key={i}>{w}</p>)}
                </div>
              </div>
            )}

            <DataPreview data={result.data} headers={result.headers} />
          </div>
        )}

        {/* STEP 3: MAP */}
        {step === 'map' && result && (
          <div className="animate-fadeIn">
            <div className={styles.stepHeader}>
              <div>
                <h1 className={styles.title}>차트 설정</h1>
                <p className={styles.subtitle}>X축, Y축 인자를 선택하고 차트를 생성하세요</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setStep('preview')} id="back-preview-btn">← 데이터 확인</button>
                <button className="btn btn-primary" onClick={handleGoToChart} id="go-chart-btn">
                  차트 생성 <ArrowRight size={16} />
                </button>
              </div>
            </div>
            <ColumnMapper headers={result.headers} />
          </div>
        )}
      </main>
    </div>
  );
}
