'use client';

import { Suspense } from 'react';
import ChartEditorPage from '@/components/chart/ChartEditorPage';

function LoadingFallback() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', flexDirection: 'column', gap: 16
    }}>
      <div style={{
        width: 48, height: 48, border: '3px solid rgba(0,212,255,0.2)',
        borderTopColor: '#00d4ff', borderRadius: '50%', animation: 'spin 1s linear infinite'
      }} />
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>로딩 중...</p>
    </div>
  );
}

export default function ChartPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ChartEditorPage />
    </Suspense>
  );
}
