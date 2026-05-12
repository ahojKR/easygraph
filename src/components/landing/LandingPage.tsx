'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './LandingPage.module.css';
import { BarChart2, Upload, Zap, TrendingUp, PieChart, Download, ArrowRight } from 'lucide-react';
import SampleChart from './SampleChart';

const FEATURES = [
  {
    icon: <Upload size={24} />,
    title: 'Excel·CSV 업로드',
    desc: '.xlsx, .xls, .csv 파일을 드래그&드롭으로 업로드하면 자동으로 데이터를 파악합니다.',
  },
  {
    icon: <BarChart2 size={24} />,
    title: '8가지 차트 유형',
    desc: '라인, 막대, 파이, 도넛, 면적, 산점도, 레이더, 콤보 차트를 한 번에 전환하세요.',
  },
  {
    icon: <TrendingUp size={24} />,
    title: '누적 평균 & 증감 분석',
    desc: 'YTD 누적 평균, 이동 평균, 전월/전년 대비 증감률을 자동 계산합니다.',
  },
  {
    icon: <Zap size={24} />,
    title: 'AI 인사이트',
    desc: '데이터를 분석하여 핵심 트렌드와 이상값을 한국어 문장으로 자동 요약합니다.',
  },
  {
    icon: <PieChart size={24} />,
    title: '자동 차트 추천',
    desc: '데이터 패턴을 감지하여 가장 적합한 차트 유형을 자동으로 추천합니다.',
  },
  {
    icon: <Download size={24} />,
    title: 'PNG · PDF 내보내기',
    desc: '고해상도 이미지와 PDF로 즉시 다운로드하여 보고서에 바로 활용하세요.',
  },
];



export default function LandingPage() {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      sessionStorage.setItem('pendingFile', 'true');
      router.push('/upload');
    }
  }, [router]);

  return (
    <div className={styles.root}>
      {/* NAV */}
      <nav className={styles.nav}>
        <div className={`container ${styles.navInner}`}>
          <div className={styles.logo}>
            <BarChart2 size={22} className={styles.logoIcon} />
            <span>EasyGraph</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#features">기능</a>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => router.push('/upload')} id="nav-start-btn">
            무료로 시작 <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <div className={`${styles.heroBadge} animate-fadeIn`}>
              <Zap size={14} /> AI 기반 데이터 시각화
            </div>
            <h1 className={`${styles.heroTitle} animate-fadeIn delay-1`}>
              엑셀 파일 하나로<br />
              <span className="gradient-text">전문가 수준 차트</span>를<br />
              10초 만에
            </h1>
            <p className={`${styles.heroDesc} animate-fadeIn delay-2`}>
              업로드 → 클릭 → 완성. 복잡한 피벗·수식 없이 누적 평균, 증감 분석, AI 인사이트까지 자동으로 생성됩니다.
            </p>
            <div className={`${styles.heroActions} animate-fadeIn delay-3`}>
              <button
                id="hero-upload-btn"
                className="btn btn-primary btn-lg"
                onClick={() => router.push('/upload')}
              >
                <Upload size={18} /> 파일 업로드하기
              </button>
              <button
                id="hero-sample-btn"
                className="btn btn-secondary btn-lg"
                onClick={() => router.push('/chart?demo=true')}
              >
                샘플 차트 보기
              </button>
            </div>
          </div>

          {/* Drop zone hero */}
          <div
            className={`${styles.heroDropZone} ${dragActive ? styles.dragActive : ''} animate-fadeIn delay-4`}
            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => router.push('/upload')}
            id="hero-dropzone"
          >
            <div className={styles.dropIcon}>
              <Upload size={32} />
            </div>
            <p className={styles.dropText}>여기에 Excel / CSV 파일을 드래그하세요</p>
            <p className={styles.dropSub}>.xlsx · .xls · .csv 지원 · 최대 50MB</p>
          </div>

          {/* Sample chart preview */}
          <div className={`${styles.chartPreview} animate-fadeIn delay-5`}>
            <SampleChart />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className={styles.features}>
        <div className="container">
          <div className={`${styles.sectionHeader} text-center`}>
            <h2>왜 <span className="gradient-text">EasyGraph</span>인가요?</h2>
            <p>반복적인 차트 작업에서 해방되어 분석에만 집중하세요</p>
          </div>
          <div className={`${styles.featuresGrid}`}>
            {FEATURES.map((f, i) => (
              <div key={i} className={`${styles.featureCard} card animate-fadeIn`} style={{ animationDelay: `${i * 0.08}s` }}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerInner}>
            <div className={styles.logo}>
              <BarChart2 size={18} className={styles.logoIcon} />
              <span>EasyGraph</span>
            </div>
            <p>© 2025 EasyGraph. AI 기반 데이터 시각화 서비스</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
